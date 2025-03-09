import { ethers } from 'ethers';

// Set the type hash constants
const DOMAIN_SEPARATOR_TYPEHASH = "0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218";
const SAFE_TX_TYPEHASH = "0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8";
const SAFE_TX_TYPEHASH_OLD = "0x14d461bc7412367e924637b363c7bf29b8f47e2f84869f4426e5633d8af47b20";

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  
  return 0;
}

function keccak256Int(hexData: string): string {
  const formattedHex = hexData.startsWith('0x') ? hexData : `0x${hexData}`;
  return ethers.utils.keccak256(formattedHex);
}

/**
 * Ensures a hex string has an even number of characters (excluding the 0x prefix)
 * @param hexString The hex string to normalize
 * @returns A normalized hex string with even length
 */
function normalizeHexString(hexString: string): string {
  if (!hexString) return hexString;
  
  // Remove 0x prefix if present
  const withoutPrefix = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // If the length is odd, add a leading zero
  const normalized = withoutPrefix.length % 2 !== 0 ? `0${withoutPrefix}` : withoutPrefix;
  
  // Add the 0x prefix back
  return `0x${normalized}`;
}

function encodeAbi(types: string[], values: any[]): string {
  const abiCoder = new ethers.utils.AbiCoder();
  return abiCoder.encode(types, values);
}

function calculateDomainHash(version: string, safeAddress: string, chainId: string): string {
  const cleanVersion = version.trim();
  let encodedData: string;
  
  // Safe multisig versions `<= 1.2.0` use a legacy format
  if (compareVersions(cleanVersion, "1.2.0") <= 0) {
    encodedData = encodeAbi(
      ['bytes32', 'address'],
      [DOMAIN_SEPARATOR_TYPEHASH, safeAddress]
    );
  } else {
    encodedData = encodeAbi(
      ['bytes32', 'uint256', 'address'],
      [DOMAIN_SEPARATOR_TYPEHASH, chainId, safeAddress]
    );
  }
  
  return keccak256Int(encodedData);
}

function calculateSafeTxHash(
  domainHash: string, 
  messageHash: string
): string {
  const encoded = ethers.utils.concat([
    ethers.utils.arrayify("0x19"),
    ethers.utils.arrayify("0x01"),
    ethers.utils.arrayify(domainHash),
    ethers.utils.arrayify(messageHash)
  ]);
  return keccak256Int(ethers.utils.hexlify(encoded));
}

export async function calculateHashes(
  chainId: string,
  address: string,
  to: string,
  value: string,
  data: string,
  operation: string,
  safeTxGas: string,
  baseGas: string,
  gasPrice: string,
  gasToken: string,
  refundReceiver: string,
  nonce: string,
  version: string = "1.3.0"
): Promise<{
  domainHash: string,
  messageHash: string,
  safeTxHash: string,
  encodedMessage: string
}> {
  // Normalize hex strings to ensure they have even length
  const normalizedData = normalizeHexString(data);
  const normalizedTo = normalizeHexString(to);
  const normalizedAddress = normalizeHexString(address);
  const normalizedGasToken = normalizeHexString(gasToken);
  const normalizedRefundReceiver = normalizeHexString(refundReceiver);
  
  const cleanVersion = version.trim();
  let safeTxTypehash = SAFE_TX_TYPEHASH;

  const domainHash = calculateDomainHash(version, normalizedAddress, chainId);

  const dataHashed = keccak256Int(normalizedData);

  // Safe multisig versions `< 1.0.0` use a legacy format
  if (compareVersions(cleanVersion, "1.0.0") < 0) {
    safeTxTypehash = SAFE_TX_TYPEHASH_OLD;
  }

  // Encode the message
  const message = encodeAbi(
    ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
    [safeTxTypehash, normalizedTo, value, dataHashed, operation, safeTxGas, baseGas, gasPrice, normalizedGasToken, normalizedRefundReceiver, nonce]
  );

  const messageHash = keccak256Int(message);
  const safeTxHash = calculateSafeTxHash(domainHash, messageHash);

  return {
    domainHash,
    messageHash,
    safeTxHash,
    encodedMessage: message
  };
} 
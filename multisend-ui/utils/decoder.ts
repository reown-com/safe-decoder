import { ethers } from 'ethers';

export interface DecodedFunctionData {
  name: string;
  params: Record<string, string>;
  error?: string;
  source?: 'manual' | 'openchain';
  candidates?: string[];
}

const openChainSignatureCache = new Map<string, Promise<string[]>>();
const openChainResolvedCache = new Map<string, string[]>();

// Regex patterns compiled once for performance
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function buildOpenChainApiPath(normalizedSelector: string): string {
  const encodedSelector = encodeURIComponent(normalizedSelector);
  if (typeof window !== 'undefined') {
    return `/api/openchain?function=${encodedSelector}`;
  }

  const baseUrl =
    process.env.OPENCHAIN_PROXY_BASE_URL ||
    process.env.NEXT_PUBLIC_OPENCHAIN_PROXY_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.SITE_URL ||
    'http://localhost:3000';

  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}/api/openchain?function=${encodedSelector}`;
}

async function fetchOpenChainFunctionSignatures(selector: string): Promise<string[]> {
  const normalized = selector.toLowerCase();
  if (openChainResolvedCache.has(normalized)) {
    return openChainResolvedCache.get(normalized)!;
  }

  if (!openChainSignatureCache.has(normalized)) {
    const lookupPromise = (async () => {
      try {
        const requestUrl = buildOpenChainApiPath(normalized);
        const response = await fetch(requestUrl, {
          headers: {
            accept: 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`OpenChain responded with status ${response.status}`);
        }
        const data = await response.json();
        const functionResults = data?.result?.function;
        let entries: unknown = [];
        if (functionResults && typeof functionResults === 'object') {
          const matchedKey = Object.keys(functionResults).find(key => key.toLowerCase() === normalized);
          if (matchedKey) {
            entries = (functionResults as Record<string, unknown>)[matchedKey];
          }
        }
        const signatures = Array.isArray(entries)
          ? entries
              .map((entry: { name?: unknown; signature?: unknown; text_signature?: unknown }) => {
                if (typeof entry?.name === 'string' && entry.name.trim().length > 0) {
                  return entry.name;
                }
                if (typeof entry?.signature === 'string' && entry.signature.trim().length > 0) {
                  return entry.signature;
                }
                if (typeof entry?.text_signature === 'string' && entry.text_signature.trim().length > 0) {
                  return entry.text_signature;
                }
                return null;
              })
              .filter((entry: string | null): entry is string => Boolean(entry))
          : [];
        const uniqueSignatures = Array.from(new Set(signatures));
        openChainResolvedCache.set(normalized, uniqueSignatures);
        return uniqueSignatures;
      } catch (error) {
        console.error('Failed to fetch OpenChain signatures:', error);
        openChainResolvedCache.set(normalized, []);
        return [];
      } finally {
        openChainSignatureCache.delete(normalized);
      }
    })();
    openChainSignatureCache.set(normalized, lookupPromise);
  }

  const pending = openChainSignatureCache.get(normalized);
  if (!pending) {
    // Shouldn't happen because we just guarded above; treat as cache miss.
    return [];
  }
  return pending;
}

function formatDecodedValue(value: unknown): string {
  if (ethers.BigNumber.isBigNumber(value)) {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => formatDecodedValue(item)).join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    // Normalize address casing if it looks like an address
    if (ADDRESS_PATTERN.test(value)) {
      return value.toLowerCase();
    }
    return value;
  }
  return String(value ?? '');
}

function manualResult(result: DecodedFunctionData): DecodedFunctionData {
  return {
    source: 'manual',
    ...result
  };
}

function openChainResult(result: DecodedFunctionData, candidates: string[]): DecodedFunctionData {
  return {
    source: 'openchain',
    candidates,
    ...result
  };
}

function tryDecodeUsingSignature(signature: string, data: string): DecodedFunctionData | null {
  try {
    const fragment = `function ${signature}`;
    const iface = new ethers.utils.Interface([fragment]);
    const functionFragment = iface.getFunction(signature);
    const decoded = iface.decodeFunctionData(functionFragment, data);
    const params: Record<string, string> = {};
    functionFragment.inputs.forEach((input, index) => {
      const key = input.name && input.name.trim().length > 0 ? input.name : `arg${index}`;
      params[key] = formatDecodedValue(decoded[index]);
    });
    return {
      name: signature,
      params
    };
  } catch (error) {
    console.warn(`Failed to decode using OpenChain signature ${signature}:`, error);
    return null;
  }
}

/**
 * Represents a decoded transaction from a multisend call
 */
export interface DecodedTransaction {
  operation: number;
  to: string;
  value: string;
  dataLength: number;
  data: string;
}

/**
 * Decodes multisend transaction data into individual transactions
 * @param data - The hex data from a multisend transaction
 * @returns An array of decoded transactions
 */
export function decodeMultiSendTransactions(data: string): DecodedTransaction[] {
  const normalizedData = normalizeHexString(data); // Ensure data is normalized at the start
  let hexData = normalizedData.startsWith('0x') ? normalizedData.slice(2) : normalizedData;
  
  if (!hexData) {
    return []; // Return empty array if hexData is empty after normalization
  }

  const transactions: DecodedTransaction[] = [];
  let currentIndex = 0;
  
  while (currentIndex < hexData.length) {
    // Extract each field according to the format
    const operation = parseInt(hexData.slice(currentIndex, currentIndex + 2), 16);
    currentIndex += 2; // 1 byte for operation
    
    const to = '0x' + hexData.slice(currentIndex, currentIndex + 40);
    currentIndex += 40; // 20 bytes for address
    
    const valueHex = hexData.slice(currentIndex, currentIndex + 64);
    const value = ethers.BigNumber.from('0x' + valueHex).toString();
    currentIndex += 64; // 32 bytes for value
    
    const dataLengthHex = hexData.slice(currentIndex, currentIndex + 64);
    const dataLength = parseInt(dataLengthHex, 16) * 2; // Convert to bytes then to hex chars (×2)
    currentIndex += 64; // 32 bytes for data length
    
    const txData = '0x' + hexData.slice(currentIndex, currentIndex + dataLength);
    currentIndex += dataLength; // Variable length for data
    
    transactions.push({
      operation,
      to,
      value,
      dataLength: dataLength / 2, // Convert back to bytes for display
      data: txData
    });
  }
  
  return transactions;
}

/**
 * Decodes a regular function call (non-multisend)
 * @param data - The hex data from a regular function call
 * @returns An array with a single decoded transaction
 */
export function decodeRegularFunctionCall(data: string): DecodedTransaction[] {
  const normalizedData = normalizeHexString(data); // Ensure data is normalized
  const functionSignature = normalizedData.slice(0, 10);

  // Check minimum length for signature
  if (normalizedData.length < 10) {
    console.warn("Data too short for function call decoding:", normalizedData);
    return [];
  }

  let decodedTx: DecodedTransaction | null = null;

  // Check if this is a function call to a contract address
  // Function selector is the first 4 bytes (8 hex chars)
  if (functionSignature === '0x8d80ff0a') {
    // If the first 4 bytes are a function selector, extract the target address if present
    // For example, in claim(address), the address would be in the next 32 bytes
    let to = '0x0000000000000000000000000000000000000000'; // Default zero address
    
    // If there are parameters, try to extract them
    if (normalizedData.length >= 8 + 64) { // selector + at least one parameter (32 bytes)
      // For address parameters, they are padded to 32 bytes, with the actual address in the last 20 bytes
      const addressParam = normalizedData.slice(8, 8 + 64);
      // Extract the last 40 chars (20 bytes) which represent the address
      to = '0x' + addressParam.slice(24);
    }
    
    // Create a transaction object
    decodedTx = {
      operation: 0, // Regular call
      to: to,
      value: '0', // No value transfer in a regular function call
      dataLength: normalizedData.length / 2,
      data: normalizedData
    };
  } else {
    // If not a multiSend function call, try normal decoding
    decodedTx = {
      operation: 0, // Regular call
      to: '0x0000000000000000000000000000000000000000', // Default zero address
      value: '0', // No value transfer in a regular function call
      dataLength: normalizedData.length / 2,
      data: normalizedData
    };
  }
  
  return decodedTx ? [decodedTx] : [];
}

/**
 * Decodes arbitrary transaction data, attempting to handle multiSend(bytes) wrappers,
 * direct multisend bundles, and single function calls.
 * @param data The transaction data hex string.
 * @returns An array of decoded transactions.
 */
export async function decodeTransactionData(data: string): Promise<DecodedTransaction[]> {
  const normalizedData = normalizeHexString(data);

  if (normalizedData === '0x') {
    return []; // Return empty array for empty or invalid data
  }

  // 1. Check for the multiSend(bytes) signature (0x8d80ff0a)
  if (normalizedData.startsWith('0x8d80ff0a')) {
    try {
      const decodedOuter = await tryDecodeFunctionData(normalizedData);
      if (decodedOuter && decodedOuter.name === 'multiSend(bytes)' && decodedOuter.params.transactions) {
        // Successfully decoded the outer call, now decode the inner transactions payload
        const innerTransactionsData = '0x' + decodedOuter.params.transactions;
        // Use decodeMultiSendTransactions for the inner data
        return decodeMultiSendTransactions(innerTransactionsData);
      } else {
        // Started with the signature but failed to decode parameters.
        // This indicates malformed multiSend(bytes) data.
        console.error("Data starts with multiSend(bytes) signature but failed to decode parameters:", decodedOuter?.error);
        throw new Error("Failed to decode parameters for multiSend(bytes) call.");
      }
    } catch (error) {
      console.error('Error decoding multiSend(bytes) wrapper:', error);
      // Rethrow the error as it's expected to be a multiSend(bytes) call
      throw new Error('Failed to decode presumed multiSend(bytes) data: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  // 2. If not multiSend(bytes), try decoding as a direct multisend bundle
  try {
    // Pass the already normalized data directly
    return decodeMultiSendTransactions(normalizedData);
  } catch (error) {
    // Failed to decode as direct multisend bundle, log and continue
    // This is expected if the data is a single function call.
    console.warn('Data did not decode as a multisend bundle, trying as regular function call.');
  }

  // 3. If not a multisend bundle, try as a single regular function call
  try {
    // decodeRegularFunctionCall expects an array, so wrap the result
    // Pass the already normalized data directly
    return decodeRegularFunctionCall(normalizedData);
  } catch (error) {
    console.error('Failed to decode transaction data as any known type:', error);
    throw new Error('Failed to decode transaction data: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Gets a human-readable operation name
 * @param operation - The operation code (0 for Call, 1 for DelegateCall)
 * @returns A string representation of the operation
 */
export function getOperationName(operation: number): string {
  return operation === 0 ? 'Call' : 'DelegateCall';
}

/**
 * Formats a value in wei to a more readable format
 * @param value - The value in wei as a string
 * @returns A formatted string with the value in ETH
 */
export function formatValue(value: string): string {
  try {
    const valueInWei = ethers.BigNumber.from(value);
    const valueInEth = ethers.utils.formatEther(valueInWei);
    return `${valueInEth} ETH`;
  } catch (error) {
    return value;
  }
}

/**
 * Formats a large number in a more readable way
 * @param value - The number as a string
 * @returns A formatted string with scientific notation if needed
 */
export function formatLargeNumber(value: string): string {
  const num = ethers.BigNumber.from(value);
  const numStr = num.toString();
  
  // For small numbers, just return the string
  if (numStr.length <= 10) {
    return numStr;
  }
  
  // For large numbers, use scientific notation
  // Note: parseFloat might lose precision for very large numbers, 
  // but it's primarily for display readability here.
  const scientificNotation = `${numStr} [${parseFloat(numStr).toExponential(2)}]`;
  return scientificNotation;
}

/**
 * Attempts to decode function data for known function signatures
 * @param data - The function call data
 * @returns An object with decoded parameters if successful, or null if not recognized
 */
export async function tryDecodeFunctionData(data: string): Promise<DecodedFunctionData | null> {
  if (!data || data === '0x') return null;
  
  // Get the function signature (first 4 bytes / 8 hex chars after 0x)
  const functionSignature = data.slice(0, 10);
  
  // MultiSend function (0x8d80ff0a)
  if (functionSignature === '0x8d80ff0a') {
    try {
      // The multiSend function has a bytes parameter that is ABI-encoded
      // Standard format for dynamic bytes: [offset (32 bytes)][length (32 bytes)][data...]
      // The offset points to the start of the length field.
      
      // Skip function signature (4 bytes / 10 hex chars)
      const abiEncodedParams = data.slice(10);
      
      // 1. Read the offset (first 32 bytes / 64 hex chars)
      if (abiEncodedParams.length < 64) {
        throw new Error("Data too short to read offset");
      }
      const offsetHex = abiEncodedParams.slice(0, 64);
      const offsetBytes = parseInt(offsetHex, 16); // Offset in bytes
      const offsetHexChars = offsetBytes * 2;

      // Check if offset is reasonable (within the provided data)
      // Offset points to the start of the length field, so we need at least offset + 32 bytes (64 hex chars) for length
      if (abiEncodedParams.length < offsetHexChars + 64) {
          throw new Error(`Data too short to read length at offset ${offsetBytes}`);
      }

      // 2. Read the length (32 bytes / 64 hex chars) starting at the offset
      const lengthHex = abiEncodedParams.slice(offsetHexChars, offsetHexChars + 64);
      const lengthBytes = parseInt(lengthHex, 16); // Length in bytes
      const lengthHexChars = lengthBytes * 2;

      // Check if data is long enough to contain the specified length of data
      // Data starts immediately after the length field
      if (abiEncodedParams.length < offsetHexChars + 64 + lengthHexChars) {
        throw new Error(`Data too short to read ${lengthBytes} bytes of data starting after length field`);
      }

      // 3. Extract the actual transactions data
      const transactionsData = abiEncodedParams.slice(
        offsetHexChars + 64, // Start after the length field
        offsetHexChars + 64 + lengthHexChars // Read for 'lengthBytes' bytes
      );
      
      // Try to decode the transactions to get a count (optional, for display)
      let decodedTransactions: DecodedTransaction[] = [];
      try {
        decodedTransactions = decodeMultiSendTransactions('0x' + transactionsData);
      } catch (decodeError) {
        console.warn('Could not decode inner transactions within multiSend for count:', decodeError);
      }
      
      return manualResult({
        name: 'multiSend(bytes)',
        params: {
          transactions: transactionsData,
          decodedTransactionsCount: decodedTransactions.length.toString()
        }
      });
    } catch (error) {
      console.error("Error decoding multiSend(bytes) parameters:", error);
      return manualResult({
        name: 'multiSend(bytes)',
        params: {},
        error: 'Failed to decode multiSend function parameters: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  
  // ERC20 approve function (0x095ea7b3)
  if (functionSignature === '0x095ea7b3') {
    try {
      const iface = new ethers.utils.Interface([
        'function approve(address spender, uint256 amount) external returns (bool)'
      ]);
      const decoded = iface.decodeFunctionData('approve', data);
      // Ensure spender address is lowercase
      const spenderAddress = decoded.spender ? decoded.spender.toLowerCase() : '0x0000000000000000000000000000000000000000';
      return manualResult({
        name: 'approve(address,uint256)',
        params: {
          spender: spenderAddress, // Use lowercased address
          amount: decoded.amount.toString()
        }
      });
    } catch (error) {
      console.error("Error decoding approve(address,uint256) parameters:", error);
      return manualResult({
        name: 'approve(address,uint256)',
        params: {},
        error: 'Failed to decode approve function parameters: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  }
  
  // setAllowedFrom function (0x1ffacdef)
  if (functionSignature === '0x1ffacdef') {
    try {
      const iface = new ethers.utils.Interface([
        'function setAllowedFrom(address from, bool allowed) external'
      ]);
      const decoded = iface.decodeFunctionData('setAllowedFrom', data);
      return manualResult({
        name: 'setAllowedFrom(address,bool)',
        params: {
          from: decoded.from.toLowerCase(),
          allowed: decoded.allowed.toString()
        }
      });
    } catch (error) {
      return manualResult({
        name: 'setAllowedFrom(address,bool)',
        params: {},
        error: 'Failed to decode setAllowedFrom function parameters'
      });
    }
  }
  
  // injectReward function with signature 0x097cd232
  if (functionSignature === '0x097cd232') {
    try {
      // Extract parameters from the data (remove function signature)
      const params = data.slice(10);
      
      // Each uint256 is 32 bytes (64 hex chars)
      const timestamp = params.slice(0, 64);
      const amount = params.slice(64, 128);
      
      // Convert hex to BigNumber
      const timestampBN = ethers.BigNumber.from('0x' + timestamp);
      const amountBN = ethers.BigNumber.from('0x' + amount);
      
      return manualResult({
        name: 'injectReward(uint256,uint256)',
        params: {
          timestamp: formatLargeNumber(timestampBN.toString()),
          amount: formatLargeNumber(amountBN.toString())
        }
      });
    } catch (error) {
      return manualResult({
        name: 'injectReward(uint256,uint256)',
        params: {},
        error: 'Failed to decode injectReward function parameters'
      });
    }
  }
  
  // ERC20 transfer function (0xa9059cbb)
  if (functionSignature === '0xa9059cbb') {
    try {
      // Extract parameters from the data (remove function signature)
      const params = data.slice(10);
      
      // Each parameter is 32 bytes (64 hex chars)
      // For address, we need to extract the last 20 bytes (40 hex chars)
      const recipientPadded = params.slice(0, 64);
      const recipient = '0x' + recipientPadded.slice(24); // Extract the last 20 bytes
      
      // Amount is the next 32 bytes
      const amountHex = params.slice(64, 128);
      const amount = ethers.BigNumber.from('0x' + amountHex).toString();
      
      return manualResult({
        name: 'transfer(address,uint256)',
        params: {
          recipient: recipient.toLowerCase(),
          amount: amount
        }
      });
    } catch (error) {
      return manualResult({
        name: 'transfer(address,uint256)',
        params: {},
        error: 'Failed to decode transfer function parameters'
      });
    }
  }
  
  // claim function (0x1e83409a)
  if (functionSignature === '0x1e83409a') {
    try {
      const iface = new ethers.utils.Interface([
        'function claim(address account) external'
      ]);
      const decoded = iface.decodeFunctionData('claim', data);
      const account = (decoded.account || decoded[0]).toLowerCase();
      return manualResult({
        name: 'claim(address)',
        params: {
          account: account
        }
      });
    } catch (error) {
      return manualResult({
        name: 'claim(address)',
        params: {},
        error: 'Failed to decode claim function parameters'
      });
    }
  }
  
  // swapOwner function (0xe318b52b)
  if (functionSignature === '0xe318b52b') {
    try {
      // Extract parameters from the data (remove function signature)
      const params = data.slice(10);
      
      // Each address parameter is 32 bytes (64 hex chars)
      const prevOwner = '0x' + params.slice(24, 64); // Extract the last 20 bytes of the first parameter
      const oldOwner = '0x' + params.slice(64 + 24, 64 + 64); // Extract the last 20 bytes of the second parameter
      const newOwner = '0x' + params.slice(128 + 24, 128 + 64); // Extract the last 20 bytes of the third parameter
      
      return manualResult({
        name: 'swapOwner(address,address,address)',
        params: {
          prevOwner: prevOwner.toLowerCase(),
          oldOwner: oldOwner.toLowerCase(),
          newOwner: newOwner.toLowerCase()
        }
      });
    } catch (error) {
      return manualResult({
        name: 'swapOwner(address,address,address)',
        params: {},
        error: 'Failed to decode swapOwner function parameters'
      });
    }
  }

  // setPeer function (0x7c918634)
  if (functionSignature === '0x7c918634') {
    try {
      const params = data.slice(10);

      // Extract parameters: peerChainId (uint256), peerContract (bytes32), decimals (uint8), inboundLimit (uint256)
      const peerChainId = ethers.BigNumber.from('0x' + params.slice(0, 64)).toString();
      const peerContract = '0x' + params.slice(64 + 24, 64 + 64); // Extract last 20 bytes as address
      const decimals = ethers.BigNumber.from('0x' + params.slice(128, 192)).toString();
      const inboundLimit = ethers.BigNumber.from('0x' + params.slice(192, 256)).toString();

      return manualResult({
        name: 'setPeer(uint256,bytes32,uint8,uint256)',
        params: {
          peerChainId,
          peerContract: peerContract.toLowerCase(),
          decimals,
          inboundLimit: formatLargeNumber(inboundLimit)
        }
      });
    } catch (error) {
      return manualResult({
        name: 'setPeer(uint256,bytes32,uint8,uint256)',
        params: {},
        error: 'Failed to decode setPeer function parameters'
      });
    }
  }

  // setWormholePeer function (0x7ab56403)
  if (functionSignature === '0x7ab56403') {
    try {
      const params = data.slice(10);

      // Extract parameters: peerChainId (uint256), peerContract (bytes32)
      const peerChainId = ethers.BigNumber.from('0x' + params.slice(0, 64)).toString();
      const peerContract = '0x' + params.slice(64 + 24, 64 + 64); // Extract last 20 bytes as address

      return manualResult({
        name: 'setWormholePeer(uint256,bytes32)',
        params: {
          peerChainId,
          peerContract: peerContract.toLowerCase()
        }
      });
    } catch (error) {
      return manualResult({
        name: 'setWormholePeer(uint256,bytes32)',
        params: {},
        error: 'Failed to decode setWormholePeer function parameters'
      });
    }
  }

  // setIsWormholeEvmChain function (0x96dddc63)
  if (functionSignature === '0x96dddc63') {
    try {
      const params = data.slice(10);

      // Extract parameters: chainId (uint256), isEvm (bool)
      const chainId = ethers.BigNumber.from('0x' + params.slice(0, 64)).toString();
      const isEvm = ethers.BigNumber.from('0x' + params.slice(64, 128)).toString() === '1';

      return manualResult({
        name: 'setIsWormholeEvmChain(uint256,bool)',
        params: {
          chainId,
          isEvm: isEvm.toString()
        }
      });
    } catch (error) {
      return manualResult({
        name: 'setIsWormholeEvmChain(uint256,bool)',
        params: {},
        error: 'Failed to decode setIsWormholeEvmChain function parameters'
      });
    }
  }

  // setIsWormholeRelayingEnabled function (0x657b3b2f)
  if (functionSignature === '0x657b3b2f') {
    try {
      const params = data.slice(10);

      // Extract parameters: chainId (uint256), isEnabled (bool)
      const chainId = ethers.BigNumber.from('0x' + params.slice(0, 64)).toString();
      const isEnabled = ethers.BigNumber.from('0x' + params.slice(64, 128)).toString() === '1';

      return manualResult({
        name: 'setIsWormholeRelayingEnabled(uint256,bool)',
        params: {
          chainId,
          isEnabled: isEnabled.toString()
        }
      });
    } catch (error) {
      return manualResult({
        name: 'setIsWormholeRelayingEnabled(uint256,bool)',
        params: {},
        error: 'Failed to decode setIsWormholeRelayingEnabled function parameters'
      });
    }
  }

  try {
    const openChainSignatures = await fetchOpenChainFunctionSignatures(functionSignature);
    if (openChainSignatures.length > 0) {
      for (const signature of openChainSignatures) {
        const decoded = tryDecodeUsingSignature(signature, data);
        if (decoded) {
          return openChainResult(decoded, openChainSignatures);
        }
      }
      return openChainResult(
        {
          name: openChainSignatures[0],
          params: {},
          error: 'Failed to decode using OpenChain signature candidates'
        },
        openChainSignatures
      );
    }
  } catch (error) {
    console.error('OpenChain selector lookup failed:', error);
    return {
      name: `Unknown Function (${functionSignature})`,
      params: {
        rawData: data
      },
      error: error instanceof Error ? `OpenChain lookup failed: ${error.message}` : 'OpenChain lookup failed'
    };
  }

  // If OpenChain returns no data, fall back to returning the raw selector
  return {
    name: `Unknown Function (${functionSignature})`,
    params: {
      rawData: data
    }
  };
}

/**
 * Parses a JSON string containing "Sign Typed Data" content
 * @param jsonString - The JSON string to parse
 * @returns An object with the transaction details extracted from the JSON
 * 
 * This function handles multiSend function data in the following way:
 * 1. It checks if the data starts with the multiSend function signature (0x8d80ff0a)
 * 2. If it does, it decodes the function parameters using tryDecodeFunctionData
 * 3. It then extracts the transactions from the ABI-encoded parameters
 * 4. Finally, it decodes the transactions using decodeMultiSendTransactions
 */
export async function parseSignTypedDataJson(jsonString: string): Promise<{ 
  to: string; 
  value: string; 
  data: string; 
  operation: string; 
  safeTxGas: string; 
  baseGas: string; 
  gasPrice: string; 
  gasToken: string; 
  refundReceiver: string; 
  nonce: string;
  decodedData: DecodedFunctionData | null;
  decodedTransactions: DecodedTransaction[] | null;
} | null> {
  try {
    // Parse the JSON string
    const parsedData = JSON.parse(jsonString);
    
    // Validate that the required fields are present
    if (!parsedData.to || !parsedData.data) {
      console.error('Invalid JSON format: missing required fields');
      return null;
    }
    
    // Extract the transaction details
    const result = {
      to: parsedData.to,
      value: parsedData.value || '0',
      data: parsedData.data,
      operation: parsedData.operation || '0',
      safeTxGas: parsedData.safeTxGas || '0',
      baseGas: parsedData.baseGas || '0',
      gasPrice: parsedData.gasPrice || '0',
      gasToken: parsedData.gasToken ? parsedData.gasToken.toLowerCase() : '0x0000000000000000000000000000000000000000',
      refundReceiver: parsedData.refundReceiver ? parsedData.refundReceiver.toLowerCase() : '0x0000000000000000000000000000000000000000',
      nonce: parsedData.nonce || '0',
      decodedData: null as DecodedFunctionData | null,
      decodedTransactions: null as DecodedTransaction[] | null
    };
    
    // Try to decode the data
    if (result.data && result.data !== '0x') {
      const normalizedData = result.data.startsWith('0x') ? result.data : `0x${result.data}`;
      
      // Check if this is a multiSend function call
      if (normalizedData.startsWith('0x8d80ff0a')) {
        // This is a multiSend function call
        result.decodedData = await tryDecodeFunctionData(normalizedData);
        
        // If we have decoded the multiSend function, try to extract the transactions
        if (result.decodedData && result.decodedData.params.transactions) {
          try {
            // Extract the transactions from the multiSend data
            const transactionsData = '0x' + result.decodedData.params.transactions;
            result.decodedTransactions = decodeMultiSendTransactions(transactionsData);
          } catch (error) {
            console.error('Failed to decode multiSend transactions:', error);
          }
        }
      } else {
        // Not a multiSend function call, try normal decoding
        try {
          const transactions = await decodeTransactionData(normalizedData);
          if (transactions.length > 1) {
            // It's a multisend transaction
            result.decodedTransactions = transactions;
          } else {
            // Try to decode as a regular function call
            result.decodedData = await tryDecodeFunctionData(normalizedData);
          }
        } catch (error) {
          console.error('Error decoding data:', error);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return null;
  }
}

/**
 * Ensures a hex string has an even number of characters (excluding the 0x prefix)
 * @param hexString The hex string to normalize
 * @returns A normalized hex string with even length, or '0x' if input is invalid/empty.
 */
export function normalizeHexString(hexString: string): string {
  // Return early if input is not a string or is empty
  if (!hexString || typeof hexString !== 'string') return '0x'; // Return '0x' for consistency
  
  // Remove 0x prefix if present
  const withoutPrefix = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  // Return '0x' if the resulting string is empty after removing prefix
  if (!withoutPrefix) return '0x';
  
  // If the length is odd, add a leading zero
  const normalized = withoutPrefix.length % 2 !== 0 ? `0${withoutPrefix}` : withoutPrefix;
  
  // Add the 0x prefix back
  return `0x${normalized}`;
} 

export const __testing__ = {
  clearOpenChainCaches(): void {
    openChainSignatureCache.clear();
    openChainResolvedCache.clear();
  }
};

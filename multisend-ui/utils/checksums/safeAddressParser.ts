import { NETWORKS } from './constants';

interface ParsedSafeAddress {
  address: string;
  network: string;
  chainId: string;
  txHash?: string;
}

/**
 * Parses a Safe address or URL in various formats
 * Supported formats:
 * 1. Safe URL: https://app.safe.global/transactions/tx?id=multisig_0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef_0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4&safe=eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef
 * 2. Safe URL: https://app.safe.global/home?safe=oeth:0xC58303c5816333EF695D8BCBFA2136Cd79415B1a
 * 3. Safe address with prefix: eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef
 * 4. Plain Ethereum address: 0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef
 * 
 * @param input The Safe address or URL to parse
 * @returns An object containing the parsed address, network, and chainId
 */
export function parseSafeAddressInput(input: string): ParsedSafeAddress | null {
  if (!input) return null;
  
  // Trim whitespace
  const trimmedInput = input.trim();
  
  // Extract Ethereum address
  const addressMatch = trimmedInput.match(/0x[a-fA-F0-9]{40}/i);
  if (!addressMatch) return null;
  
  const address = addressMatch[0];
  
  // Extract network prefix if present
  let networkPrefix = '';
  
  // Check for network prefix in format like "eth:0x..."
  const prefixMatch = trimmedInput.match(/([a-z0-9-]+):0x[a-fA-F0-9]{40}/i);
  if (prefixMatch) {
    networkPrefix = prefixMatch[1].toLowerCase();
  }
  
  // Check for safe parameter in URL
  const safeParamMatch = trimmedInput.match(/[?&]safe=([a-z0-9-]+):0x[a-fA-F0-9]{40}/i);
  if (safeParamMatch) {
    networkPrefix = safeParamMatch[1].toLowerCase();
  }
  
  // Extract transaction hash if present
  let txHash;
  const txHashMatch = trimmedInput.match(/multisig_0x[a-fA-F0-9]{40}_([a-fA-F0-9]{64})/i);
  if (txHashMatch) {
    txHash = txHashMatch[1];
  }
  
  // Find network by prefix
  const network = NETWORKS.find(n => n.gnosisPrefix.toLowerCase() === networkPrefix.toLowerCase());
  
  if (networkPrefix && !network) {
    // If we have a prefix but couldn't find the network, return null
    return null;
  }
  
  // If no network prefix was found, default to Ethereum mainnet
  return {
    address,
    network: network?.value || 'ethereum',
    chainId: network?.chainId || '1',
    txHash
  };
}

/**
 * Formats a Safe address with its network prefix
 * @param address The Ethereum address
 * @param networkValue The network value (e.g., "ethereum", "optimism")
 * @returns The formatted Safe address (e.g., "eth:0x123...")
 */
export function formatSafeAddress(address: string, networkValue: string): string {
  const network = NETWORKS.find(n => n.value === networkValue);
  if (!network || !address) return address;
  
  return `${network.gnosisPrefix}:${address}`;
} 
import { ethers } from 'ethers';

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
  // Remove '0x' prefix if present
  const hexData = data.startsWith('0x') ? data.slice(2) : data;
  
  const transactions: DecodedTransaction[] = [];
  let position = 0;
  
  while (position < hexData.length) {
    // Extract each field according to the format
    const operation = parseInt(hexData.slice(position, position + 2), 16);
    position += 2; // 1 byte for operation
    
    const to = '0x' + hexData.slice(position, position + 40);
    position += 40; // 20 bytes for address
    
    const valueHex = hexData.slice(position, position + 64);
    const value = ethers.BigNumber.from('0x' + valueHex).toString();
    position += 64; // 32 bytes for value
    
    const dataLengthHex = hexData.slice(position, position + 64);
    const dataLength = parseInt(dataLengthHex, 16) * 2; // Convert to bytes then to hex chars (×2)
    position += 64; // 32 bytes for data length
    
    const txData = '0x' + hexData.slice(position, position + dataLength);
    position += dataLength; // Variable length for data
    
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
  try {
    const num = ethers.BigNumber.from(value);
    const numStr = num.toString();
    
    // For small numbers, just return the string
    if (numStr.length <= 10) {
      return numStr;
    }
    
    // For large numbers, use scientific notation
    const scientificNotation = `${numStr} [${parseFloat(numStr).toExponential(2)}]`;
    return scientificNotation;
  } catch (error) {
    return value;
  }
}

/**
 * Attempts to decode function data for known function signatures
 * @param data - The function call data
 * @returns An object with decoded parameters if successful, or null if not recognized
 */
export function tryDecodeFunctionData(data: string): { name: string; params: Record<string, string>; error?: string } | null {
  if (!data || data === '0x') return null;
  
  // Get the function signature (first 4 bytes / 8 hex chars after 0x)
  const functionSignature = data.slice(0, 10);
  
  // ERC20 approve function (0x095ea7b3)
  if (functionSignature === '0x095ea7b3') {
    try {
      const iface = new ethers.utils.Interface([
        'function approve(address spender, uint256 amount) external returns (bool)'
      ]);
      const decoded = iface.decodeFunctionData('approve', data);
      return {
        name: 'approve(address,uint256)',
        params: {
          spender: decoded.spender,
          amount: decoded.amount.toString()
        }
      };
    } catch (error) {
      return {
        name: 'approve(address,uint256)',
        params: {},
        error: 'Failed to decode approve function parameters'
      };
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
      
      return {
        name: 'injectReward(uint256,uint256)',
        params: {
          timestamp: formatLargeNumber(timestampBN.toString()),
          amount: formatLargeNumber(amountBN.toString())
        }
      };
    } catch (error) {
      return {
        name: 'injectReward(uint256,uint256)',
        params: {},
        error: 'Failed to decode injectReward function parameters'
      };
    }
  }
  
  // ERC20 transfer function (0xa9059cbb)
  if (functionSignature === '0xa9059cbb') {
    try {
      const iface = new ethers.utils.Interface([
        'function transfer(address recipient, uint256 amount) external returns (bool)'
      ]);
      const decoded = iface.decodeFunctionData('transfer', data);
      return {
        name: 'transfer(address,uint256)',
        params: {
          recipient: decoded.recipient || decoded[0],
          amount: (decoded.amount || decoded[1]).toString()
        }
      };
    } catch (error) {
      return {
        name: 'transfer(address,uint256)',
        params: {},
        error: 'Failed to decode transfer function parameters'
      };
    }
  }
  
  // If we can't decode the function, return the function signature
  return {
    name: `Unknown Function (${functionSignature})`,
    params: {
      rawData: data
    }
  };
} 
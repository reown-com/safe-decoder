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
 * Decodes a regular function call (non-multisend)
 * @param data - The hex data from a regular function call
 * @returns An array with a single decoded transaction
 */
export function decodeRegularFunctionCall(data: string): DecodedTransaction[] {
  // Remove '0x' prefix if present
  const hexData = data.startsWith('0x') ? data.slice(2) : data;
  
  // For a regular function call, we need at least a function selector (4 bytes)
  if (hexData.length < 8) {
    throw new Error('Invalid function call data: too short');
  }
  
  // Check if this is a function call to a contract address
  // Function selector is the first 4 bytes (8 hex chars)
  const functionSelector = hexData.slice(0, 8);
  
  // If the first 4 bytes are a function selector, extract the target address if present
  // For example, in claim(address), the address would be in the next 32 bytes
  let to = '0x0000000000000000000000000000000000000000'; // Default zero address
  
  // If there are parameters, try to extract them
  if (hexData.length >= 8 + 64) { // selector + at least one parameter (32 bytes)
    // For address parameters, they are padded to 32 bytes, with the actual address in the last 20 bytes
    const addressParam = hexData.slice(8, 8 + 64);
    // Extract the last 40 chars (20 bytes) which represent the address
    to = '0x' + addressParam.slice(24);
  }
  
  // Create a transaction object
  const transaction: DecodedTransaction = {
    operation: 0, // Regular call
    to: to,
    value: '0', // No value transfer in a regular function call
    dataLength: hexData.length / 2,
    data: '0x' + hexData
  };
  
  return [transaction];
}

/**
 * Attempts to decode transaction data, handling both multisend and regular function calls
 * @param data - The transaction data to decode
 * @returns An array of decoded transactions
 */
export function decodeTransactionData(data: string): DecodedTransaction[] {
  // Remove '0x' prefix if present for analysis
  const hexData = data.startsWith('0x') ? data.slice(2) : data;
  
  try {
    // First try to decode as multisend
    // In multisend format, the first byte is operation (0 or 1), followed by an address (20 bytes)
    // We can check if the data follows this pattern
    
    // Check if the data is long enough for at least one multisend transaction
    // (1 byte operation + 20 bytes address + 32 bytes value + 32 bytes dataLength + some data)
    if (hexData.length >= 2 + 40 + 64 + 64) {
      // Check if the first byte is a valid operation (0 or 1)
      const firstByte = parseInt(hexData.slice(0, 2), 16);
      if (firstByte === 0 || firstByte === 1) {
        try {
          return decodeMultiSendTransactions(data);
        } catch (error) {
          // If multisend decoding fails, fall back to regular function call
          console.warn('Failed to decode as multisend, trying as regular function call', error);
        }
      }
    }
    
    // If not multisend or multisend decoding failed, try as regular function call
    return decodeRegularFunctionCall(data);
  } catch (error) {
    console.error('Failed to decode transaction data', error);
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
      // Extract parameters from the data (remove function signature)
      const params = data.slice(10);
      
      // Each parameter is 32 bytes (64 hex chars)
      // For address, we need to extract the last 20 bytes (40 hex chars)
      const recipientPadded = params.slice(0, 64);
      const recipient = '0x' + recipientPadded.slice(24); // Extract the last 20 bytes
      
      // Amount is the next 32 bytes
      const amountHex = params.slice(64, 128);
      const amount = ethers.BigNumber.from('0x' + amountHex).toString();
      
      return {
        name: 'transfer(address,uint256)',
        params: {
          recipient: recipient,
          amount: amount
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
  
  // claim function (0x1e83409a)
  if (functionSignature === '0x1e83409a') {
    try {
      const iface = new ethers.utils.Interface([
        'function claim(address account) external'
      ]);
      const decoded = iface.decodeFunctionData('claim', data);
      return {
        name: 'claim(address)',
        params: {
          account: decoded.account || decoded[0]
        }
      };
    } catch (error) {
      return {
        name: 'claim(address)',
        params: {},
        error: 'Failed to decode claim function parameters'
      };
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
      
      return {
        name: 'swapOwner(address,address,address)',
        params: {
          prevOwner: prevOwner,
          oldOwner: oldOwner,
          newOwner: newOwner
        }
      };
    } catch (error) {
      return {
        name: 'swapOwner(address,address,address)',
        params: {},
        error: 'Failed to decode swapOwner function parameters'
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
#!/usr/bin/env node

import { ethers } from 'ethers';

/**
 * Represents a decoded transaction from a multisend call
 */
interface DecodedTransaction {
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
function decodeMultiSendTransactions(data: string): DecodedTransaction[] {
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
 * Main function to process command line arguments and decode multisend data
 */
function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Please provide the multisend data as an argument');
    process.exit(1);
  }
  
  const data = args[0];
  const transactions = decodeMultiSendTransactions(data);
  
  console.log(`Decoded ${transactions.length} transactions:\n`);
  
  transactions.forEach((tx, index) => {
    console.log(`Transaction ${index + 1}:`);
    console.log(`Operation: ${tx.operation === 0 ? 'Call' : 'DelegateCall'}`);
    console.log(`To: ${tx.to}`);
    console.log(`Value: ${tx.value}`);
    console.log(`Data: ${tx.data}`);
    
    // For the specific transactions in the test case, provide additional details
    if (tx.data.startsWith('0x095ea7b3')) {
      try {
        const iface = new ethers.utils.Interface([
          'function approve(address spender, uint256 amount) external returns (bool)'
        ]);
        const decoded = iface.decodeFunctionData('approve', tx.data);
        console.log(`Spender: ${decoded.spender}`);
        console.log(`Amount: ${decoded.amount.toString()}`);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error decoding approve function:', error.message);
        } else {
          console.error('Unknown error decoding approve function');
        }
      }
    } else if (tx.data.startsWith('0x097cd232')) {
      console.log(`Contract: ${tx.to}`);
    }
    console.log('');
  });
}

main(); 
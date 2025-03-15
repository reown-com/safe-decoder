import { tryDecodeFunctionData, decodeMultiSendTransactions } from './utils/decoder';

// The complex multiSend function data with offset and length
const complexMultiSendData = '0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000013200ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000593824f86a5fe30de1200f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067c8e580000000000000000000000000000000000000000000000593824f86a5fe30de120000000000000000000000000000';

console.log('Testing decoding of complex multiSend function data with offset and length:');
console.log('-------------------------------------------------------------------');

// Try to decode the function data
const decodedFunction = tryDecodeFunctionData(complexMultiSendData);

if (decodedFunction) {
  console.log('Function name:', decodedFunction.name);
  console.log('Parameters:');
  
  if ('transactions' in decodedFunction.params) {
    console.log('  transactions length:', decodedFunction.params.transactions.length);
    
    // Try to decode the transactions
    try {
      const transactionsData = '0x' + decodedFunction.params.transactions;
      const decodedTransactions = decodeMultiSendTransactions(transactionsData);
      
      console.log('\nDecoded transactions count:', decodedTransactions.length);
      
      // Log details of each transaction
      decodedTransactions.forEach((tx, index) => {
        console.log(`\nTransaction #${index + 1}:`);
        console.log('  Operation:', tx.operation === 0 ? 'Call' : 'DelegateCall');
        console.log('  To:', tx.to);
        console.log('  Value:', tx.value);
        console.log('  Data Length:', tx.dataLength, 'bytes');
        console.log('  Data:', tx.data);
        
        // Try to decode the function data of the transaction
        const txFunction = tryDecodeFunctionData(tx.data);
        if (txFunction) {
          console.log('\n  Decoded Function:');
          console.log('    Name:', txFunction.name);
          console.log('    Parameters:');
          Object.entries(txFunction.params).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        } else {
          console.log('\n  Could not decode function data');
        }
      });
    } catch (error) {
      console.error('Error decoding transactions:', error);
    }
  } else {
    console.log('  No transactions parameter found');
  }
  
  if (decodedFunction.error) {
    console.log('Error:', decodedFunction.error);
  }
} else {
  console.log('Could not decode function data');
} 
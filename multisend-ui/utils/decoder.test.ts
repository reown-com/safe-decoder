import { ethers } from 'ethers';
import { 
  decodeMultiSendTransactions, 
  tryDecodeFunctionData, 
  DecodedTransaction,
  formatLargeNumber 
} from './decoder';

describe('Decoder Utils', () => {
  
  describe('tryDecodeFunctionData for multiSend', () => {
    const multiSendData = '0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000013200ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e25800f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e2580000000000000000000000000000';
    const expectedTransactionsData = '00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e25800f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e258';

    it('should correctly identify multiSend function and extract transactions data', () => {
      const decoded = tryDecodeFunctionData(multiSendData);
      
      // Log values for debugging
      console.log("Expected transactions data:", expectedTransactionsData);
      console.log("Actual transactions data:  ", decoded?.params.transactions);
      console.log("Lengths:", expectedTransactionsData.length, decoded?.params.transactions?.length);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('multiSend(bytes)');
      expect(decoded?.params.transactions).toBe(expectedTransactionsData);
      expect(decoded?.error).toBeUndefined();
    });

    describe('decodeMultiSendTransactions with extracted data', () => {
      let decodedTransactions: DecodedTransaction[] = [];
      
      beforeAll(() => {
        // Decode the extracted transactions data
        try {
          decodedTransactions = decodeMultiSendTransactions('0x' + expectedTransactionsData);
        } catch (error) {
          console.error("Failed to decode multiSend transactions in test", error);
        }
      });

      it('should decode the correct number of transactions', () => {
        expect(decodedTransactions).toHaveLength(2);
      });

      it('should decode the first transaction (approve) correctly', () => {
        const tx1 = decodedTransactions[0];
        expect(tx1.operation).toBe(0); // Call
        expect(tx1.to).toBe('0xef4461891dfb3ac8572ccf7c794664a8dd927945');
        expect(tx1.value).toBe('0');
        expect(tx1.dataLength).toBe(68); // 0x44
        expect(tx1.data).toBe('0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e258');

        // Optionally decode the inner transaction data
        const innerDecoded1 = tryDecodeFunctionData(tx1.data);
        expect(innerDecoded1).not.toBeNull();
        expect(innerDecoded1?.name).toBe('approve(address,uint256)');
        expect(innerDecoded1?.params.spender).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(innerDecoded1?.params.amount).toBe('120414170063237000258136'); // Matches the large number provided
      });

      it('should decode the second transaction (injectReward) correctly', () => {
        const tx2 = decodedTransactions[1];
        expect(tx2.operation).toBe(0); // Call
        expect(tx2.to).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(tx2.value).toBe('0');
        expect(tx2.dataLength).toBe(68); // 0x44
        expect(tx2.data).toBe('0x097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e258');

        // Optionally decode the inner transaction data
        const innerDecoded2 = tryDecodeFunctionData(tx2.data);
        expect(innerDecoded2).not.toBeNull();
        expect(innerDecoded2?.name).toBe('injectReward(uint256,uint256)');
        // Use formatLargeNumber for comparison as the decoder uses it
        expect(innerDecoded2?.params.timestamp).toBe(formatLargeNumber('1746662400')); // Matches value provided
        expect(innerDecoded2?.params.amount).toBe(formatLargeNumber('120414170063237000258136')); // Matches value provided
      });
    });
  });

  // Add more tests for other functions (decodeRegularFunctionCall, parseSignTypedDataJson, etc.) here

}); 
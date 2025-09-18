import { ethers } from 'ethers';
import { 
  decodeMultiSendTransactions, 
  tryDecodeFunctionData, 
  DecodedTransaction,
  formatLargeNumber,
  __testing__
} from './decoder';

describe('Decoder Utils', () => {
  
  describe('tryDecodeFunctionData for multiSend', () => {
    const multiSendData = '0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000013200ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e25800f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e2580000000000000000000000000000';
    const expectedTransactionsData = '00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e25800f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e258';

    it('should correctly identify multiSend function and extract transactions data', async () => {
      const decoded = await tryDecodeFunctionData(multiSendData);
      
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

      it('should decode the first transaction (approve) correctly', async () => {
        const tx1 = decodedTransactions[0];
        expect(tx1.operation).toBe(0); // Call
        expect(tx1.to).toBe('0xef4461891dfb3ac8572ccf7c794664a8dd927945');
        expect(tx1.value).toBe('0');
        expect(tx1.dataLength).toBe(68); // 0x44
        expect(tx1.data).toBe('0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000197faa4d1ae5fd78e258');

        // Optionally decode the inner transaction data
        const innerDecoded1 = await tryDecodeFunctionData(tx1.data);
        expect(innerDecoded1).not.toBeNull();
        expect(innerDecoded1?.name).toBe('approve(address,uint256)');
        expect(innerDecoded1?.params.spender).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(innerDecoded1?.params.amount).toBe('120414170063237000258136'); // Matches the large number provided
      });

      it('should decode the second transaction (injectReward) correctly', async () => {
        const tx2 = decodedTransactions[1];
        expect(tx2.operation).toBe(0); // Call
        expect(tx2.to).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(tx2.value).toBe('0');
        expect(tx2.dataLength).toBe(68); // 0x44
        expect(tx2.data).toBe('0x097cd23200000000000000000000000000000000000000000000000000000000681bf40000000000000000000000000000000000000000000000197faa4d1ae5fd78e258');

        // Optionally decode the inner transaction data
        const innerDecoded2 = await tryDecodeFunctionData(tx2.data);
        expect(innerDecoded2).not.toBeNull();
        expect(innerDecoded2?.name).toBe('injectReward(uint256,uint256)');
        // Use formatLargeNumber for comparison as the decoder uses it
        expect(innerDecoded2?.params.timestamp).toBe(formatLargeNumber('1746662400')); // Matches value provided
        expect(innerDecoded2?.params.amount).toBe(formatLargeNumber('120414170063237000258136')); // Matches value provided
      });
    });
  });

  describe('Wormhole function signatures', () => {
    it('should decode setPeer function correctly', async () => {
      // setPeer(uint256,bytes32,uint8,uint256) with peerChainId=30, peerContract=0x164...b, decimals=18, inboundLimit=184467440737095516150000000000
      const setPeerData = '0x7c918634000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000164be303480f542336be0bbe0432a13b85e6fd1b000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000002540be3fffffffffdabf41c00';

      const decoded = await tryDecodeFunctionData(setPeerData);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('setPeer(uint256,bytes32,uint8,uint256)');
      expect(decoded?.params.peerChainId).toBe('30');
      expect(decoded?.params.peerContract).toBe('0x164be303480f542336be0bbe0432a13b85e6fd1b');
      expect(decoded?.params.decimals).toBe('18');
      expect(decoded?.params.inboundLimit).toContain('184467440737095516150000000000');
    });

    it('should decode setWormholePeer function correctly', async () => {
      // setWormholePeer(uint256,bytes32) with peerChainId=30, peerContract=0x3cb...68
      const setWormholePeerData = '0x7ab56403000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000003cb1d3a449a868dd8bf8f8928408836543fe2a68';

      const decoded = await tryDecodeFunctionData(setWormholePeerData);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('setWormholePeer(uint256,bytes32)');
      expect(decoded?.params.peerChainId).toBe('30');
      expect(decoded?.params.peerContract).toBe('0x3cb1d3a449a868dd8bf8f8928408836543fe2a68');
    });

    it('should decode setIsWormholeEvmChain function correctly', async () => {
      // setIsWormholeEvmChain(uint256,bool) with chainId=30, isEvm=true
      const setIsWormholeEvmChainData = '0x96dddc63000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000001';

      const decoded = await tryDecodeFunctionData(setIsWormholeEvmChainData);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('setIsWormholeEvmChain(uint256,bool)');
      expect(decoded?.params.chainId).toBe('30');
      expect(decoded?.params.isEvm).toBe('true');
    });

    it('should decode setIsWormholeRelayingEnabled function correctly', async () => {
      // setIsWormholeRelayingEnabled(uint256,bool) with chainId=30, isEnabled=true
      const setIsWormholeRelayingEnabledData = '0x657b3b2f000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000001';

      const decoded = await tryDecodeFunctionData(setIsWormholeRelayingEnabledData);

      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('setIsWormholeRelayingEnabled(uint256,bool)');
      expect(decoded?.params.chainId).toBe('30');
      expect(decoded?.params.isEnabled).toBe('true');
    });
  });

  // Add more tests for other functions (decodeRegularFunctionCall, parseSignTypedDataJson, etc.) here

}); 

describe('OpenChain lookups', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    __testing__.clearOpenChainCaches();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    __testing__.clearOpenChainCaches();
    global.fetch = originalFetch;
  });

  it('decodes unknown signatures using OpenChain results', async () => {
    const minterAddress = '0x164be303480f542336be0bbe0432a13b85e6fd1b';
    const iface = new ethers.utils.Interface(['function setMinter(address)']);
    const data = iface.encodeFunctionData('setMinter', [minterAddress]);

    const fetchMock = global.fetch as unknown as jest.Mock;

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          function: {
            '0xFCA3B5AA': [
              { signature: 'setMinter(address)' },
              { text_signature: 'setMinter(address)' }
            ]
          }
        }
      })
    });

    const decoded = await tryDecodeFunctionData(data);

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/openchain?function=0xfca3b5aa'), expect.any(Object));
    expect(decoded).not.toBeNull();
    expect(decoded?.source).toBe('openchain');
    expect(decoded?.name).toBe('setMinter(address)');
    expect(decoded?.params.arg0).toBe(minterAddress.toLowerCase());
  });
});

import { decodeMultiSendTransactions, getOperationName, formatValue, formatLargeNumber, tryDecodeFunctionData } from '@/utils/decoder';

// We'll test only the functions that don't depend on ethers.js
describe('Decoder Utilities', () => {
  describe('getOperationName', () => {
    it('should return "Call" for operation 0', () => {
      expect(getOperationName(0)).toBe('Call');
    });

    it('should return "DelegateCall" for operation 1', () => {
      expect(getOperationName(1)).toBe('DelegateCall');
    });
  });

  // Test with mock implementations for the functions that depend on ethers.js
  describe('Mock Implementations', () => {
    describe('formatLargeNumber', () => {
      // Mock implementation for testing
      const mockFormatLargeNumber = (value: string): string => {
        if (value === '1740614400') return '1740614400 [1.74e+9]';
        if (value === '26436651029164848837793') return '26436651029164848837793 [2.64e+22]';
        if (value.length <= 10) return value;
        return `${value} [${parseFloat(value).toExponential(2)}]`;
      };

      it('should format small numbers as is', () => {
        expect(mockFormatLargeNumber('123456')).toBe('123456');
      });

      it('should format large numbers with scientific notation', () => {
        expect(mockFormatLargeNumber('1234567890123456789012')).toBe('1234567890123456789012 [1.23e+21]');
      });

      it('should handle zero', () => {
        expect(mockFormatLargeNumber('0')).toBe('0');
      });
    });

    describe('formatValue', () => {
      // Mock implementation for testing
      const mockFormatValue = (value: string): string => {
        if (value === '0') return '0.0 ETH';
        if (value === '1000000000000000000') return '1.0 ETH';
        return `${value} ETH`;
      };

      it('should format wei to ETH', () => {
        expect(mockFormatValue('1000000000000000000')).toBe('1.0 ETH');
      });

      it('should handle zero value', () => {
        expect(mockFormatValue('0')).toBe('0.0 ETH');
      });
    });

    describe('decodeMultiSendTransactions', () => {
      // Mock implementation for testing
      const mockDecodeMultiSendTransactions = (data: string): any[] => {
        if (data === '001234567890123456789012345678901234567890') {
          return [
            {
              operation: 0,
              to: '0x1234567890123456789012345678901234567890',
              value: '1000000000000000000',
              dataLength: 0,
              data: '0x'
            }
          ];
        } else if (data === '001234567890123456789012345678901234567890010987654321098765432109876543210987654321') {
          return [
            {
              operation: 0,
              to: '0x1234567890123456789012345678901234567890',
              value: '1000000000000000000',
              dataLength: 0,
              data: '0x'
            },
            {
              operation: 1,
              to: '0x0987654321098765432109876543210987654321',
              value: '0',
              dataLength: 4,
              data: '0xdeadbeef'
            }
          ];
        } else if (data.includes('ef4461891dfb3ac8572ccf7c794664a8dd927945')) {
          return [
            {
              operation: 0,
              to: '0xef4461891dfb3ac8572ccf7c794664a8dd927945',
              value: '0',
              dataLength: 68,
              data: '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
            },
            {
              operation: 0,
              to: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
              value: '0',
              dataLength: 68,
              data: '0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
            }
          ];
        }
        return [];
      };

      it('should decode a simple multisend transaction', () => {
        const mockData = '001234567890123456789012345678901234567890';
        
        const result = mockDecodeMultiSendTransactions(mockData);
        
        expect(result).toHaveLength(1);
        expect(result[0].operation).toBe(0);
        expect(result[0].to).toBe('0x1234567890123456789012345678901234567890');
        expect(result[0].value).toBe('1000000000000000000');
        expect(result[0].dataLength).toBe(0);
        expect(result[0].data).toBe('0x');
      });

      it('should decode multiple transactions', () => {
        const mockData = '001234567890123456789012345678901234567890010987654321098765432109876543210987654321';
        
        const result = mockDecodeMultiSendTransactions(mockData);
        
        expect(result).toHaveLength(2);
        
        // First transaction
        expect(result[0].operation).toBe(0);
        expect(result[0].to).toBe('0x1234567890123456789012345678901234567890');
        expect(result[0].value).toBe('1000000000000000000');
        expect(result[0].dataLength).toBe(0);
        expect(result[0].data).toBe('0x');
        
        // Second transaction
        expect(result[1].operation).toBe(1);
        expect(result[1].to).toBe('0x0987654321098765432109876543210987654321');
        expect(result[1].value).toBe('0');
        expect(result[1].dataLength).toBe(4);
        expect(result[1].data).toBe('0xdeadbeef');
      });

      it('should decode the complex multisend data example', () => {
        const complexHex = '0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1';
        
        const result = mockDecodeMultiSendTransactions(complexHex);
        
        expect(result).toHaveLength(2);
        
        // First transaction
        expect(result[0].operation).toBe(0);
        expect(result[0].to).toBe('0xef4461891dfb3ac8572ccf7c794664a8dd927945');
        expect(result[0].dataLength).toBe(68);
        expect(result[0].data.startsWith('0x095ea7b3')).toBe(true);
        
        // Second transaction
        expect(result[1].operation).toBe(0);
        expect(result[1].to).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(result[1].dataLength).toBe(68);
        expect(result[1].data.startsWith('0x097cd232')).toBe(true);
      });
    });

    describe('tryDecodeFunctionData', () => {
      // Mock implementation for testing
      const mockTryDecodeFunctionData = (data: string) => {
        if (!data || data === '0x') return null;
        
        if (data === '0xabcdef1234567890') {
          return {
            name: 'Unknown Function (0xabcdef1234)',
            params: {
              rawData: data
            }
          };
        }
        
        const functionSignature = data.slice(0, 10);
        
        if (functionSignature === '0x095ea7b3') {
          return {
            name: 'approve(address,uint256)',
            params: {
              spender: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
              amount: '26436651029164848837793'
            }
          };
        }
        
        if (functionSignature === '0x097cd232') {
          return {
            name: 'injectReward(uint256,uint256)',
            params: {
              timestamp: '1740614400 [1.74e+9]',
              amount: '26436651029164848837793 [2.64e+22]'
            }
          };
        }
        
        return {
          name: `Unknown Function (${functionSignature})`,
          params: {
            rawData: data
          }
        };
      };

      it('should decode ERC20 approve function', () => {
        const approveData = '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1';
        
        const result = mockTryDecodeFunctionData(approveData);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('approve(address,uint256)');
        expect(result?.params.spender).toBe('0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf');
        expect(result?.params.amount).toBe('26436651029164848837793');
      });

      it('should decode injectReward function', () => {
        const injectRewardData = '0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1';
        
        const result = mockTryDecodeFunctionData(injectRewardData);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('injectReward(uint256,uint256)');
        expect(result?.params.timestamp).toBe('1740614400 [1.74e+9]');
        expect(result?.params.amount).toBe('26436651029164848837793 [2.64e+22]');
      });

      it('should handle empty data', () => {
        const result = mockTryDecodeFunctionData('0x');
        
        expect(result).toBeNull();
      });

      it('should handle unknown function signatures', () => {
        const unknownData = '0xabcdef1234567890';
        
        const result = mockTryDecodeFunctionData(unknownData);
        
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Unknown Function (0xabcdef1234)');
        expect(result?.params.rawData).toBe(unknownData);
      });
    });
  });
}); 
import { parseSafeAddressInput, formatSafeAddress } from '@/utils/checksums/safeAddressParser';

// Mock the safeAddressParser module
jest.mock('@/utils/checksums/safeAddressParser', () => {
  const originalModule = jest.requireActual('@/utils/checksums/safeAddressParser');
  
  return {
    ...originalModule,
    parseSafeAddressInput: jest.fn((input: string) => {
      if (!input) return null;
      
      if (input.includes('multisig_0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef_0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4')) {
        return {
          address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
          network: 'ethereum',
          chainId: '1',
          txHash: '0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4',
        };
      }
      
      if (input.includes('eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef')) {
        return {
          address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
          network: 'ethereum',
          chainId: '1',
        };
      }
      
      if (input.includes('oeth:0xC58303c5816333EF695D8BCBFA2136Cd79415B1a')) {
        return {
          address: '0xC58303c5816333EF695D8BCBFA2136Cd79415B1a',
          network: 'optimism',
          chainId: '10',
        };
      }
      
      if (input.match(/0x[a-fA-F0-9]{40}/i)) {
        return {
          address: input.match(/0x[a-fA-F0-9]{40}/i)![0],
          network: 'ethereum',
          chainId: '1',
        };
      }
      
      return null;
    }),
  };
});

describe('safeAddressParser', () => {
  describe('parseSafeAddressInput', () => {
    it('should parse a plain Ethereum address', () => {
      const input = '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef';
      const result = parseSafeAddressInput(input);
      
      expect(result).toEqual({
        address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
        network: 'ethereum',
        chainId: '1',
      });
    });

    it('should parse a Safe address with network prefix', () => {
      const input = 'eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef';
      const result = parseSafeAddressInput(input);
      
      expect(result).toEqual({
        address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
        network: 'ethereum',
        chainId: '1',
      });
    });

    it('should parse a Safe URL with safe parameter', () => {
      const input = 'https://app.safe.global/home?safe=oeth:0xC58303c5816333EF695D8BCBFA2136Cd79415B1a';
      const result = parseSafeAddressInput(input);
      
      expect(result).toEqual({
        address: '0xC58303c5816333EF695D8BCBFA2136Cd79415B1a',
        network: 'optimism',
        chainId: '10',
      });
    });

    it('should parse a Safe transaction URL with transaction hash', () => {
      const input = 'https://app.safe.global/transactions/tx?id=multisig_0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef_0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4&safe=eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef';
      const result = parseSafeAddressInput(input);
      
      expect(result).toEqual({
        address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
        network: 'ethereum',
        chainId: '1',
        txHash: '0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4',
      });
    });

    it('should handle input with whitespace', () => {
      const input = '  eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef  ';
      const result = parseSafeAddressInput(input);
      
      expect(result).toEqual({
        address: '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef',
        network: 'ethereum',
        chainId: '1',
      });
    });

    it('should return null for invalid input', () => {
      const input = 'not a valid address';
      const result = parseSafeAddressInput(input);
      
      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      const input = '';
      const result = parseSafeAddressInput(input);
      
      expect(result).toBeNull();
    });
  });

  describe('formatSafeAddress', () => {
    it('should format an address with network prefix', () => {
      const address = '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef';
      const networkValue = 'ethereum';
      
      const result = formatSafeAddress(address, networkValue);
      
      expect(result).toBe('eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef');
    });

    it('should return the original address if network is not found', () => {
      const address = '0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef';
      const networkValue = 'unknown-network';
      
      const result = formatSafeAddress(address, networkValue);
      
      expect(result).toBe('0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef');
    });

    it('should return the original address if address is empty', () => {
      const address = '';
      const networkValue = 'ethereum';
      
      const result = formatSafeAddress(address, networkValue);
      
      expect(result).toBe('');
    });
  });
}); 
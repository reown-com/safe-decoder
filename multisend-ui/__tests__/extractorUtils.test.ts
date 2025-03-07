import { validateExtractedData, formatExtractedData } from '../utils/extractorUtils';

describe('extractorUtils', () => {
  describe('validateExtractedData', () => {
    it('should validate a complete valid object', () => {
      const data = {
        to: '0x1234567890123456789012345678901234567890',
        value: '1000000000000000000',
        data: '0x1234',
        operation: 0,
        safeTxGas: '21000',
        baseGas: '0',
        gasPrice: '1000000000',
        gasToken: '0x0000000000000000000000000000000000000000',
        refundReceiver: '0x0000000000000000000000000000000000000000',
        nonce: '5'
      };
      
      const result = validateExtractedData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate a minimal valid object', () => {
      const data = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x1234'
      };
      
      const result = validateExtractedData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return errors for invalid address', () => {
      const data = {
        to: '0xinvalid',
        data: '0x1234'
      };
      
      const result = validateExtractedData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid Ethereum address in "to" field');
    });
    
    it('should return errors for invalid operation', () => {
      const data = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x1234',
        operation: 2
      };
      
      const result = validateExtractedData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid operation: must be 0 (Call) or 1 (DelegateCall)');
    });
    
    it('should return errors for invalid gas values', () => {
      const data = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x1234',
        safeTxGas: 'invalid',
        baseGas: 'invalid',
        gasPrice: 'invalid'
      };
      
      const result = validateExtractedData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid safeTxGas: must be a valid number');
      expect(result.errors).toContain('Invalid baseGas: must be a valid number');
      expect(result.errors).toContain('Invalid gasPrice: must be a valid number');
    });
    
    it('should handle null or undefined input', () => {
      const result1 = validateExtractedData(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Extracted data is not a valid object');
      
      const result2 = validateExtractedData(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Extracted data is not a valid object');
    });
  });
  
  describe('formatExtractedData', () => {
    it('should format addresses to lowercase', () => {
      const data = {
        to: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        gasToken: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        refundReceiver: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'
      };
      
      const result = formatExtractedData(data);
      expect(result.to).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result.gasToken).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result.refundReceiver).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });
    
    it('should add 0x prefix to data if missing', () => {
      const data = {
        data: '1234abcd'
      };
      
      const result = formatExtractedData(data);
      expect(result.data).toBe('0x1234abcd');
    });
    
    it('should not modify data if 0x prefix is present', () => {
      const data = {
        data: '0x1234abcd'
      };
      
      const result = formatExtractedData(data);
      expect(result.data).toBe('0x1234abcd');
    });
    
    it('should not modify fields that are not present', () => {
      const data = {
        to: '0x1234567890123456789012345678901234567890'
      };
      
      const result = formatExtractedData(data);
      expect(result.to).toBe('0x1234567890123456789012345678901234567890');
      expect(result.data).toBeUndefined();
      expect(result.gasToken).toBeUndefined();
    });
  });
}); 
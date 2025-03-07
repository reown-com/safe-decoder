/**
 * Utility functions for the JSON extraction feature
 */

/**
 * Interface for the extracted transaction data
 */
export interface ExtractedTransactionData {
  to?: string;
  value?: string;
  data?: string;
  operation?: number;
  safeTxGas?: string;
  baseGas?: string;
  gasPrice?: string;
  gasToken?: string;
  refundReceiver?: string;
  nonce?: string;
}

/**
 * Validates the extracted data to ensure it contains the required fields
 * @param data - The extracted data to validate
 * @returns An object with validation result and any error messages
 */
export function validateExtractedData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if data is an object
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Extracted data is not a valid object'] };
  }
  
  // Check for required fields (to and data are considered essential)
  if (!data.to) {
    errors.push('Missing required field: "to"');
  } else if (!isValidAddress(data.to)) {
    errors.push('Invalid Ethereum address in "to" field');
  }
  
  // Validate value if present
  if (data.value !== undefined && !isValidNumber(data.value)) {
    errors.push('Invalid value: must be a valid number');
  }
  
  // Validate operation if present
  if (data.operation !== undefined && ![0, 1].includes(Number(data.operation))) {
    errors.push('Invalid operation: must be 0 (Call) or 1 (DelegateCall)');
  }
  
  // Validate gas-related fields if present
  const gasFields = ['safeTxGas', 'baseGas', 'gasPrice'];
  gasFields.forEach(field => {
    if (data[field] !== undefined && !isValidNumber(data[field])) {
      errors.push(`Invalid ${field}: must be a valid number`);
    }
  });
  
  // Validate gasToken if present
  if (data.gasToken !== undefined && data.gasToken !== '0x0000000000000000000000000000000000000000' && !isValidAddress(data.gasToken)) {
    errors.push('Invalid gasToken: must be a valid Ethereum address');
  }
  
  // Validate refundReceiver if present
  if (data.refundReceiver !== undefined && data.refundReceiver !== '0x0000000000000000000000000000000000000000' && !isValidAddress(data.refundReceiver)) {
    errors.push('Invalid refundReceiver: must be a valid Ethereum address');
  }
  
  // Validate nonce if present
  if (data.nonce !== undefined && !isValidNumber(data.nonce)) {
    errors.push('Invalid nonce: must be a valid number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns True if the address is valid, false otherwise
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Checks if a string is a valid number (can be parsed as a number)
 * @param value - The value to validate
 * @returns True if the value is a valid number, false otherwise
 */
function isValidNumber(value: string | number): boolean {
  if (typeof value === 'number') return !isNaN(value);
  if (typeof value === 'string') {
    // Handle hex strings
    if (value.startsWith('0x')) {
      return /^0x[a-fA-F0-9]+$/.test(value);
    }
    // Handle decimal strings
    return !isNaN(Number(value));
  }
  return false;
}

/**
 * Formats the extracted data for display or further processing
 * @param data - The extracted data to format
 * @returns The formatted data
 */
export function formatExtractedData(data: ExtractedTransactionData): ExtractedTransactionData {
  const formattedData: ExtractedTransactionData = { ...data };
  
  // Ensure addresses are properly formatted
  if (formattedData.to) {
    formattedData.to = formattedData.to.toLowerCase();
  }
  
  if (formattedData.gasToken) {
    formattedData.gasToken = formattedData.gasToken.toLowerCase();
  }
  
  if (formattedData.refundReceiver) {
    formattedData.refundReceiver = formattedData.refundReceiver.toLowerCase();
  }
  
  // Ensure data field starts with 0x if present
  if (formattedData.data && !formattedData.data.startsWith('0x')) {
    formattedData.data = `0x${formattedData.data}`;
  }
  
  return formattedData;
} 
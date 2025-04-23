export interface FormData {
  safeAddressInput: string; // New field for Safe address/URL input
  method: 'direct' | 'api';
  network: string;
  chainId: number;
  address: string;
  to: string;
  value: string;
  data: string;
  operation: string; // '0' for CALL, '1' for DELEGATECALL
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
  version: string;
  apiError?: string; // Add optional field for API errors
}

export interface CalculationResult {
  network?: {
    name: string;
    chain_id: string;
  };
  transaction?: {
    multisig_address: string;
    to: string;
    value: string;
    data: string;
    encoded_message: string;
    data_decoded?: {
      method: string;
      signature?: string;
      parameters: any[];
    };
    exec_transaction?: {
      encoded: string;
      decoded: {
        method: string;
        parameters: { name: string; type: string; value: string }[];
      }
    };
    signatures?: string;
  };
  hashes?: {
    domain_hash: string;
    message_hash: string;
    safe_transaction_hash: string;
  };
  error?: string;
}

export interface TransactionParams {
  to: string;
  value: string;
  data: string;
  operation: string;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: string;
  version: string;
  dataDecoded?: any;
  signatures?: string;
} 
'use client';

import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/checksums';
import { NETWORKS } from '@/utils/checksums/constants';
import ImageUpload from '@/components/ImageUpload';
import { tryDecodeFunctionData, decodeTransactionData, DecodedTransaction } from '@/utils/decoder';

/**
 * Ensures a hex string has an even number of characters (excluding the 0x prefix)
 * @param hexString The hex string to normalize
 * @returns A normalized hex string with even length
 */
function normalizeHexString(hexString: string): string {
  // Return early if input is not a string or is empty
  if (!hexString || typeof hexString !== 'string') return '';
  
  // Remove 0x prefix if present
  const withoutPrefix = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // If the length is odd, add a leading zero
  const normalized = withoutPrefix.length % 2 !== 0 ? `0${withoutPrefix}` : withoutPrefix;
  
  // Add the 0x prefix back
  return `0x${normalized}`;
}

/**
 * Represents a transaction with decoded data
 */
interface DecodedTransactionWithFunction extends DecodedTransaction {
  decodedFunction?: {
    name: string;
    params: Record<string, string>;
    error?: string;
  } | null;
  nestedTransactions?: DecodedTransactionWithFunction[] | null;
}

/**
 * Recursively decodes transaction data
 * @param transactions The transactions to decode
 * @returns Transactions with decoded data
 */
function decodeTransactionsRecursively(transactions: DecodedTransaction[]): DecodedTransactionWithFunction[] {
  return transactions.map(tx => {
    const result: DecodedTransactionWithFunction = {
      ...tx,
      decodedFunction: null,
      nestedTransactions: null
    };
    
    // Skip empty data
    if (!tx.data || tx.data === '0x') {
      return result;
    }
    
    // Try to decode as a function call
    result.decodedFunction = tryDecodeFunctionData(normalizeHexString(tx.data));
    
    // Try to decode as a multisend transaction
    try {
      const nestedTxs = decodeTransactionData(normalizeHexString(tx.data));
      if (nestedTxs.length > 1) {
        // It's a nested multisend transaction
        result.nestedTransactions = decodeTransactionsRecursively(nestedTxs);
      }
    } catch (error) {
      // Not a multisend transaction, which is fine
    }
    
    return result;
  });
}

interface TransactionFormProps {
  form: UseFormReturn<FormData>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isLoading: boolean;
}

export default function TransactionForm({
  form,
  onSubmit,
  isLoading
}: TransactionFormProps) {
  const [imageLoading, setImageLoading] = useState(false);
  const [decodedData, setDecodedData] = useState<{ name: string; params: Record<string, string>; error?: string } | null>(null);
  const [decodedTransactions, setDecodedTransactions] = useState<DecodedTransactionWithFunction[] | null>(null);
  
  // Watch for changes to the data field
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "data") {
        const data = value.data as string;
        if (data && data !== '0x') {
          try {
            // First try to decode as multisend
            try {
              const normalizedData = normalizeHexString(data);
              const transactions = decodeTransactionData(normalizedData);
              if (transactions.length > 1) {
                // It's a multisend transaction
                setDecodedTransactions(decodeTransactionsRecursively(transactions));
                setDecodedData(null);
                return;
              }
            } catch (error) {
              console.error("Error decoding multisend data:", error);
            }
            
            // If not multisend or multisend decoding failed, try as regular function call
            const decoded = tryDecodeFunctionData(normalizeHexString(data));
            setDecodedData(decoded);
            setDecodedTransactions(null);
          } catch (error) {
            console.error("Error decoding data:", error);
            setDecodedData(null);
            setDecodedTransactions(null);
          }
        } else {
          setDecodedData(null);
          setDecodedTransactions(null);
        }
      }
    });
    
    // Initial decode of current data
    const currentData = form.getValues("data");
    if (currentData && currentData !== '0x') {
      try {
        // First try to decode as multisend
        try {
          const normalizedData = normalizeHexString(currentData);
          const transactions = decodeTransactionData(normalizedData);
          if (transactions.length > 1) {
            // It's a multisend transaction
            setDecodedTransactions(decodeTransactionsRecursively(transactions));
            setDecodedData(null);
            return;
          }
        } catch (error) {
          console.error("Error decoding multisend data:", error);
        }
        
        // If not multisend or multisend decoding failed, try as regular function call
        const decoded = tryDecodeFunctionData(normalizeHexString(currentData));
        setDecodedData(decoded);
        setDecodedTransactions(null);
      } catch (error) {
        console.error("Error decoding data:", error);
        setDecodedData(null);
        setDecodedTransactions(null);
      }
    }
    
    return () => {
      // Check if unsubscribe is a function before calling it
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [form]);

  const handleCalculationSubmit = async (e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    
    // Normalize hex inputs before submission
    const formValues = form.getValues();
    
    // Fields that should be normalized
    const hexFields = ['address', 'to', 'data', 'gasToken', 'refundReceiver'];
    
    // Normalize each hex field
    hexFields.forEach(field => {
      const value = formValues[field as keyof FormData] as string;
      if (value && typeof value === 'string' && value.startsWith('0x')) {
        const normalized = normalizeHexString(value);
        if (normalized !== value) {
          console.log(`Normalized ${field} from ${value} to ${normalized}`);
          form.setValue(field as any, normalized);
        }
      }
    });
    
    try {
      await form.handleSubmit(async () => {
        await onSubmit(e);
      })(e);
    } catch (error) {
      console.error("Calculation error:", error);
    }
  };

  const handleImageProcessed = (data: any) => {
    setImageLoading(false);
    
    // Check for reset loading flag
    if (data._resetLoading) {
      return;
    }
    
    // Update form fields based on the extracted data
    if (data.safeAddressInput) {
      form.setValue('safeAddressInput', data.safeAddressInput);
    }
    
    // Update individual fields if they exist in the response
    if (data.to) form.setValue('to', data.to);
    if (data.value) form.setValue('value', data.value);
    if (data.data) {
      const normalizedData = normalizeHexString(data.data);
      form.setValue('data', normalizedData);
      
      // Try to decode the data
      try {
        // First try to decode as multisend
        try {
          const transactions = decodeTransactionData(normalizedData);
          if (transactions.length > 1) {
            // It's a multisend transaction
            setDecodedTransactions(decodeTransactionsRecursively(transactions));
            setDecodedData(null);
            return;
          }
        } catch (error) {
          console.error("Error decoding multisend data:", error);
        }
        
        // If not multisend or multisend decoding failed, try as regular function call
        const decoded = tryDecodeFunctionData(normalizedData);
        setDecodedData(decoded);
        setDecodedTransactions(null);
      } catch (error) {
        console.error("Error decoding data:", error);
        setDecodedData(null);
        setDecodedTransactions(null);
      }
    }
    if (data.operation) form.setValue('operation', data.operation);
    if (data.safeTxGas) form.setValue('safeTxGas', data.safeTxGas);
    if (data.baseGas) form.setValue('baseGas', data.baseGas);
    if (data.gasPrice) form.setValue('gasPrice', data.gasPrice);
    if (data.gasToken) form.setValue('gasToken', data.gasToken);
    if (data.refundReceiver) form.setValue('refundReceiver', data.refundReceiver);
    if (data.nonce) form.setValue('nonce', data.nonce);
    
    // If we have an address in the response, use it
    if (data.address) {
      form.setValue('address', data.address);
    }
  };

  /**
   * Renders a decoded function
   */
  const renderDecodedFunction = (decodedFunction: { name: string; params: Record<string, string>; error?: string } | null) => {
    if (!decodedFunction) return null;
    
    return (
      <div className="mt-2 pl-4 border-l-2 border-gray-200">
        <h6 className="font-medium text-gray-700">Function: {decodedFunction.name}</h6>
        
        {decodedFunction.error ? (
          <p className="text-red-500 mt-1 text-xs">{decodedFunction.error}</p>
        ) : (
          <div className="mt-1">
            <ul className="list-disc list-inside text-xs">
              {Object.entries(decodedFunction.params).map(([key, value]) => (
                <li key={key}>
                  <span className="font-medium">{key}:</span>{' '}
                  <span className="font-mono break-all">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  /**
   * Recursively renders nested transactions
   */
  const renderNestedTransactions = (transactions: DecodedTransactionWithFunction[] | null, level = 0) => {
    if (!transactions || transactions.length === 0) return null;
    
    return (
      <div className={`mt-2 ${level > 0 ? 'pl-4 border-l-2 border-gray-200' : ''}`}>
        {level > 0 && <h6 className="font-medium text-gray-700">Nested Multisend ({transactions.length}):</h6>}
        <div className={`${level > 0 ? 'mt-1' : 'mt-2'} max-h-60 overflow-y-auto`}>
          {transactions.map((tx, index) => (
            <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
              <h5 className="font-medium text-gray-700">Transaction #{index + 1}</h5>
              <ul className="mt-1 space-y-1">
                <li>
                  <span className="font-medium">Operation:</span>{' '}
                  <span className="font-mono">{tx.operation === 0 ? 'Call' : 'DelegateCall'}</span>
                </li>
                <li>
                  <span className="font-medium">To:</span>{' '}
                  <span className="font-mono break-all">{tx.to}</span>
                </li>
                <li>
                  <span className="font-medium">Value:</span>{' '}
                  <span className="font-mono">{tx.value}</span>
                </li>
                <li>
                  <span className="font-medium">Data:</span>{' '}
                  <span className="font-mono break-all">{tx.data.length > 66 
                    ? `${tx.data.slice(0, 30)}...${tx.data.slice(-30)}` 
                    : tx.data}
                  </span>
                  {/* Render decoded function if available */}
                  {tx.decodedFunction && renderDecodedFunction(tx.decodedFunction)}
                </li>
              </ul>
              {/* Render nested transactions if available */}
              {tx.nestedTransactions && renderNestedTransactions(tx.nestedTransactions, level + 1)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleCalculationSubmit} className="space-y-6" role="form">
      {/* Safe Address Input */}
      <div className="mb-4">
        <label htmlFor="safeAddressInput" className="block text-sm font-medium text-gray-700 mb-1">
          Safe Address or URL
        </label>
        <input
          type="text"
          id="safeAddressInput"
          {...form.register("safeAddressInput")}
          className="w-full p-2 border rounded-md"
          placeholder="Enter Safe address or URL"
        />
        <div className="text-xs text-gray-500 mt-1 space-y-1">
          <p>Supported formats:</p>
          <p className="font-mono text-xs break-all">• eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef</p>
          <p className="font-mono text-xs break-all">• https://app.safe.global/home?safe=oeth:0xC58303c5816333EF695D8BCBFA2136Cd79415B1a</p>
          <p className="font-mono text-xs break-all">• https://app.safe.global/transactions/tx?id=multisig_0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef_0xc9704276655e94b56cfaf6285f37cf1c5e0dbab4d890298903960b33e941bed4&safe=eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef</p>
        </div>
        <div className="mt-2">
          <ImageUpload 
            onImageProcessed={handleImageProcessed}
            isLoading={imageLoading}
            setIsLoading={setImageLoading}
            buttonText="Extract from Screenshot"
            loadingText="Extracting..."
            className="text-xs py-1 px-2"
          />
        </div>
      </div>

      {/* Basic Info Fields - Always visible */}
      <div className="space-y-4">
        <div className="mb-4">
          <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-1">
            Network
          </label>
          <select
            id="network"
            {...form.register("network")}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select network</option>
            {NETWORKS.map((network) => (
              <option key={network.value} value={network.value}>
                {network.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="chainId" className="block text-sm font-medium text-gray-700 mb-1">
            Chain ID
          </label>
          <input
            type="number"
            id="chainId"
            {...form.register("chainId", { valueAsNumber: true })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Safe Address
          </label>
          <input
            type="text"
            id="address"
            {...form.register("address")}
            className="w-full p-2 border rounded-md"
            placeholder="0x..."
          />
        </div>

        <div className="mb-4">
          <label htmlFor="nonce" className="block text-sm font-medium text-gray-700 mb-1">
            Nonce
          </label>
          <input
            type="text"
            id="nonce"
            {...form.register("nonce")}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
            Safe Version
          </label>
          <div className="flex items-center">
            <select
              id="version"
              {...form.register("version")}
              className="w-full p-2 border rounded-md"
            >
              <option value="1.4.1">1.4.1</option>
              <option value="1.3.0">1.3.0</option>
              <option value="1.2.0">1.2.0</option>
              <option value="1.1.1">1.1.1</option>
              <option value="1.0.0">1.0.0</option>
              <option value="0.1.0">0.1.0</option>
            </select>
            {form.getValues("address") && (
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  const address = form.getValues("address");
                  const chainId = form.getValues("chainId");
                  const network = form.getValues("network");
                  
                  // Determine the chain prefix based on chainId or network
                  let chainPrefix = "eth"; // Default to Ethereum mainnet
                  
                  if (chainId) {
                    // Map common chain IDs to their prefixes
                    switch (chainId.toString()) {
                      case "1": chainPrefix = "eth"; break;     // Ethereum Mainnet
                      case "5": chainPrefix = "gor"; break;     // Goerli
                      case "10": chainPrefix = "oeth"; break;   // Optimism
                      case "56": chainPrefix = "bnb"; break;    // Binance Smart Chain
                      case "100": chainPrefix = "gno"; break;   // Gnosis Chain
                      case "137": chainPrefix = "matic"; break; // Polygon
                      case "42161": chainPrefix = "arb1"; break; // Arbitrum
                      case "43114": chainPrefix = "avax"; break; // Avalanche
                      case "11155111": chainPrefix = "sep"; break; // Sepolia
                      default: chainPrefix = "eth"; // Default to Ethereum
                    }
                  } else if (network) {
                    // If chainId is not available, try to determine from network
                    switch (network) {
                      case "ethereum": chainPrefix = "eth"; break;
                      case "goerli": chainPrefix = "gor"; break;
                      case "optimism": chainPrefix = "oeth"; break;
                      case "bsc": chainPrefix = "bnb"; break;
                      case "gnosis": chainPrefix = "gno"; break;
                      case "polygon": chainPrefix = "matic"; break;
                      case "arbitrum": chainPrefix = "arb1"; break;
                      case "avalanche": chainPrefix = "avax"; break;
                      case "sepolia": chainPrefix = "sep"; break;
                      default: chainPrefix = "eth"; // Default to Ethereum
                    }
                  }
                  
                  // Construct and open the URL
                  const url = `https://app.safe.global/settings/setup?safe=${chainPrefix}:${address}`;
                  window.open(url, '_blank');
                }}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm flex items-center"
                title="View Safe details on Safe Global"
                data-testid="safe-global-link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="ml-1">Safe Global</span>
              </a>
            )}
          </div>
          {!form.getValues("address") && (
            <p className="text-xs text-gray-500 mt-1">
              Enter a Safe address to view details on Safe Global
            </p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="text"
            id="to"
            {...form.register("to")}
            className="w-full p-2 border rounded-md"
            placeholder="0x..."
          />
        </div>

        <div className="mb-4">
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
            Value (in wei)
          </label>
          <input
            type="text"
            id="value"
            {...form.register("value")}
            className="w-full p-2 border rounded-md"
            placeholder="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
            Data
          </label>
          <textarea
            id="data"
            {...form.register("data")}
            className="w-full p-2 border rounded-md h-24 font-mono text-sm"
            placeholder="0x"
          />
          
          {/* Decoded Data Display */}
          {decodedData && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
              <h4 className="font-medium text-gray-700">Decoded Function:</h4>
              <p className="font-mono">{decodedData.name}</p>
              
              {decodedData.error ? (
                <p className="text-red-500 mt-1">{decodedData.error}</p>
              ) : (
                <div className="mt-2">
                  <h5 className="font-medium text-gray-700">Parameters:</h5>
                  <ul className="list-disc list-inside">
                    {Object.entries(decodedData.params).map(([key, value]) => (
                      <li key={key} className="mt-1">
                        <span className="font-medium">{key}:</span>{' '}
                        <span className="font-mono break-all">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Decoded Multisend Transactions Display */}
          {decodedTransactions && decodedTransactions.length > 0 && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
              <h4 className="font-medium text-gray-700">Multisend Transactions ({decodedTransactions.length}):</h4>
              {renderNestedTransactions(decodedTransactions)}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="operation" className="block text-sm font-medium text-gray-700 mb-1">
            Operation
          </label>
          <select
            id="operation"
            {...form.register("operation")}
            className="w-full p-2 border rounded-md"
          >
            <option value="0">Call (0)</option>
            <option value="1">DelegateCall (1)</option>
          </select>
        </div>

        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="text-lg font-medium">Advanced Parameters</h3>
          
          <div className="mb-4">
            <label htmlFor="safeTxGas" className="block text-sm font-medium text-gray-700 mb-1">
              Safe Tx Gas
            </label>
            <input
              type="text"
              id="safeTxGas"
              {...form.register("safeTxGas")}
              className="w-full p-2 border rounded-md"
              placeholder="0"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="baseGas" className="block text-sm font-medium text-gray-700 mb-1">
              Base Gas
            </label>
            <input
              type="text"
              id="baseGas"
              {...form.register("baseGas")}
              className="w-full p-2 border rounded-md"
              placeholder="0"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="gasPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Gas Price
            </label>
            <input
              type="text"
              id="gasPrice"
              {...form.register("gasPrice")}
              className="w-full p-2 border rounded-md"
              placeholder="0"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="gasToken" className="block text-sm font-medium text-gray-700 mb-1">
              Gas Token
            </label>
            <input
              type="text"
              id="gasToken"
              {...form.register("gasToken")}
              className="w-full p-2 border rounded-md"
              placeholder="0x0000000000000000000000000000000000000000"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="refundReceiver" className="block text-sm font-medium text-gray-700 mb-1">
              Refund Receiver
            </label>
            <input
              type="text"
              id="refundReceiver"
              {...form.register("refundReceiver")}
              className="w-full p-2 border rounded-md"
              placeholder="0x0000000000000000000000000000000000000000"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || imageLoading}
          className={`px-4 py-2 rounded-md ${
            isLoading || imageLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating...
            </span>
          ) : (
            "Calculate Hashes"
          )}
        </button>
      </div>
    </form>
  );
} 
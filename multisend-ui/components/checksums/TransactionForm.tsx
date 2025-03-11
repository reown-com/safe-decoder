'use client';

import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/checksums';
import { NETWORKS } from '@/utils/checksums/constants';
import ImageUpload from '@/components/ImageUpload';
import { 
  tryDecodeFunctionData, 
  decodeTransactionData, 
  DecodedTransaction,
  parseSignTypedDataJson
} from '@/utils/decoder';

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
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonInput, setShowJsonInput] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [customSafeName, setCustomSafeName] = useState<string>('');
  const [customSafeError, setCustomSafeError] = useState<string | null>(null);
  
  // Default known Safe wallets
  const defaultKnownSafes = [
    {
      label: "Select a known Safe wallet",
      value: "",
      network: "",
      chainId: "",
      address: "",
      version: ""
    },
    {
      label: "WCF - OP - Treasury",
      value: "op-wct-treasury",
      network: "optimism",
      chainId: "10",
      address: "0x03296182abE56196472d74947F4b87626b171173",
      version: "1.3.0"
    },
    {
      label: "Reown - OPS - ETH Mainnet",
      value: "reown-ops-eth-mainnet",
      network: "ethereum",
      chainId: "1",
      address: "0x68d1CF9984F31C1Da95D81E4aA094Edf24aB4aB8",
      version: "1.4.1"
    }
  ];

  // State for known Safes (including custom ones)
  const [knownSafes, setKnownSafes] = useState<Array<{
    label: string;
    value: string;
    network: string;
    chainId: string;
    address: string;
    version: string;
    isCustom?: boolean;
  }>>(defaultKnownSafes);

  // State to track the currently selected Safe
  const [selectedSafe, setSelectedSafe] = useState<string>("");

  // Load custom Safes from localStorage on component mount
  React.useEffect(() => {
    try {
      const storedCustomSafes = localStorage.getItem('customSafes');
      if (storedCustomSafes) {
        const customSafes = JSON.parse(storedCustomSafes);
        setKnownSafes([...defaultKnownSafes, ...customSafes]);
      }
    } catch (error) {
      console.error('Error loading custom Safes from localStorage:', error);
    }
  }, []);

  // Handle selection of a known Safe wallet
  const handleKnownSafeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedSafe(selectedValue);
    
    if (!selectedValue) {
      // If the default option is selected, don't update any fields
      return;
    }
    
    const selectedSafeObj = knownSafes.find(safe => safe.value === selectedValue);
    if (!selectedSafeObj) return;
    
    // Update form fields with the selected Safe's details
    form.setValue("network", selectedSafeObj.network);
    form.setValue("chainId", parseInt(selectedSafeObj.chainId));
    form.setValue("address", selectedSafeObj.address);
    form.setValue("version", selectedSafeObj.version);
    
    // Construct and set the Safe address input in the format: eth:0x...
    const networkPrefix = NETWORKS.find(n => n.value === selectedSafeObj.network)?.gnosisPrefix || "eth";
    form.setValue("safeAddressInput", `${networkPrefix}:${selectedSafeObj.address}`);
  };

  // Reset the selected Safe and clear related form fields
  const handleResetSafeSelection = () => {
    setSelectedSafe("");
    form.setValue("network", "");
    form.setValue("chainId", "" as any); // Clear the chainId field
    form.setValue("address", "");
    form.setValue("version", "1.4.1"); // Reset to default version
    form.setValue("safeAddressInput", "");
  };

  // Open the save dialog to save current Safe as a custom Safe
  const handleOpenSaveDialog = () => {
    const address = form.getValues("address");
    const network = form.getValues("network");
    
    if (!address) {
      alert("Please enter a Safe address before saving");
      return;
    }
    
    if (!network) {
      alert("Please select a network before saving");
      return;
    }
    
    // Generate a default name based on the address and network
    const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    const networkName = NETWORKS.find(n => n.value === network)?.label || network;
    setCustomSafeName(`${shortAddress} on ${networkName}`);
    
    setShowSaveDialog(true);
    setCustomSafeError(null);
  };

  // Save the current Safe configuration as a custom Safe
  const handleSaveCustomSafe = () => {
    if (!customSafeName.trim()) {
      setCustomSafeError("Please enter a name for this Safe");
      return;
    }
    
    const address = form.getValues("address");
    const network = form.getValues("network");
    const chainId = form.getValues("chainId")?.toString() || "";
    const version = form.getValues("version") || "1.4.1";
    
    if (!address || !network) {
      setCustomSafeError("Missing required Safe details");
      return;
    }
    
    // Create a unique value for this custom Safe
    const customValue = `custom-${network}-${address.toLowerCase()}`;
    
    // Check if this Safe already exists
    if (knownSafes.some(safe => safe.value === customValue)) {
      setCustomSafeError("This Safe is already saved");
      return;
    }
    
    // Create the new custom Safe
    const newCustomSafe = {
      label: customSafeName,
      value: customValue,
      network,
      chainId,
      address,
      version,
      isCustom: true
    };
    
    // Add to the known Safes list
    const updatedSafes = [...knownSafes, newCustomSafe];
    setKnownSafes(updatedSafes);
    
    // Save to localStorage
    try {
      const customSafes = updatedSafes.filter(safe => safe.isCustom);
      localStorage.setItem('customSafes', JSON.stringify(customSafes));
    } catch (error) {
      console.error('Error saving custom Safes to localStorage:', error);
    }
    
    // Select the newly added Safe
    setSelectedSafe(customValue);
    
    // Close the dialog
    setShowSaveDialog(false);
    setCustomSafeName('');
    setCustomSafeError(null);
  };

  // Remove a custom Safe from the list
  const handleRemoveCustomSafe = (safeValue: string) => {
    if (!confirm("Are you sure you want to remove this Safe from your saved list?")) {
      return;
    }
    
    // Remove from the known Safes list
    const updatedSafes = knownSafes.filter(safe => safe.value !== safeValue);
    setKnownSafes(updatedSafes);
    
    // If the removed Safe was selected, reset the selection
    if (selectedSafe === safeValue) {
      handleResetSafeSelection();
    }
    
    // Save the updated list to localStorage
    try {
      const customSafes = updatedSafes.filter(safe => safe.isCustom);
      localStorage.setItem('customSafes', JSON.stringify(customSafes));
    } catch (error) {
      console.error('Error saving custom Safes to localStorage:', error);
    }
  };
  
  // Sample JSON for the "Load Sample" button
  const sampleJson = `{
  "to": "0xa1dabef33b3b82c7814b6d82a79e50f4ac44102b",
  "value": "0",
  "data": "0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000026400ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000001c44478a9a1c60b4f555aaabc9c510eaf3927071000000000000000000000000000000000000000000000000016345785d8a000000ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000fcffb73c67382ef6f5d5d3ea3d6118020ffc71ae000000000000000000000000000000000000000000000000016345785d8a0000",
  "operation": "1",
  "safeTxGas": "0",
  "baseGas": "0",
  "gasPrice": "0",
  "gasToken": "0x0000000000000000000000000000000000000000",
  "refundReceiver": "0x0000000000000000000000000000000000000000",
  "nonce": "93"
}`;

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

  const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
  };

  const handleParseJson = () => {
    if (!jsonInput.trim()) {
      setJsonError('Please enter JSON data');
      return;
    }

    try {
      // Parse the JSON content
      const parsedData = parseSignTypedDataJson(jsonInput);
      
      if (!parsedData) {
        setJsonError('Failed to parse JSON content. Make sure it contains valid transaction data.');
        return;
      }
      
      // Update form fields with the parsed data
      form.setValue('to', parsedData.to);
      form.setValue('value', parsedData.value);
      form.setValue('data', parsedData.data);
      form.setValue('operation', parsedData.operation);
      form.setValue('safeTxGas', parsedData.safeTxGas);
      form.setValue('baseGas', parsedData.baseGas);
      form.setValue('gasPrice', parsedData.gasPrice);
      form.setValue('gasToken', parsedData.gasToken);
      form.setValue('refundReceiver', parsedData.refundReceiver);
      form.setValue('nonce', parsedData.nonce);
      
      // Update decoded data state
      if (parsedData.decodedTransactions && parsedData.decodedTransactions.length > 0) {
        setDecodedTransactions(decodeTransactionsRecursively(parsedData.decodedTransactions));
        setDecodedData(parsedData.decodedData); // Keep the function data for reference
      } else if (parsedData.decodedData) {
        setDecodedData(parsedData.decodedData);
        setDecodedTransactions(null);
      }
      
      setJsonError(null);
      setShowJsonInput(false); // Hide the JSON input after successful parsing
    } catch (error) {
      console.error('Error parsing JSON:', error);
      setJsonError('Failed to parse JSON content. Please check the format and try again.');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setJsonInput(clipboardText);
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      setJsonError('Failed to read from clipboard. Please paste the content manually.');
    }
  };

  const handleLoadSampleJson = () => {
    setJsonInput(sampleJson);
    setJsonError(null);
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
      {/* Known Safe Wallets Dropdown */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Known Safe Wallets</h3>
          <button
            type="button"
            onClick={handleOpenSaveDialog}
            className="text-sm py-1 px-3 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Save Current Safe
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex-grow">
            <select
              id="knownSafes"
              value={selectedSafe}
              onChange={handleKnownSafeSelect}
              className="w-full p-2 border rounded-md bg-white"
            >
              {knownSafes.map((safe) => (
                <option key={safe.value} value={safe.value}>
                  {safe.label}{safe.network ? ` (${safe.network.charAt(0).toUpperCase() + safe.network.slice(1)})` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedSafe && (
            <button
              type="button"
              onClick={handleResetSafeSelection}
              className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              title="Reset selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {selectedSafe && (
          <div className="mt-3 p-3 bg-white rounded-md border border-gray-200 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {(() => {
                  const safe = knownSafes.find(s => s.value === selectedSafe);
                  if (!safe) return null;
                  
                  // Network icon based on the network
                  let networkColor = "bg-gray-500";
                  if (safe.network === "ethereum") networkColor = "bg-blue-500";
                  if (safe.network === "optimism") networkColor = "bg-red-500";
                  if (safe.network === "polygon") networkColor = "bg-purple-500";
                  if (safe.network === "arbitrum") networkColor = "bg-blue-700";
                  if (safe.network === "gnosis") networkColor = "bg-green-600";
                  
                  return (
                    <>
                      <div className={`w-3 h-3 rounded-full ${networkColor} mr-2`}></div>
                      <span className="font-medium">{safe.label}</span>
                      <span className="ml-2 text-gray-500">({safe.network.charAt(0).toUpperCase() + safe.network.slice(1)})</span>
                    </>
                  );
                })()}
              </div>
              
              {/* Show remove button for custom Safes */}
              {knownSafes.find(s => s.value === selectedSafe)?.isCustom && (
                <button
                  type="button"
                  onClick={() => handleRemoveCustomSafe(selectedSafe)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove this Safe"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Address:</span>
                <div className="font-mono text-xs truncate">{knownSafes.find(s => s.value === selectedSafe)?.address}</div>
              </div>
              <div>
                <span className="text-gray-500">Version:</span>
                <div>{knownSafes.find(s => s.value === selectedSafe)?.version}</div>
              </div>
            </div>
            
            <div className="mt-2">
              <a 
                href={`https://app.safe.global/home?safe=${NETWORKS.find(n => n.value === knownSafes.find(s => s.value === selectedSafe)?.network)?.gnosisPrefix || "eth"}:${knownSafes.find(s => s.value === selectedSafe)?.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Safe Global
              </a>
            </div>
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Select a known Safe wallet to automatically fill in the details
        </p>
      </div>

      {/* Save Custom Safe Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Save Custom Safe</h3>
            
            <div className="mb-4">
              <label htmlFor="customSafeName" className="block text-sm font-medium text-gray-700 mb-1">
                Safe Name
              </label>
              <input
                type="text"
                id="customSafeName"
                value={customSafeName}
                onChange={(e) => setCustomSafeName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter a name for this Safe"
              />
              {customSafeError && (
                <p className="text-red-500 text-xs mt-1">{customSafeError}</p>
              )}
            </div>
            
            <div className="text-sm mb-4">
              <p>The following details will be saved:</p>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li><span className="font-medium">Network:</span> {NETWORKS.find(n => n.value === form.getValues("network"))?.label || form.getValues("network")}</li>
                <li><span className="font-medium">Chain ID:</span> {form.getValues("chainId")}</li>
                <li><span className="font-medium">Address:</span> {form.getValues("address")}</li>
                <li><span className="font-medium">Version:</span> {form.getValues("version")}</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowSaveDialog(false);
                  setCustomSafeName('');
                  setCustomSafeError(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomSafe}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Safe
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Sign Typed Data JSON Input */}
      <div className="mb-6 border-t pt-4">
        <h3 className="text-lg font-medium mb-2">Sign Typed Data JSON</h3>
        <p className="text-sm text-gray-600 mb-2">
          Paste JSON content from a Sign Typed Data transaction to populate the form fields.
        </p>
        
        <div className="flex space-x-2 mb-2">
          <button
            type="button"
            onClick={() => setShowJsonInput(!showJsonInput)}
            className="text-sm py-1 px-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            {showJsonInput ? 'Hide JSON Input' : 'Show JSON Input'}
          </button>
          
          {showJsonInput && (
            <>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="text-sm py-1 px-3 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Paste from Clipboard
              </button>
              <button
                type="button"
                onClick={handleLoadSampleJson}
                className="text-sm py-1 px-3 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                Load Sample JSON
              </button>
            </>
          )}
        </div>
        
        {showJsonInput && (
          <div className="space-y-2">
            <textarea
              className="w-full h-64 p-3 border rounded-md font-mono text-sm"
              placeholder={`Paste your "Sign Typed Data" JSON content here, e.g.:
{
  "to": "0xa1dabef33b3b82c7814b6d82a79e50f4ac44102b",
  "value": "0",
  "data": "0x8d80ff0a...",
  "operation": "1",
  ...
}`}
              value={jsonInput}
              onChange={handleJsonInputChange}
            />
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseJson}
                className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Parse JSON
              </button>
            </div>
            
            {jsonError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md">
                {jsonError}
              </div>
            )}
          </div>
        )}
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
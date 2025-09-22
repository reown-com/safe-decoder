'use client';

import React, { useMemo } from 'react';
import { CalculationResult } from '@/types/checksums';
import { decodeMultiSendTransactions, tryDecodeFunctionData } from '@/utils/decoder';

interface ResultDisplayProps {
  result: CalculationResult;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  const [decodedFunctions, setDecodedFunctions] = React.useState<Array<any>>([]);
  if (result.error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <h3 className="font-medium">Error</h3>
        <p>{result.error}</p>
      </div>
    );
  }

  const decodedData = result.transaction?.data_decoded;

  // Decode nested multiSend transactions if present
  const nestedTransactions = useMemo(() => {
    if (
      decodedData?.method === 'multiSend(bytes)' &&
      decodedData?.parameters?.find(p => p.name === 'transactions')
    ) {
      try {
        const transactionsParam = decodedData.parameters.find(p => p.name === 'transactions');
        if (transactionsParam) {
          const innerData = '0x' + transactionsParam.value;
          return decodeMultiSendTransactions(innerData);
        }
      } catch (error) {
        console.error('Failed to decode nested multiSend transactions:', error);
      }
    }
    return null;
  }, [decodedData]);

  // Decode function data for each nested transaction
  React.useEffect(() => {
    if (nestedTransactions && nestedTransactions.length > 0) {
      Promise.all(
        nestedTransactions.map(tx =>
          tx.data && tx.data !== '0x' ? tryDecodeFunctionData(tx.data) : null
        )
      ).then(decoded => {
        setDecodedFunctions(decoded);
      }).catch(error => {
        console.error('Failed to decode nested transaction functions:', error);
      });
    }
  }, [nestedTransactions]);

  return (
    <div className="space-y-6">
      {/* Network Info */}
      {result.network && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Network</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Name:</div>
            <div>{result.network.name}</div>
            <div className="text-gray-500">Chain ID:</div>
            <div>{result.network.chain_id}</div>
          </div>
        </div>
      )}

      {/* Transaction Info */}
      {result.transaction && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Transaction</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Safe Address:</div>
              <div className="font-mono break-all">{result.transaction.multisig_address}</div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">To:</div>
              <div className="font-mono break-all">{result.transaction.to}</div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Value:</div>
              <div className="font-mono break-all">{result.transaction.value}</div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Data:</div>
              <div className="font-mono break-all overflow-x-auto">
                {result.transaction.data}
              </div>
            </div>
            {decodedData && (
              <div className="grid grid-cols-1 gap-1">
                <div className="text-gray-500">Data Decoded:</div>
                <div className="font-mono">
                  <div>Method: {decodedData.method}</div>
                  {decodedData.signature && (
                    <div className="text-xs text-gray-500">Signature: {decodedData.signature}</div>
                  )}
                  {decodedData.source && (
                    <div className="text-xs text-gray-500">Source: {decodedData.source}</div>
                  )}
                  {decodedData.candidates && decodedData.candidates.length > 1 && (
                    <div className="text-xs text-blue-600">
                      Other matches: {decodedData.candidates.filter(candidate => candidate !== decodedData.method).join(', ')}
                    </div>
                  )}
                  {/* Show nested transactions for multiSend instead of raw parameters */}
                  {nestedTransactions && nestedTransactions.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-gray-500">Nested Transactions ({nestedTransactions.length}):</div>
                      <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                        {nestedTransactions.map((tx, index) => {
                          const decodedFunc = decodedFunctions[index];
                          return (
                            <div key={index} className="bg-gray-100 p-2 rounded text-xs">
                              <div className="font-semibold">Transaction #{index + 1}</div>
                              <div>Operation: {tx.operation === 0 ? 'Call' : 'DelegateCall'}</div>
                              <div>To: {tx.to}</div>
                              <div>Value: {tx.value}</div>
                              {decodedFunc ? (
                                <div className="mt-1">
                                  <div className="text-blue-600">Function: {decodedFunc.name}</div>
                                  {decodedFunc.params && Object.keys(decodedFunc.params).length > 0 && (
                                    <div className="ml-2 mt-1">
                                      {Object.entries(decodedFunc.params).map(([key, value]) => (
                                        <div key={key} className="text-gray-600">
                                          {key}: {String(value).length > 50
                                            ? `${String(value).slice(0, 25)}...${String(value).slice(-10)}`
                                            : String(value)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  Data: {tx.data.length > 66
                                    ? `${tx.data.slice(0, 30)}...${tx.data.slice(-20)}`
                                    : tx.data}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : decodedData.parameters && decodedData.parameters.length > 0 && decodedData.method !== 'multiSend(bytes)' && (
                    <div className="mt-2">
                      <div className="text-gray-500">Parameters:</div>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(decodedData.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hashes */}
      {result.hashes && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium mb-2">Hashes</h3>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Domain Hash:</div>
              <div className="font-mono break-all">{result.hashes.domain_hash}</div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Message Hash:</div>
              <div className="font-mono break-all">{result.hashes.message_hash}</div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              <div className="text-gray-500">Safe Transaction Hash:</div>
              <div className="font-mono break-all">{result.hashes.safe_transaction_hash}</div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const text = JSON.stringify(result, null, 2);
            navigator.clipboard.writeText(text);
            alert('Results copied to clipboard');
          }}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Copy Results
        </button>
      </div>
    </div>
  );
} 

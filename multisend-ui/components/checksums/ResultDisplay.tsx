'use client';

import React from 'react';
import { CalculationResult } from '@/types/checksums';

interface ResultDisplayProps {
  result: CalculationResult;
}

export default function ResultDisplay({ result }: ResultDisplayProps) {
  if (result.error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <h3 className="font-medium">Error</h3>
        <p>{result.error}</p>
      </div>
    );
  }

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
            {result.transaction.data_decoded && (
              <div className="grid grid-cols-1 gap-1">
                <div className="text-gray-500">Data Decoded:</div>
                <div className="font-mono">
                  Method: {result.transaction.data_decoded.method}
                  {result.transaction.data_decoded.parameters && result.transaction.data_decoded.parameters.length > 0 && (
                    <div className="mt-2">
                      <div className="text-gray-500">Parameters:</div>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.transaction.data_decoded.parameters, null, 2)}
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
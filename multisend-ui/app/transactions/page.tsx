'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Update interface to match API response keys
interface TransactionRow {
  // Using index as fallback ID, added during fetch
  txId: string; 
  // Fields returned directly by the API
  walletName: string;
  walletAddress: string;
  isSafe: string; // Keep as string from sheet initially
  network?: string; 
  date?: string;
  currency?: string;
  amount?: string;
  nonce?: number;   
}

export default function TransactionsPage() {
  // State now uses the updated TransactionRow interface
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        // Assume API returns data matching the structure (with maybe some optional fields)
        // Add txId based on index
        const rawData: Omit<TransactionRow, 'txId'>[] = await response.json(); 
        const processedData = rawData.map((row, index) => ({
          ...row,
          txId: index.toString()
        }));
        
        setTransactions(processedData);

      } catch (err) {
        console.error("Error fetching transactions:", err);
        const message = err instanceof Error ? err.message : 'Failed to load transactions.';
        setError(message);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
       <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
        &larr; Back to Parser
      </Link>
      <h1 className="text-3xl font-bold mb-6">Transactions from Google Sheet</h1>

      {isLoading && (
        <div className="text-center py-10">
          <p>Loading transactions...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-600 bg-red-100 border border-red-400 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && transactions.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p>No transactions found.</p>
        </div>
      )}

      {!isLoading && !error && transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left py-3 px-4 font-semibold text-sm">#</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Wallet Name</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Safe?</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Network</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Wallet Address</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Nonce</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.txId} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-xs text-gray-500">{tx.txId}</td>
                  <td className="py-3 px-4">{tx.walletName}</td>
                  <td className="py-3 px-4">{tx.isSafe}</td>
                  <td className="py-3 px-4">{tx.network ?? 'N/A'}</td>
                  <td className="py-3 px-4 font-mono text-xs">{tx.walletAddress ?? 'N/A'}</td>
                  <td className="py-3 px-4">{tx.nonce ?? 'N/A'}</td>
                  <td className="py-3 px-4">
                      <Link 
                        href={`/checksums?network=${encodeURIComponent(tx.network)}&address=${encodeURIComponent(tx.walletAddress)}&nonce=${tx.nonce}`}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        Calculate Checksum
                      </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 
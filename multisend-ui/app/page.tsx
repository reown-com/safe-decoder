'use client';

import React, { useState, useRef } from 'react';
import MultisendForm from '@/components/MultisendForm';
import TransactionList from '@/components/TransactionList';
import JsonDisplay from '@/components/JsonDisplay';
import TabNavigation from '@/components/TabNavigation';
import ImageUpload from '@/components/ImageUpload';
import { decodeTransactionData, DecodedTransaction } from '@/utils/decoder';
import Link from 'next/link';

export default function Home() {
  const [transactions, setTransactions] = useState<DecodedTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [inputData, setInputData] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleParse = (data: string) => {
    try {
      // First, try to parse as JSON (for backward compatibility)
      try {
        const parsedData = JSON.parse(data);
        
        if (Array.isArray(parsedData)) {
          // Direct array of transactions
          setTransactions(parsedData);
          return;
        } else if (parsedData.data) {
          // If the JSON has a 'data' field that contains the multisend data
          setTransactions(decodeTransactionData(parsedData.data));
          return;
        } else if (parsedData.transactions) {
          // If the JSON has a 'transactions' field
          setTransactions(parsedData.transactions);
          return;
        }
      } catch (e) {
        // Not valid JSON, continue to treat as hex data
      }
      
      // Treat as raw transaction data (multisend or regular function call)
      setTransactions(decodeTransactionData(data));
    } catch (error) {
      console.error('Error parsing data:', error);
      setTransactions([]);
    }
  };

  const handleImageProcessed = (data: any) => {
    setIsLoading(false);
    
    // If the data contains the 'data' field, use it
    if (data.data) {
      // Update the input data in the MultisendForm
      setInputData(data.data);
      
      // Parse the data
      handleParse(data.data);
    } else {
      // Otherwise, stringify the entire JSON and use it
      const jsonString = JSON.stringify(data, null, 2);
      setInputData(jsonString);
      handleParse(jsonString);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mt-8 mb-4">Transaction Data Parser</h1>
        <p className="text-gray-600">Decode SafeWallet multisend and regular function calls</p>
        <div className="mt-4 flex justify-center space-x-4">
          <ImageUpload 
            onImageProcessed={handleImageProcessed}
            isLoading={isLoading}
            buttonText="Extract JSON from Screenshot"
          />

          {/* Link to checksums page */}
          <Link 
            href="/checksums" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Calculate Transaction Hashes
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <MultisendForm onParse={handleParse} inputData={inputData} ref={formRef} />
        </div>

        <div>
          <div className="bg-white rounded-lg border p-6 shadow-sm h-full">
            <h2 className="text-2xl font-bold mb-4">Transaction Preview</h2>
            
            {transactions.length > 0 ? (
              <>
                <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
                
                {activeTab === 'list' ? (
                  <TransactionList transactions={transactions} />
                ) : (
                  <JsonDisplay transactions={transactions} />
                )}
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <p>No transactions to preview</p>
                <p className="mt-4 text-sm">
                  Paste transaction data and click "Parse Transactions" to preview, or upload a screenshot
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
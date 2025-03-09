'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTransactionCalculation } from '@/utils/checksums/use-transaction-calculation';
import TransactionForm from '@/components/checksums/TransactionForm';
import ResultDisplay from '@/components/checksums/ResultDisplay';

// Loading component to show while the main component is loading
function ChecksumsLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main component that uses useSearchParams
function ChecksumsContent() {
  const searchParams = useSearchParams();
  const {
    form,
    result,
    isLoading,
    calculationRequested,
    handleSubmit,
  } = useTransactionCalculation(searchParams);

  const [showResult, setShowResult] = useState(false);

  // Update showResult when calculation is completed
  React.useEffect(() => {
    setShowResult(calculationRequested && !isLoading);
  }, [calculationRequested, isLoading]);

  return (
    <div className="min-h-screen">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mt-8 mb-4">Safe Transaction Hash Calculator</h1>
        <p className="text-gray-600">Calculate transaction hashes for Safe multisig transactions</p>
        <div className="mt-4">
          <Link 
            href="/" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Transaction Parser
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Transaction Parameters</h2>
            <TransactionForm 
              form={form}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg border p-6 shadow-sm h-full">
            <h2 className="text-2xl font-bold mb-4">Hash Results</h2>
            
            {showResult && result ? (
              <ResultDisplay result={result} />
            ) : (
              <div className="text-center py-16 text-gray-500">
                <p>No results to display</p>
                <p className="mt-4 text-sm">
                  Fill in the transaction parameters and click "Calculate Hashes" to see results
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the page component with Suspense boundary
export default function ChecksumsPage() {
  return (
    <Suspense fallback={<ChecksumsLoading />}>
      <ChecksumsContent />
    </Suspense>
  );
} 
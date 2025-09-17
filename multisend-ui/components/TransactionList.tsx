import React, { useEffect, useState } from 'react';
import { DecodedTransaction, getOperationName, formatValue, tryDecodeFunctionData, DecodedFunctionData } from '@/utils/decoder';

interface TransactionListProps {
  transactions: DecodedTransaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  const [expandedData, setExpandedData] = useState<Record<number, boolean>>({});
  const [decodedFunctions, setDecodedFunctions] = useState<Array<DecodedFunctionData | null>>([]);

  useEffect(() => {
    let cancelled = false;
    async function decodeAll() {
      try {
        const results = await Promise.all(transactions.map(tx => tryDecodeFunctionData(tx.data)));
        if (!cancelled) {
          setDecodedFunctions(results);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to decode transaction functions:', error);
          setDecodedFunctions(transactions.map(() => null));
        }
      }
    }
    decodeAll();
    return () => {
      cancelled = true;
    };
  }, [transactions]);

  if (transactions.length === 0) {
    return <div className="text-center py-8">No transactions to display</div>;
  }

  const toggleDataExpand = (index: number) => {
    setExpandedData(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Transaction List</h2>
      {transactions.map((tx, index) => {
        const decodedFunction = decodedFunctions[index] || null;
        const isExpanded = expandedData[index] || false;
        
        return (
          <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Transaction {index + 1}</h3>
              <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                {getOperationName(tx.operation)}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">To:</span> 
                <span className="ml-2 font-mono break-all">{tx.to}</span>
              </div>
              
              <div>
                <span className="font-medium">Value:</span> 
                <span className="ml-2">{formatValue(tx.value)}</span>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Data:</span>
                  {tx.data.length > 66 && (
                    <button 
                      onClick={() => toggleDataExpand(index)}
                      className="text-blue-600 text-xs hover:underline"
                    >
                      {isExpanded ? 'Show Less' : 'Show Full Data'}
                    </button>
                  )}
                </div>
                <div className="mt-1 font-mono text-xs break-all bg-gray-50 p-2 rounded">
                  {tx.data.length > 66 && !isExpanded
                    ? `${tx.data.substring(0, 66)}...` 
                    : tx.data}
                </div>
              </div>
              
              {decodedFunction && (
                <div className="md:col-span-2 mt-2 bg-blue-50 p-2 rounded">
                  <div className="font-medium text-blue-700">
                    Function: {decodedFunction.name}
                  </div>

                  {decodedFunction.source === 'openchain' && decodedFunction.candidates && decodedFunction.candidates.length > 1 && (
                    <div className="mt-1 text-xs text-blue-600">
                      Possible matches: {decodedFunction.candidates.filter(candidate => candidate !== decodedFunction.name).join(', ')}
                    </div>
                  )}
                  
                  {decodedFunction.error ? (
                    <div className="mt-1 text-red-600">
                      Error: {decodedFunction.error}
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {Object.entries(decodedFunction.params).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-5">
                          <span className="col-span-1 font-medium">{key}:</span>
                          <span className="col-span-4 font-mono break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList; 

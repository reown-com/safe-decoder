import React from 'react';
import { DecodedTransaction } from '@/utils/decoder';

interface JsonDisplayProps {
  transactions: DecodedTransaction[];
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return null;
  }

  const formattedJson = JSON.stringify(transactions, null, 2);

  return (
    <div className="bg-gray-50 rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">JSON Data</h2>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto text-sm font-mono">
        {formattedJson}
      </pre>
    </div>
  );
};

export default JsonDisplay; 
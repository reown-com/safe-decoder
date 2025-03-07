import React, { useState } from 'react';

interface MultisendFormProps {
  onParse: (data: string) => void;
}

const MultisendForm: React.FC<MultisendFormProps> = ({ onParse }) => {
  const [input, setInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Sample multisend data for the example
  const sampleMultisendData = '0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1';
  
  // Sample regular function call data
  const sampleFunctionData = '0x1e83409a000000000000000000000000aaaabbbb77779900000000000aaaaaa000aaa000';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('Please enter transaction data');
      return;
    }

    // Check if input is a valid hex string (with or without 0x prefix)
    const hexRegex = /^(0x)?[0-9a-fA-F]+$/;
    if (!hexRegex.test(input)) {
      setError('Invalid hex format. Please enter valid transaction data');
      return;
    }

    onParse(input);
  };

  const handleTryMultisendExample = () => {
    setInput(sampleMultisendData);
    setError(null);
  };

  const handleTryFunctionExample = () => {
    setInput(sampleFunctionData);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Transaction Data</h2>
      <p className="text-gray-600 mb-4">
        Paste your SafeWallet multisend data or regular function call data to decode
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <textarea
            className="w-full h-64 p-3 border rounded-md font-mono text-sm"
            placeholder={`Paste transaction data here, e.g.:
0x00ef4461891dfb3ac8572ccf7c794664a8dd9279... (multisend)
0x1e83409a000000000000000000000000... (function call)`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Parse Transactions
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleTryMultisendExample}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Try Multisend Example
            </button>
            <button
              type="button"
              onClick={handleTryFunctionExample}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              Try Function Call Example
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MultisendForm; 
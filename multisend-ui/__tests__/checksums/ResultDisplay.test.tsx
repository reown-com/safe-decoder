import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultDisplay from '@/components/checksums/ResultDisplay';
import { CalculationResult } from '@/types/checksums';
import { decodeMultiSendTransactions, tryDecodeFunctionData } from '@/utils/decoder';

// Mock the decoder functions
jest.mock('@/utils/decoder', () => ({
  decodeMultiSendTransactions: jest.fn(),
  tryDecodeFunctionData: jest.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock window.alert
window.alert = jest.fn();

describe('ResultDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResult: CalculationResult = {
    network: {
      name: 'Ethereum Mainnet',
      chain_id: '1',
    },
    transaction: {
      multisig_address: '0x1234567890123456789012345678901234567890',
      to: '0x0000000000000000000000000000000000000000',
      value: '0',
      data: '0x',
      encoded_message: '0xabcdef',
      data_decoded: {
        method: '0x (ETH Transfer)',
        parameters: [],
      },
    },
    hashes: {
      domain_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      message_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      safe_transaction_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    },
  };

  it('renders the result correctly', () => {
    render(<ResultDisplay result={mockResult} />);
    
    // Check if network info is rendered
    expect(screen.getByText(/Network/i)).toBeInTheDocument();
    expect(screen.getByText(/Ethereum Mainnet/i)).toBeInTheDocument();
    expect(screen.getByText(/Chain ID/i)).toBeInTheDocument();
    
    // Use a more specific selector for the chain ID
    const networkSection = screen.getByText(/Network/i).closest('div');
    expect(networkSection).toHaveTextContent('1');
    
    // Check if transaction info is rendered - use getAllByText for ambiguous text
    const transactionHeadings = screen.getAllByText(/Transaction/i);
    expect(transactionHeadings.length).toBeGreaterThan(0);
    
    // Find the transaction section heading
    const transactionHeading = transactionHeadings.find(
      el => el.tagName.toLowerCase() === 'h3'
    );
    expect(transactionHeading).toBeInTheDocument();
    
    expect(screen.getByText(/Safe Address/i)).toBeInTheDocument();
    expect(screen.getByText('0x1234567890123456789012345678901234567890')).toBeInTheDocument();
    expect(screen.getByText(/To/i)).toBeInTheDocument();
    expect(screen.getByText('0x0000000000000000000000000000000000000000')).toBeInTheDocument();
    expect(screen.getByText(/Value/i)).toBeInTheDocument();
    
    // Use getAllByText for elements that appear multiple times
    const dataElements = screen.getAllByText(/Data/i);
    expect(dataElements.length).toBeGreaterThan(0);
    
    // Check for specific data elements
    expect(screen.getByText('Data:')).toBeInTheDocument();
    expect(screen.getByText('Data Decoded:')).toBeInTheDocument();
    
    expect(screen.getByText(/0x \(ETH Transfer\)/i)).toBeInTheDocument();
    
    // Check if hashes are rendered
    expect(screen.getByText(/Hashes/i)).toBeInTheDocument();
    expect(screen.getByText(/Domain Hash/i)).toBeInTheDocument();
    expect(screen.getByText('0x1111111111111111111111111111111111111111111111111111111111111111')).toBeInTheDocument();
    expect(screen.getByText(/Message Hash/i)).toBeInTheDocument();
    expect(screen.getByText('0x2222222222222222222222222222222222222222222222222222222222222222')).toBeInTheDocument();
    expect(screen.getByText(/Safe Transaction Hash/i)).toBeInTheDocument();
    expect(screen.getByText('0x3333333333333333333333333333333333333333333333333333333333333333')).toBeInTheDocument();
    
    // Check if copy button is rendered
    expect(screen.getByRole('button', { name: /Copy Results/i })).toBeInTheDocument();
  });

  it('renders error message when result has error', () => {
    const errorResult: CalculationResult = {
      error: 'Something went wrong',
    };
    
    render(<ResultDisplay result={errorResult} />);
    
    // Check if error message is rendered
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    
    // Check if other sections are not rendered
    expect(screen.queryByText(/Network/i)).not.toBeInTheDocument();
    expect(screen.queryAllByText(/Transaction/i)).toHaveLength(0);
    expect(screen.queryByText(/Hashes/i)).not.toBeInTheDocument();
  });

  it('copies results to clipboard when copy button is clicked', () => {
    render(<ResultDisplay result={mockResult} />);
    
    // Click the copy button
    fireEvent.click(screen.getByRole('button', { name: /Copy Results/i }));
    
    // Check if clipboard API was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
    
    // Check if alert was shown
    expect(window.alert).toHaveBeenCalledWith('Results copied to clipboard');
  });

  it('renders data_decoded parameters when present', () => {
    const resultWithParams: CalculationResult = {
      ...mockResult,
      transaction: {
        ...mockResult.transaction!,
        data_decoded: {
          method: 'transfer',
          parameters: [
            { name: 'to', type: 'address', value: '0xabcdef' },
            { name: 'value', type: 'uint256', value: '1000000000000000000' },
          ],
        },
      },
    };

    render(<ResultDisplay result={resultWithParams} />);

    // Check if parameters are rendered
    expect(screen.getByText(/Parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/transfer/i)).toBeInTheDocument();
  });

  describe('multiSend transaction decoding', () => {
    const multiSendResult: CalculationResult = {
      network: {
        name: 'Optimism',
        chain_id: '10',
      },
      transaction: {
        multisig_address: '0x398A2749487B2a91f2f543C01F7afD19AEE4b6b0',
        to: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',
        value: '0',
        data: '0x8d80ff0a0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000039600398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000e70a44002f53e5093e6b87eb934032d0e8aa83f5000000000000000000000000000000000000000000000000000000000000000200398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000f292526e0cdb4ab6a6f3616ee3a0a1b4e8c94fd6000000000000000000000000000000000000000000000000000000000000000300398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000d6b4e054c9a2fc21f8b94764df3a7f4cedaa6f3c000000000000000000000000000000000000000000000000000000000000000400398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000a9a6c7986f8e785f8c8067f24c536917a89e04f9000000000000000000000000000000000000000000000000000000000000000500398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f1300000000000000000000000018b8767ef78caf3c72664ce72d8fb5273fe88a8e000000000000000000000000000000000000000000000000000000000000000500398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f1300000000000000000000000093acad1d0c037bfb0302b0394fdc70a04bc40869000000000000000000000000000000000000000000000000000000000000000500000000000000000000',
        encoded_message: '0xabcdef',
        data_decoded: {
          method: 'multiSend(bytes)',
          signature: 'multiSend(bytes)',
          source: 'manual',
          parameters: [
            {
              name: 'transactions',
              value: '00398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000e70a44002f53e5093e6b87eb934032d0e8aa83f5000000000000000000000000000000000000000000000000000000000000000200398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000f292526e0cdb4ab6a6f3616ee3a0a1b4e8c94fd6000000000000000000000000000000000000000000000000000000000000000300398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000d6b4e054c9a2fc21f8b94764df3a7f4cedaa6f3c000000000000000000000000000000000000000000000000000000000000000400398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f13000000000000000000000000a9a6c7986f8e785f8c8067f24c536917a89e04f9000000000000000000000000000000000000000000000000000000000000000500398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f1300000000000000000000000018b8767ef78caf3c72664ce72d8fb5273fe88a8e000000000000000000000000000000000000000000000000000000000000000500398a2749487b2a91f2f543c01f7afd19aee4b6b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440d582f1300000000000000000000000093acad1d0c037bfb0302b0394fdc70a04bc408690000000000000000000000000000000000000000000000000000000000000005',
              type: undefined
            },
            {
              name: 'decodedTransactionsCount',
              value: '6',
              type: undefined
            }
          ]
        }
      },
      hashes: {
        domain_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
        message_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
        safe_transaction_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      },
    };

    it('decodes and displays nested multiSend transactions', async () => {
      // Mock the decoder to return nested transactions
      const mockNestedTransactions = [
        {
          operation: 0,
          to: '0x398a2749487b2a91f2f543c01f7afd19aee4b6b0',
          value: '0',
          dataLength: 68,
          data: '0x0d582f13000000000000000000000000e70a44002f53e5093e6b87eb934032d0e8aa83f50000000000000000000000000000000000000000000000000000000000000002'
        },
        {
          operation: 0,
          to: '0x398a2749487b2a91f2f543c01f7afd19aee4b6b0',
          value: '0',
          dataLength: 68,
          data: '0x0d582f13000000000000000000000000f292526e0cdb4ab6a6f3616ee3a0a1b4e8c94fd60000000000000000000000000000000000000000000000000000000000000003'
        }
      ];

      (decodeMultiSendTransactions as jest.Mock).mockReturnValue(mockNestedTransactions);
      (tryDecodeFunctionData as jest.Mock).mockImplementation((data: string) => {
        if (data.startsWith('0x0d582f13')) {
          return Promise.resolve({
            name: 'removeOwner',
            params: {
              prevOwner: '0x0000000000000000000000000000000000000001',
              owner: data.slice(34, 74),
              _threshold: '2'
            }
          });
        }
        return Promise.resolve(null);
      });

      render(<ResultDisplay result={multiSendResult} />);

      // Wait for async decoding to complete
      await waitFor(() => {
        expect(screen.getByText(/Nested Transactions \(2\)/i)).toBeInTheDocument();
      });

      // Check that nested transactions are displayed
      expect(screen.getByText('Transaction #1')).toBeInTheDocument();
      expect(screen.getByText('Transaction #2')).toBeInTheDocument();

      // Check operation types
      const operationTexts = screen.getAllByText(/Operation:/);
      expect(operationTexts).toHaveLength(2);

      // Check that 'Call' appears for both transactions
      // The text might be part of "Operation: Call"
      const callTexts = screen.getAllByText((content, element) => {
        return element?.textContent === 'Operation: Call';
      });
      expect(callTexts).toHaveLength(2);

      // Check that decoded function names are displayed
      await waitFor(() => {
        const removeOwnerTexts = screen.getAllByText(/removeOwner/);
        expect(removeOwnerTexts).toHaveLength(2);
      });

      // Verify decodeMultiSendTransactions was called with the correct data
      expect(decodeMultiSendTransactions).toHaveBeenCalledWith(
        '0x' + multiSendResult.transaction!.data_decoded!.parameters![0].value
      );
    });

    it('handles multiSend decoding errors gracefully', async () => {
      // Mock decoder to throw an error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      (decodeMultiSendTransactions as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to decode transactions');
      });

      render(<ResultDisplay result={multiSendResult} />);

      // Should still render the basic multiSend info (appears in multiple places)
      const multiSendTexts = screen.getAllByText(/multiSend\(bytes\)/);
      expect(multiSendTexts.length).toBeGreaterThan(0);

      // But should not show nested transactions
      expect(screen.queryByText(/Nested Transactions/)).not.toBeInTheDocument();

      // The error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to decode nested multiSend transactions:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('does not attempt to decode non-multiSend transactions', () => {
      const nonMultiSendResult: CalculationResult = {
        ...mockResult,
        transaction: {
          ...mockResult.transaction!,
          data_decoded: {
            method: 'transfer(address,uint256)',
            parameters: [
              { name: 'to', type: 'address', value: '0xabcdef' },
              { name: 'value', type: 'uint256', value: '1000000000000000000' },
            ],
          },
        },
      };

      render(<ResultDisplay result={nonMultiSendResult} />);

      // Should show parameters normally
      expect(screen.getByText(/Parameters/i)).toBeInTheDocument();

      // Should not attempt to decode multiSend
      expect(decodeMultiSendTransactions).not.toHaveBeenCalled();

      // Should not show nested transactions
      expect(screen.queryByText(/Nested Transactions/)).not.toBeInTheDocument();
    });

    it('displays all 6 nested transactions from the real example', async () => {
      const HEX_PARAM_LENGTH = 64; // Ethereum parameter padding length in hex characters

      // Create 6 mock transactions matching the real data
      const sixTransactions = Array.from({ length: 6 }, (_, i) => ({
        operation: 0,
        to: '0x398a2749487b2a91f2f543c01f7afd19aee4b6b0',
        value: '0',
        dataLength: 68,
        data: `0x0d582f13${i.toString().padStart(HEX_PARAM_LENGTH, '0')}${(i + 2).toString().padStart(HEX_PARAM_LENGTH, '0')}`
      }));

      (decodeMultiSendTransactions as jest.Mock).mockReturnValue(sixTransactions);
      (tryDecodeFunctionData as jest.Mock).mockResolvedValue({
        name: 'removeOwner',
        params: { prevOwner: '0x0001', owner: '0x0002', _threshold: '2' }
      });

      render(<ResultDisplay result={multiSendResult} />);

      await waitFor(() => {
        expect(screen.getByText(/Nested Transactions \(6\)/i)).toBeInTheDocument();
      });

      // Check all 6 transactions are displayed
      for (let i = 1; i <= 6; i++) {
        expect(screen.getByText(`Transaction #${i}`)).toBeInTheDocument();
      }
    });
  });
}); 
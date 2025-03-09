import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResultDisplay from '@/components/checksums/ResultDisplay';
import { CalculationResult } from '@/types/checksums';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock window.alert
window.alert = jest.fn();

describe('ResultDisplay', () => {
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
}); 
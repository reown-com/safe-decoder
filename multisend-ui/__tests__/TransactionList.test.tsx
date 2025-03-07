import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionList from '@/components/TransactionList';
import { DecodedTransaction } from '@/utils/decoder';
import * as decoderUtils from '@/utils/decoder';

// Mock the decoder utils
jest.mock('@/utils/decoder', () => {
  const originalModule = jest.requireActual('@/utils/decoder');
  return {
    ...originalModule,
    tryDecodeFunctionData: jest.fn((data: string) => {
      if (data.startsWith('0x095ea7b3')) {
        return {
          name: 'approve(address,uint256)',
          params: {
            spender: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
            amount: '26436651029164848837793'
          }
        };
      } else if (data.startsWith('0x097cd232')) {
        return {
          name: 'injectReward(uint256,uint256)',
          params: {
            timestamp: '1740614400',
            amount: '26436651029164848837793'
          }
        };
      }
      return null;
    }),
    getOperationName: jest.fn(() => 'Call'),
    formatValue: jest.fn(() => '0.0 ETH')
  };
});

describe('TransactionList', () => {
  const mockTransactions: DecodedTransaction[] = [
    {
      operation: 0,
      to: '0xef4461891dfb3ac8572ccf7c794664a8dd927945',
      value: '0',
      dataLength: 68,
      data: '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
    },
    {
      operation: 0,
      to: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
      value: '0',
      dataLength: 68,
      data: '0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
    }
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the transaction list correctly', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    expect(screen.getByText('Transaction List')).toBeInTheDocument();
    expect(screen.getByText('Transaction 1')).toBeInTheDocument();
    expect(screen.getByText('Transaction 2')).toBeInTheDocument();
    expect(screen.getAllByText('Call').length).toBe(2);
  });

  it('initially shows truncated data for long data strings', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    // Check that the data is truncated
    expect(screen.getAllByText(/0x.*\.\.\./)).toHaveLength(2);
    
    // Check that the "Show Full Data" buttons are present
    expect(screen.getAllByText('Show Full Data').length).toBe(2);
  });

  it('expands data when "Show Full Data" is clicked', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    // Get the "Show Full Data" buttons
    const showFullDataButtons = screen.getAllByText('Show Full Data');
    
    // Click the second button to expand the second transaction's data
    fireEvent.click(showFullDataButtons[1]);
    
    // Check that the button text has changed to "Show Less"
    expect(screen.getByText('Show Less')).toBeInTheDocument();
  });

  it('collapses data when "Show Less" is clicked', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    // Get the "Show Full Data" buttons
    const showFullDataButtons = screen.getAllByText('Show Full Data');
    
    // Click to expand
    fireEvent.click(showFullDataButtons[1]);
    
    // Check that the button text has changed to "Show Less"
    const showLessButton = screen.getByText('Show Less');
    
    // Click to collapse
    fireEvent.click(showLessButton);
    
    // Check that both buttons now say "Show Full Data"
    expect(screen.getAllByText('Show Full Data').length).toBe(2);
  });

  it('displays "No transactions to display" when transactions array is empty', () => {
    render(<TransactionList transactions={[]} />);
    
    expect(screen.getByText('No transactions to display')).toBeInTheDocument();
  });

  it('displays decoded function information', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    // Check that the approve function is decoded correctly
    expect(screen.getByText('Function: approve(address,uint256)')).toBeInTheDocument();
    
    // Check that the injectReward function is decoded correctly
    expect(screen.getByText('Function: injectReward(uint256,uint256)')).toBeInTheDocument();
    
    // Check for parameter labels (using getAllByText since they appear multiple times)
    const timestampLabels = screen.getAllByText(/timestamp/i);
    expect(timestampLabels.length).toBeGreaterThan(0);
    
    const amountLabels = screen.getAllByText(/amount/i);
    expect(amountLabels.length).toBeGreaterThan(0);
  });

  it('displays error message when function decoding fails', () => {
    // Create a new mock implementation for this test
    const errorMockTransactions: DecodedTransaction[] = [
      {
        operation: 0,
        to: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
        value: '0',
        dataLength: 68,
        data: '0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
      }
    ];
    
    // Override the mock for this specific test
    (decoderUtils.tryDecodeFunctionData as jest.Mock).mockReturnValueOnce({
      name: 'injectReward(uint256,uint256)',
      params: {},
      error: 'Failed to decode injectReward function parameters'
    });
    
    render(<TransactionList transactions={errorMockTransactions} />);
    
    // Check that the error message is displayed
    expect(screen.getByText(/Failed to decode injectReward function parameters/)).toBeInTheDocument();
  });
}); 
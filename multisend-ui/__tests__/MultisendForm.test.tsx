import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MultisendForm from '@/components/MultisendForm';

describe('MultisendForm', () => {
  const mockOnParse = jest.fn();

  beforeEach(() => {
    mockOnParse.mockClear();
  });

  it('renders the form correctly', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    expect(screen.getByText('Multisend Metadata')).toBeInTheDocument();
    expect(screen.getByText('Parse Transactions')).toBeInTheDocument();
    expect(screen.getByText('Try Example')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste multisend data here/)).toBeInTheDocument();
  });

  it('calls onParse with valid hex input', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    const validHex = '0x00ef4461891dfb3ac8572ccf7c794664a8dd927945';
    
    const textarea = screen.getByPlaceholderText(/Paste multisend data here/);
    fireEvent.change(textarea, { target: { value: validHex } });
    
    const submitButton = screen.getByText('Parse Transactions');
    fireEvent.click(submitButton);
    
    expect(mockOnParse).toHaveBeenCalledWith(validHex);
  });

  it('shows error message for invalid hex format', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    const invalidHex = 'not a hex string';
    
    const textarea = screen.getByPlaceholderText(/Paste multisend data here/);
    fireEvent.change(textarea, { target: { value: invalidHex } });
    
    const submitButton = screen.getByText('Parse Transactions');
    fireEvent.click(submitButton);
    
    expect(screen.getByText('Invalid hex format. Please enter valid multisend data')).toBeInTheDocument();
    expect(mockOnParse).not.toHaveBeenCalled();
  });

  it('handles the complex multisend data example', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    const complexHex = '0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1';
    
    const textarea = screen.getByPlaceholderText(/Paste multisend data here/);
    fireEvent.change(textarea, { target: { value: complexHex } });
    
    const submitButton = screen.getByText('Parse Transactions');
    fireEvent.click(submitButton);
    
    expect(mockOnParse).toHaveBeenCalledWith(complexHex);
  });

  it('populates the textarea with sample data when "Try Example" is clicked', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    const textarea = screen.getByPlaceholderText(/Paste multisend data here/) as HTMLTextAreaElement;
    expect(textarea).toHaveValue(''); // Initially empty
    
    const tryExampleButton = screen.getByText('Try Example');
    fireEvent.click(tryExampleButton);
    
    // Check that the textarea now contains the sample data (just check that it's not empty)
    expect(textarea).not.toHaveValue('');
    expect(textarea.value.startsWith('0x00ef4461891dfb3ac8572ccf7c794664a8dd927945')).toBe(true);
    
    // Verify that onParse is not called automatically
    expect(mockOnParse).not.toHaveBeenCalled();
  });

  it('clears error message when "Try Example" is clicked', () => {
    render(<MultisendForm onParse={mockOnParse} />);
    
    // First, trigger an error
    const invalidHex = 'not a hex string';
    const textarea = screen.getByPlaceholderText(/Paste multisend data here/);
    fireEvent.change(textarea, { target: { value: invalidHex } });
    
    const submitButton = screen.getByText('Parse Transactions');
    fireEvent.click(submitButton);
    
    // Verify error is shown
    expect(screen.getByText('Invalid hex format. Please enter valid multisend data')).toBeInTheDocument();
    
    // Click "Try Example"
    const tryExampleButton = screen.getByText('Try Example');
    fireEvent.click(tryExampleButton);
    
    // Verify error is cleared
    expect(screen.queryByText('Invalid hex format. Please enter valid multisend data')).not.toBeInTheDocument();
  });
}); 
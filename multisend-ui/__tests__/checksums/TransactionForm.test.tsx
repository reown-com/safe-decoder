import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionForm from '@/components/checksums/TransactionForm';
import { useForm, UseFormReturn } from 'react-hook-form';
import { FormData } from '@/types/checksums';
import { parseSafeAddressInput } from '@/utils/checksums/safeAddressParser';
import { tryDecodeFunctionData, decodeTransactionData } from '@/utils/decoder';

// Mock the safeAddressParser
jest.mock('@/utils/checksums/safeAddressParser', () => ({
  parseSafeAddressInput: jest.fn(),
}));

// Mock the constants
jest.mock('@/utils/checksums/constants', () => ({
  NETWORKS: [
    {
      value: "ethereum",
      label: "Ethereum Mainnet",
      chainId: "1",
      gnosisPrefix: "eth"
    },
    {
      value: "goerli",
      label: "Goerli Testnet",
      chainId: "5",
      gnosisPrefix: "gor"
    }
  ]
}));

// Mock the ImageUpload component
jest.mock('@/components/ImageUpload', () => {
  return {
    __esModule: true,
    default: ({ onImageProcessed, isLoading, buttonText }: any) => (
      <button 
        onClick={() => onImageProcessed({ to: '0x123', value: '100' })}
        disabled={isLoading}
      >
        {isLoading ? 'Extracting...' : buttonText || 'Extract from Screenshot'}
      </button>
    )
  };
});

// Mock the decoder utility
jest.mock('@/utils/decoder', () => {
  const actual = jest.requireActual('@/utils/decoder');
  return {
    ...actual,
    tryDecodeFunctionData: jest.fn(async (data: string) => {
    if (data === '0x1e83409a000000000000000000000000073eaa4947cf98b7cc3042e11128703207ec5a6f2') {
      return {
        name: 'testFunction(address)',
        params: {
          recipient: '0x073eaa4947cf98b7cc3042e11128703207ec5a6f2'
        }
      };
    }
    // For the nested transaction data
    if (data === '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1') {
      return {
        name: 'approve(address,uint256)',
        params: {
          spender: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
          amount: '1688849860263564321'
        }
      };
    }
    if (data === '0x097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1') {
      return {
        name: 'injectReward(uint256,uint256)',
        params: {
          timestamp: '6815659',
          amount: '1688849860263564321'
        }
      };
    }
      return null;
    }),
    decodeTransactionData: jest.fn(async (data: string) => {
    if (data === '0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a100f368f535e329c6d08dff0d4b2da961c4e7f3fcaf00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044097cd2320000000000000000000000000000000000000000000000000000000067bfab00000000000000000000000000000000000000000000000599223bbba52fcbf4a1') {
      return [
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
    }
    // Add a test case for nested multisend
    if (data === '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1') {
      // This is just a mock to test the recursive functionality
      // In a real scenario, this wouldn't be a multisend transaction
      return [
        {
          operation: 0,
          to: '0x1111111111111111111111111111111111111111',
          value: '0',
          dataLength: 4,
          data: '0x12345678'
        },
        {
          operation: 0,
          to: '0x2222222222222222222222222222222222222222',
          value: '0',
          dataLength: 4,
          data: '0x87654321'
        }
      ];
    }
      return [];
    })
  };
});

// Create a wrapper component to provide the form context
const FormWrapper = ({ 
  onSubmit = jest.fn().mockImplementation(() => Promise.resolve()),
  isLoading = false,
  form: customForm,
}: {
  onSubmit?: jest.Mock;
  isLoading?: boolean;
  form?: UseFormReturn<FormData>;
}) => {
  const defaultForm = useForm<FormData>({
    defaultValues: {
      safeAddressInput: "",
      method: "direct",
      network: "ethereum",
      chainId: 1,
      address: "0x1234567890123456789012345678901234567890",
      nonce: "0",
      to: "0x0000000000000000000000000000000000000000",
      value: "0",
      data: "0x",
      operation: "0",
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: "0x0000000000000000000000000000000000000000",
      refundReceiver: "0x0000000000000000000000000000000000000000",
      version: "1.3.0"
    }
  });

  const form = customForm || defaultForm;

  return (
    <TransactionForm
      form={form}
      onSubmit={onSubmit}
      isLoading={isLoading}
    />
  );
};

describe('TransactionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form correctly', () => {
    render(<FormWrapper />);
    
    // Check if basic fields are rendered
    expect(screen.getByLabelText(/Safe Address or URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Network/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Chain ID/i)).toBeInTheDocument();
    
    // Use getAllByLabelText for Safe Address since it appears multiple times
    const safeAddressLabels = screen.getAllByLabelText(/Safe Address/i);
    expect(safeAddressLabels.length).toBeGreaterThan(0);
    
    expect(screen.getByLabelText(/Nonce/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safe Version/i)).toBeInTheDocument();
    
    // Transaction details should be visible
    // Use getAllByLabelText for fields that might appear multiple times
    const toLabels = screen.getAllByLabelText(/^To$/i);
    expect(toLabels.length).toBeGreaterThan(0);
    
    expect(screen.getByLabelText(/Value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Data/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Operation/i)).toBeInTheDocument();
    
    // Advanced parameters should be visible
    expect(screen.getByText(/Advanced Parameters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Safe Tx Gas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Base Gas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gas Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gas Token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Refund Receiver/i)).toBeInTheDocument();
  });

  it('shows example formats for Safe address input', () => {
    render(<FormWrapper />);
    
    // Check if example formats are displayed
    expect(screen.getByText(/Supported formats:/i)).toBeInTheDocument();
    
    // Use getAllByText for elements that appear in multiple places
    const ethAddressElements = screen.getAllByText(/eth:0xC71605Ab3ea0E614a1e2E11B77e353ee964A44Ef/i);
    expect(ethAddressElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText(/https:\/\/app.safe.global\/home\?safe=oeth:/i)).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', async () => {
    const mockOnSubmit = jest.fn().mockImplementation(() => Promise.resolve());
    render(<FormWrapper onSubmit={mockOnSubmit} />);
    
    // Submit the form
    await waitFor(() => {
      fireEvent.submit(screen.getByRole('form'));
    });
    
    // Check if onSubmit was called
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('shows loading state when isLoading is true', () => {
    render(<FormWrapper isLoading={true} />);
    
    // Check if the button shows loading state
    expect(screen.getByText(/Calculating.../i)).toBeInTheDocument();
    // Find the submit button by its text content
    const submitButton = screen.getByText(/Calculating.../i).closest('button');
    expect(submitButton).toHaveClass('bg-gray-300');
  });

  it('shows "Calculate Hashes" button text when not loading', () => {
    render(<FormWrapper isLoading={false} />);
    
    // Check if the button text is "Calculate Hashes"
    expect(screen.getByRole('button', { name: /Calculate Hashes/i })).toBeInTheDocument();
    // Find the submit button by its text content
    const submitButton = screen.getByText(/Calculate Hashes/i).closest('button');
    expect(submitButton).toHaveClass('bg-blue-600');
  });

  it('updates form values when image is processed', () => {
    const mockSetValue = jest.fn();
    
    // Create a mock form object without using hooks
    const mockForm = {
      register: () => ({}),
      handleSubmit: () => jest.fn(),
      watch: () => ({ unsubscribe: jest.fn() }),
      setValue: mockSetValue,
      getValues: () => ({}),
      reset: jest.fn(),
      control: { register: jest.fn() },
      formState: { errors: {} },
    } as unknown as UseFormReturn<FormData>;
    
    render(
      <FormWrapper 
        form={mockForm}
      />
    );
    
    // Find and click the image upload button
    const uploadButton = screen.getByRole('button', { name: /Extract from Screenshot/i });
    fireEvent.click(uploadButton);
    
    // Check if setValue was called with the mock data
    expect(mockSetValue).toHaveBeenCalledWith('to', '0x123');
    expect(mockSetValue).toHaveBeenCalledWith('value', '100');
  });

  it('displays decoded multisend data with nested function calls', async () => {
    // Create a simplified mock for decodeTransactionData
    const mockDecodeTransactionData = jest.fn().mockResolvedValue([
      {
        operation: 0,
        to: '0xef4461891dfb3ac8572ccf7c794664a8dd927945',
        value: '0',
        dataLength: 68,
        data: '0x095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
      }
    ]);
    
    // Override the mock implementation for this test
    (decodeTransactionData as jest.Mock).mockImplementation(mockDecodeTransactionData);
    
    // Create a simplified mock for tryDecodeFunctionData
    (tryDecodeFunctionData as jest.Mock).mockImplementation(async (data) => {
      return {
        name: 'approve(address,uint256)',
        params: {
          spender: '0xf368f535e329c6d08dff0d4b2da961c4e7f3fcaf',
          amount: '1688849860263564321'
        }
      };
    });
    
    // Create a component with the multisend data
    render(
      <TransactionForm
        form={{
          register: () => ({}),
          handleSubmit: jest.fn(),
          watch: (field: string) => {
            if (field === 'data') {
              return {
                unsubscribe: jest.fn()
              };
            }
            return jest.fn();
          },
          setValue: jest.fn(),
          getValues: () => ({ 
            data: '0x00ef4461891dfb3ac8572ccf7c794664a8dd92794500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000f368f535e329c6d08dff0d4b2da961c4e7f3fcaf000000000000000000000000000000000000000000000599223bbba52fcbf4a1'
          }),
          reset: jest.fn(),
          control: { register: jest.fn() },
          formState: { errors: {} },
        } as unknown as UseFormReturn<FormData>}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );
    
    // We're just verifying that the component renders without errors
    // The actual decoding functionality is tested in decoder.test.ts
    await waitFor(() => expect(decodeTransactionData).toHaveBeenCalled());
  });

  it('shows Safe Global link only when address is provided', () => {
    // Mock window.open
    const originalOpen = window.open;
    window.open = jest.fn();
    
    // Create a mock form with getValues that returns different values based on the key
    const mockGetValues = jest.fn();
    
    // First test: No address provided
    mockGetValues.mockImplementation((key) => {
      if (key === 'address') return '';
      if (key === 'chainId') return 10;
      if (key === 'network') return 'optimism';
      return '';
    });
    
    // Render the component with no address
    const { container, rerender } = render(
      <TransactionForm
        form={{
          register: () => ({}),
          handleSubmit: jest.fn(),
          watch: () => ({ unsubscribe: jest.fn() }),
          setValue: jest.fn(),
          getValues: mockGetValues,
          reset: jest.fn(),
          control: { register: jest.fn() },
          formState: { errors: {} },
        } as unknown as UseFormReturn<FormData>}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );
    
    // Link should not be present
    const link = container.querySelector('[data-testid="safe-global-link"]');
    expect(link).not.toBeInTheDocument();
    
    // Hint should be present
    expect(container.textContent).toContain('Enter a Safe address to view details on Safe Global');
    
    // Now update the mock to return an address
    mockGetValues.mockImplementation((key) => {
      if (key === 'address') return '0xC58303c5816333EF695D8BCBFA2136Cd79415B1a';
      if (key === 'chainId') return 10;
      if (key === 'network') return 'optimism';
      return '';
    });
    
    // Re-render with address
    rerender(
      <TransactionForm
        form={{
          register: () => ({}),
          handleSubmit: jest.fn(),
          watch: () => ({ unsubscribe: jest.fn() }),
          setValue: jest.fn(),
          getValues: mockGetValues,
          reset: jest.fn(),
          control: { register: jest.fn() },
          formState: { errors: {} },
        } as unknown as UseFormReturn<FormData>}
        onSubmit={jest.fn()}
        isLoading={false}
      />
    );
    
    // Link should now be present
    const linkAfterRerender = container.querySelector('[data-testid="safe-global-link"]');
    expect(linkAfterRerender).toBeInTheDocument();
    
    // Hint should not be present
    expect(container.textContent).not.toContain('Enter a Safe address to view details on Safe Global');
    
    // Click the link and check if window.open was called with the correct URL
    fireEvent.click(linkAfterRerender!);
    expect(window.open).toHaveBeenCalledWith(
      'https://app.safe.global/settings/setup?safe=oeth:0xC58303c5816333EF695D8BCBFA2136Cd79415B1a',
      '_blank'
    );
    
    // Restore original window.open
    window.open = originalOpen;
  });
}); 

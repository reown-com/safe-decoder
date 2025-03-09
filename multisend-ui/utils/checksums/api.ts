import { TransactionParams } from '@/types/checksums';

export async function fetchTransactionDataFromApi(
  network: string,
  address: string,
  nonce: string
): Promise<TransactionParams> {
  try {
    // Construct the API URL
    const baseUrl = "https://safe-transaction-mainnet.safe.global";
    const url = `${baseUrl}/api/v1/safes/${address}/multisig-transactions/?nonce=${nonce}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`No transaction found with nonce ${nonce}`);
    }
    
    const tx = data.results[0];
    
    return {
      to: tx.to,
      value: tx.value,
      data: tx.data || "0x",
      operation: tx.operation.toString(),
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      gasPrice: tx.gasPrice,
      gasToken: tx.gasToken,
      refundReceiver: tx.refundReceiver,
      nonce: tx.nonce.toString(),
      version: "1.3.0", // Default to latest version
      dataDecoded: tx.dataDecoded,
      signatures: tx.confirmations?.length > 0 
        ? tx.confirmations.map((c: any) => c.signature).join('') 
        : "0x"
    };
  } catch (error) {
    console.error("Error fetching transaction data:", error);
    throw error;
  }
} 
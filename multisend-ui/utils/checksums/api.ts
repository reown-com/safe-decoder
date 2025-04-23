import { NETWORKS, findNetworkByValue } from "./constants";
import { TransactionParams } from "@/types/checksums";

export async function fetchTransactionDataFromApi(
  networkValue: string,
  safeAddress: string,
  nonce: string
): Promise<TransactionParams> {
  const network = findNetworkByValue(networkValue);
  if (!network || !network.safeServiceUrl) {
    throw new Error(`Safe Transaction Service URL not configured for network: ${networkValue}`);
  }

  // Switch to multisig-transactions endpoint
  const txListApiUrl = `${network.safeServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/?executed=false&limit=20`; 
  // Endpoint for general Safe info (contains version)
  const safeInfoApiUrl = `${network.safeServiceUrl}/api/v1/safes/${safeAddress}/`;

  console.log(`Fetching TX List from Safe Service: ${txListApiUrl}`);
  console.log(`Fetching Safe Info from Safe Service: ${safeInfoApiUrl}`);

  try {
    // Fetch TX List and Safe Info concurrently
    const [txListResponse, safeInfoResponse] = await Promise.all([
      fetch(txListApiUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(safeInfoApiUrl, { headers: { 'Accept': 'application/json' } })
    ]);

    // --- Process TX List Response ---
    if (!txListResponse.ok) {
      if (txListResponse.status === 404) {
          throw new Error(`Multisig transactions not found for Safe ${safeAddress} on ${network.label}. (Is it a Safe?)`);
      }
      throw new Error(`TX List API request failed: ${txListResponse.status} ${txListResponse.statusText}`);
    }
    const txListData = await txListResponse.json();
    const transaction = txListData?.results?.find((tx: any) => tx.nonce?.toString() === nonce);
    if (!transaction) {
        console.error("Did not find nonce in TX list results: ", txListData);
        throw new Error(`Transaction with nonce ${nonce} not found in first page of multisig transactions for Safe ${safeAddress}.`);
    }
    console.log("Found Transaction: ", transaction);

    // --- Process Safe Info Response ---
    let safeVersion = '1.3.0'; // Default version
    if (safeInfoResponse.ok) {
        const safeInfoData = await safeInfoResponse.json();
        if (safeInfoData?.version) {
            safeVersion = safeInfoData.version;
            console.log("Found Safe Version: ", safeVersion);
        } else {
            console.warn("Safe version not found in Safe Info response:", safeInfoData);
        }
    } else {
         console.warn(`Safe Info API request failed: ${safeInfoResponse.status} ${safeInfoResponse.statusText}. Using default version ${safeVersion}.`);
    }

    // Map the API response fields, using the fetched version
    const txParams: TransactionParams = {
      to: transaction.to || "",
      value: transaction.value || "0",
      data: transaction.data || "0x",
      operation: transaction.operation?.toString() || "0",
      safeTxGas: transaction.safeTxGas?.toString() || "0",
      baseGas: transaction.baseGas?.toString() || "0",
      gasPrice: transaction.gasPrice?.toString() || "0",
      gasToken: transaction.gasToken || "0x0000000000000000000000000000000000000000",
      refundReceiver: transaction.refundReceiver || "0x0000000000000000000000000000000000000000",
      nonce: transaction.nonce?.toString() || nonce, 
      version: safeVersion, // Use the fetched or default version
      dataDecoded: transaction.dataDecoded || null,
    };

    return txParams;
  } catch (error) {
    console.error("Error fetching transaction data from Safe Service:", error);
    // Re-throw the error to be caught by the calling hook
    throw error;
  }
} 
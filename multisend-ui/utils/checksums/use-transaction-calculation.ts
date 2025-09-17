import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ReadonlyURLSearchParams } from "next/navigation";
import { NETWORKS } from "./constants";
import { calculateHashes } from "./safeHashesCalculator";
import { fetchTransactionDataFromApi } from "./api";
import { FormData, CalculationResult, TransactionParams } from "@/types/checksums";
import { parseSafeAddressInput } from "./safeAddressParser";

// Helper function to find network configuration based on various inputs
function findNetworkConfig(networkInput: string | null): typeof NETWORKS[0] | undefined {
  if (!networkInput) return undefined;
  const lowerInput = networkInput.toLowerCase().trim();
  // Prioritize matching 'value' (e.g., 'ethereum', 'sepolia')
  let network = NETWORKS.find(n => n.value === lowerInput);
  // Fallback to matching gnosisPrefix (e.g., 'eth', 'sep')
  if (!network) {
    network = NETWORKS.find(n => n.gnosisPrefix.toLowerCase() === lowerInput);
  }
  // Fallback to matching label (e.g., 'Ethereum Mainnet') - use includes for flexibility
  if (!network) {
    network = NETWORKS.find(n => n.label.toLowerCase().includes(lowerInput)); 
  }
   // Specific fallback for ETH -> ethereum (mainnet)
  if (!network && lowerInput === 'eth') {
    network = NETWORKS.find(n => n.value === 'ethereum');
  }
  return network;
}

export function useTransactionCalculation(searchParams: ReadonlyURLSearchParams) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calculationRequested, setCalculationRequested] = useState(false);
  const initialParamsLoaded = useRef(false); 
  const [isApiFetching, setIsApiFetching] = useState(false);

  // --- Parameter Extraction Logic (Revised) ---
  const networkParam = searchParams.get("network");
  const addressParam = searchParams.get("address") || "";
  const nonceParam = searchParams.get("nonce") || ""; 
  const safeAddressParam = searchParams.get("safeAddress") || "";
  const amountParam = searchParams.get("amount") || "0";
  const recipientParam = searchParams.get("recipient") || "0x0000000000000000000000000000000000000000";
  const currencyParam = searchParams.get("currency") || "";

  let initialFoundNetwork = findNetworkConfig(networkParam);
  let initialDerivedAddress = addressParam;
  
  if ((!initialFoundNetwork || !initialDerivedAddress) && safeAddressParam) {
    const parsedFromSafeAddr = parseSafeAddressInput(safeAddressParam);
    if (parsedFromSafeAddr) {
      if (!initialFoundNetwork) {
        initialFoundNetwork = findNetworkConfig(parsedFromSafeAddr.network); 
      }
      initialDerivedAddress = initialDerivedAddress || parsedFromSafeAddr.address;
    }
  }
  
  const initialDerivedNetworkValue = initialFoundNetwork?.value || "";
  const initialDerivedChainId = initialFoundNetwork?.chainId || "";
  const initialSafeAddressInput = safeAddressParam || (initialFoundNetwork?.gnosisPrefix && initialDerivedAddress ? `${initialFoundNetwork.gnosisPrefix}:${initialDerivedAddress}` : "");
  const initialMethod: 'api' | 'direct' = (initialDerivedNetworkValue && initialDerivedAddress && nonceParam) ? "api" : "direct";
  // --- End Parameter Extraction ---

  const form = useForm<FormData>({
    defaultValues: {
      safeAddressInput: initialSafeAddressInput,
      method: initialMethod, 
      network: initialDerivedNetworkValue, 
      chainId: Number(initialDerivedChainId) || 0,
      address: initialDerivedAddress,
      nonce: nonceParam,
      value: amountParam, 
      to: recipientParam, 
      version: "1.3.0", // Default version
      data: "0x",
      operation: "0",
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: "0x0000000000000000000000000000000000000000",
      refundReceiver: "0x0000000000000000000000000000000000000000",
    },
  });

  // Define fetch function separately
  const fetchFromApiAndSetForm = useCallback(async () => {
    // Log when function is called
    console.log("[fetchFromApiAndSetForm] Triggered!");
    const data = form.getValues();
    // Log values being checked
    console.log("[fetchFromApiAndSetForm] Checking data:", { network: data.network, address: data.address, nonce: data.nonce });
    
    if (!data.network || !data.address || !data.nonce) {
      console.log("[fetchFromApiAndSetForm] Missing required data.");
      form.setError("apiError", { type: "manual", message: "Network, Safe Address, and Nonce are required to fetch data." });
      return;
    }
    
    setIsApiFetching(true);
    form.clearErrors("apiError");
    let txParams: TransactionParams | null = null;
    let apiError: string | null = null;

    try {
      console.log("Manually fetching from Safe Service...");
      txParams = await fetchTransactionDataFromApi(
        data.network,
        data.address,
        data.nonce
      );
      console.log("Fetched txParams:", txParams);
      // Update form fields after fetch
      form.setValue("to", txParams.to);
      form.setValue("value", txParams.value);
      form.setValue("data", txParams.data || "0x");
      form.setValue("operation", txParams.operation.toString());
      form.setValue("safeTxGas", txParams.safeTxGas);
      form.setValue("baseGas", txParams.baseGas);
      form.setValue("gasPrice", txParams.gasPrice);
      form.setValue("gasToken", txParams.gasToken);
      form.setValue("refundReceiver", txParams.refundReceiver);
      if (txParams.nonce) form.setValue("nonce", txParams.nonce);
      if (txParams.version && txParams.version !== 'unknown') form.setValue("version", txParams.version);
      // Set method to direct after successful fetch, as data is now populated
      form.setValue("method", "direct"); 
    } catch (error: any) {
      console.error("API Fetch Error:", error);
      apiError = error.message || "Failed to fetch data from Safe Service.";
      if (apiError) form.setError("apiError", { type: "manual", message: apiError });
    } finally {
      setIsApiFetching(false);
    }
  }, [form]); // Dependencies: form hook

  // Define handleSubmit using useCallback
  const handleSubmitCallback = useCallback(async (data: FormData) => {
    // Now this function ONLY calculates hashes using provided data
    setIsLoading(true);
    setResult(null);
    setCalculationRequested(true);
    // Don't clear API error here, it's handled by fetch function

    try {
      // Always use current form data for calculation
      const paramsToUse = { 
          to: data.to,
          value: data.value,
          data: data.data,
          operation: data.operation,
          safeTxGas: data.safeTxGas,
          baseGas: data.baseGas,
          gasPrice: data.gasPrice,
          gasToken: data.gasToken,
          refundReceiver: data.refundReceiver,
          nonce: data.nonce,
          version: data.version, 
          dataDecoded: null // We don't have dataDecoded unless API was called before
      }; 
      console.log("Calculating hashes with:", paramsToUse);
      const { domainHash, messageHash, safeTxHash, encodedMessage } = await calculateHashes(
        data.chainId.toString(),
        data.address,
        paramsToUse.to,
        paramsToUse.value,
        paramsToUse.data,
        paramsToUse.operation.toString(), // Ensure operation is string
        paramsToUse.safeTxGas,
        paramsToUse.baseGas,
        paramsToUse.gasPrice,
        paramsToUse.gasToken,
        paramsToUse.refundReceiver,
        paramsToUse.nonce,
        paramsToUse.version 
      );
      setResult({ 
         network: {
            name: NETWORKS.find(n => n.value === data.network)?.label || data.network,
            chain_id: data.chainId.toString(),
          },
          transaction: {
            multisig_address: data.address,
            to: paramsToUse.to,
            value: paramsToUse.value,
            data: paramsToUse.data,
            encoded_message: encodedMessage,
            data_decoded: paramsToUse.dataDecoded || {
                method: paramsToUse.data === "0x" ? "0x (ETH Transfer)" : "Unknown",
                parameters: []
            }
          },
          hashes: {
            domain_hash: domainHash,
            message_hash: messageHash,
            safe_transaction_hash: safeTxHash,
          }
      });
    } catch (error: any) { 
        console.error("Calculation Error:", error);
        setResult({ error: error.message || "Hash calculation failed." });
    } finally {
      setIsLoading(false);
    }
  }, [form, setResult, setIsLoading, setCalculationRequested]); // Removed API fetch logic dependencies

  // Effect to reset form when searchParams change
  useEffect(() => {
    const currentNetworkParam = searchParams.get("network");
    const currentAddress = searchParams.get("address") || "";
    const currentNonce = searchParams.get("nonce") || ""; 
    const currentSafeAddress = searchParams.get("safeAddress") || "";
    // Read current amount/recipient params
    const currentAmount = searchParams.get("amount") || "0";
    const currentRecipient = searchParams.get("recipient") || "0x0000000000000000000000000000000000000000";
    const currentCurrency = searchParams.get("currency") || "";

    let networkToSet = findNetworkConfig(currentNetworkParam);
    let addressToSet = currentAddress;
    
    if ((!networkToSet || !addressToSet) && currentSafeAddress) {
       const parsed = parseSafeAddressInput(currentSafeAddress);
       if (parsed) {
         if (!networkToSet) {
            networkToSet = findNetworkConfig(parsed.network); 
         }
         addressToSet = addressToSet || parsed.address;
       }
    }

    const chainIdToSet = networkToSet?.chainId || "";
    const safeAddressInputToSet = currentSafeAddress || (networkToSet?.gnosisPrefix && addressToSet ? `${networkToSet.gnosisPrefix}:${addressToSet}` : "");
    const methodToSet: 'api' | 'direct' = (networkToSet && addressToSet && currentNonce) ? "api" : "direct";

    const currentFormValues = form.getValues();
    const needsReset = 
      currentFormValues.network !== (networkToSet?.value || "") ||
      currentFormValues.address !== addressToSet ||
      currentFormValues.nonce !== currentNonce ||
      currentFormValues.safeAddressInput !== safeAddressInputToSet ||
      currentFormValues.method !== methodToSet ||
      currentFormValues.value !== currentAmount ||
      currentFormValues.to !== currentRecipient;

    if (needsReset) {
        console.log("Resetting form based on searchParams change.");
        form.reset({
          safeAddressInput: safeAddressInputToSet,
          method: methodToSet,
          network: networkToSet?.value || "", 
          chainId: Number(chainIdToSet) || 0,
          address: addressToSet,
          nonce: currentNonce,
          version: "1.3.0", // Reset version to default
          value: currentAmount,
          to: currentRecipient,
          data: "0x",
          operation: "0",
          safeTxGas: "0",
          baseGas: "0",
          gasPrice: "0",
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
        });
    }
    
    if (!initialParamsLoaded.current) {
      initialParamsLoaded.current = true;
    }

    // Clear API fetching state on param change
    setIsApiFetching(false);
  }, [searchParams, form]);

  // Handle Safe address input changes manually (if needed)
  const handleSafeAddressInputChange = (input: string) => {
    const parsedAddress = parseSafeAddressInput(input);
    if (parsedAddress) {
      const foundNetwork = findNetworkConfig(parsedAddress.network);
      form.setValue("address", parsedAddress.address);
      if (foundNetwork) {
        form.setValue("network", foundNetwork.value);
        form.setValue("chainId", Number(foundNetwork.chainId));
      }
      // Optionally switch to API mode if txHash is parsed?
      // if (parsedAddress.txHash) {
      //   form.setValue("method", "api");
      // }
    }
  };

  // Watch for changes to safeAddressInput to auto-parse
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "safeAddressInput") {
        handleSafeAddressInputChange(value.safeAddressInput || "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  return {
    form,
    result,
    isLoading,
    isApiFetching, // Expose API fetching state
    calculationRequested,
    handleSubmit: form.handleSubmit(handleSubmitCallback),
    triggerApiFetch: fetchFromApiAndSetForm, // Expose the manual fetch trigger
    // Use the state derived during initial load for returning values if needed elsewhere
    safeAddress: initialSafeAddressInput,
    network: initialDerivedNetworkValue,
    chainId: Number(initialDerivedChainId) || 0,
    address: initialDerivedAddress,
    nonce: nonceParam,
    initialAmountParam: amountParam,
    initialRecipientParam: recipientParam,
    handleSafeAddressInputChange 
  };
} 

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ReadonlyURLSearchParams } from "next/navigation";
import { NETWORKS } from "./constants";
import { calculateHashes } from "./safeHashesCalculator";
import { fetchTransactionDataFromApi } from "./api";
import { FormData, CalculationResult, TransactionParams } from "@/types/checksums";
import { decodeTransactionData } from "@/utils/decoder";
import { parseSafeAddressInput } from "./safeAddressParser";

export function useTransactionCalculation(searchParams: ReadonlyURLSearchParams) {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calculationRequested, setCalculationRequested] = useState(false);
  const initialParamsLoaded = useRef(false); // Track if initial params have been processed

  // --- Parameter Extraction Logic ---
  // Prioritize direct params, fall back to safeAddress
  const initialNetwork = searchParams.get("network") || "";
  const initialAddress = searchParams.get("address") || "";
  const initialNonce = searchParams.get("nonce") || "";
  const initialSafeAddress = searchParams.get("safeAddress") || "";
  
  let derivedNetwork = initialNetwork;
  let derivedAddress = initialAddress;
  let derivedChainId = "";

  if (!derivedNetwork || !derivedAddress) {
    // If direct params missing, try parsing safeAddress
    const parsedFromSafeAddr = parseSafeAddressInput(initialSafeAddress);
    if (parsedFromSafeAddr) {
      derivedNetwork = derivedNetwork || parsedFromSafeAddr.network;
      derivedAddress = derivedAddress || parsedFromSafeAddr.address;
      derivedChainId = derivedChainId || parsedFromSafeAddr.chainId;
    }
  }

  // Ensure chainId is set if network is known
  if (derivedNetwork && !derivedChainId) {
    derivedChainId = NETWORKS.find((n) => n.value === derivedNetwork)?.chainId || "";
  }

  // Combine initial safeAddressInput based on what was found
  const defaultSafeAddressInput = initialSafeAddress || (derivedNetwork && derivedAddress ? `${NETWORKS.find(n => n.value === derivedNetwork)?.gnosisPrefix || derivedNetwork}:${derivedAddress}` : "");
  const defaultMethod = (initialNetwork && initialAddress && initialNonce) ? "api" : "direct";

  // Initialize form
  const form = useForm<FormData>({
    defaultValues: {
      safeAddressInput: defaultSafeAddressInput,
      method: defaultMethod, // Set to 'api' if direct params are present
      network: derivedNetwork,
      chainId: Number(derivedChainId) || 0,
      address: derivedAddress,
      nonce: initialNonce,
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
    },
  });

  // Reset form values if searchParams change significantly after initial load
  // This handles cases where the user navigates between checksum links
  useEffect(() => {
    const currentNetwork = searchParams.get("network") || "";
    const currentAddress = searchParams.get("address") || "";
    const currentNonce = searchParams.get("nonce") || "";
    const currentSafeAddress = searchParams.get("safeAddress") || "";

    let networkToSet = currentNetwork;
    let addressToSet = currentAddress;
    let chainIdToSet = "";
    let safeAddressInputToSet = currentSafeAddress;
    let methodToSet = "direct";

    if (!networkToSet || !addressToSet) {
      const parsed = parseSafeAddressInput(currentSafeAddress);
      if (parsed) {
        networkToSet = networkToSet || parsed.network;
        addressToSet = addressToSet || parsed.address;
        chainIdToSet = chainIdToSet || parsed.chainId;
        safeAddressInputToSet = currentSafeAddress || `${NETWORKS.find(n => n.value === parsed.network)?.gnosisPrefix || parsed.network}:${parsed.address}`;
      }
    }
    
    if (networkToSet && !chainIdToSet) {
       chainIdToSet = NETWORKS.find((n) => n.value === networkToSet)?.chainId || "";
    }

    if (networkToSet && addressToSet && currentNonce) {
      methodToSet = "api";
    }

    form.reset({
      ...form.getValues(), // Keep other values if they exist
      safeAddressInput: safeAddressInputToSet,
      method: methodToSet,
      network: networkToSet,
      chainId: Number(chainIdToSet) || 0,
      address: addressToSet,
      nonce: currentNonce,
      // Reset potentially fetched data if params change
      to: "0x0000000000000000000000000000000000000000",
      value: "0",
      data: "0x",
      operation: "0",
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: "0x0000000000000000000000000000000000000000",
      refundReceiver: "0x0000000000000000000000000000000000000000",
    });
    
    // Mark initial params as processed after the first run
    if (!initialParamsLoaded.current) {
      initialParamsLoaded.current = true;
    }

  }, [searchParams, form]); // Rerun when searchParams change

  // Handle Safe address input changes
  const handleSafeAddressInputChange = (input: string) => {
    const parsedAddress = parseSafeAddressInput(input);
    
    if (parsedAddress) {
      form.setValue("address", parsedAddress.address);
      form.setValue("network", parsedAddress.network);
      form.setValue("chainId", Number(parsedAddress.chainId));
      
      // If a transaction hash was found, we can try to fetch it
      if (parsedAddress.txHash) {
        form.setValue("method", "api");
        // We don't have the nonce yet, but we can try to fetch the transaction
        // using the txHash in a future implementation
      }
    }
  };

  // Watch for changes to safeAddressInput
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "safeAddressInput") {
        handleSafeAddressInputChange(value.safeAddressInput || "");
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Wrap handleSubmit in useCallback for stable reference
  const handleSubmitCallback = useCallback(async (data: FormData) => {
    setIsLoading(true);
    setResult(null);
    setCalculationRequested(true);
  
    try {
      let txParams: TransactionParams = {
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
        dataDecoded: null
      };
      
      if (data.method === "api") {
        try {
          txParams = await fetchTransactionDataFromApi(
            data.network,
            data.address,
            data.nonce
          );
        } catch (error: any) {
          setCalculationRequested(false);
          throw new Error(`API Error: ${error.message}`);
        }
      }

      const {
        domainHash,
        messageHash,
        safeTxHash,
        encodedMessage
      } = await calculateHashes(
        data.chainId.toString(),
        data.address,
        txParams.to,
        txParams.value,
        txParams.data,
        txParams.operation.toString(),
        txParams.safeTxGas,
        txParams.baseGas,
        txParams.gasPrice,
        txParams.gasToken,
        txParams.refundReceiver,
        txParams.nonce,
        txParams.version || data.version
      );
  
      setResult({
        network: {
          name: NETWORKS.find(n => n.value === data.network)?.label || data.network,
          chain_id: data.chainId.toString(),
        },
        transaction: {
          multisig_address: data.address,
          to: txParams.to,
          value: txParams.value,
          data: txParams.data,
          encoded_message: encodedMessage,
          data_decoded: txParams.dataDecoded || {
            method: txParams.data === "0x" ? "0x (ETH Transfer)" : "Unknown",
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
      console.error("Error:", error);
      
      if (data.method === "api" && error.message.includes("API Error")) {
        setCalculationRequested(false);
      } else {
        setResult({
          error: error.message || "An error occurred during hash calculation."
        });
      }
    } finally {
      setIsLoading(false);
    }
  // Dependencies for useCallback: Include all variables from the outer scope used inside
  }, [form, setResult, setIsLoading, setCalculationRequested]);

  // --- Auto-trigger calculation based on initial params ---
  useEffect(() => {
    // Only run this effect once after initial params are loaded
    if (initialParamsLoaded.current && derivedNetwork && derivedAddress && initialNonce) {
        // Check if calculation hasn't been requested or is not already loading
        if (!calculationRequested && !isLoading) {
            console.log("Auto-triggering calculation from URL params...");
            // Use the stable callback here
            handleSubmitCallback(form.getValues());
        }
    }
  // Add handleSubmitCallback to dependencies
  }, [initialParamsLoaded.current, derivedNetwork, derivedAddress, initialNonce, form, handleSubmitCallback, calculationRequested, isLoading]); // Dependencies

  return {
    form,
    result,
    isLoading,
    calculationRequested,
    // Expose the react-hook-form submit handler, which internally calls our useCallback version
    handleSubmit: form.handleSubmit(handleSubmitCallback),
    safeAddress: initialSafeAddress,
    network: derivedNetwork,
    chainId: Number(derivedChainId) || 0,
    address: derivedAddress,
    nonce: initialNonce,
    handleSafeAddressInputChange
  };
} 
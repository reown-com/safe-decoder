export const NETWORKS = [
  {
    value: "ethereum",
    label: "Ethereum Mainnet",
    chainId: "1",
    gnosisPrefix: "eth",
    safeServiceUrl: "https://safe-transaction-mainnet.safe.global"
  },
  {
    value: "goerli",
    label: "Goerli Testnet",
    chainId: "5",
    gnosisPrefix: "gor",
    safeServiceUrl: "https://safe-transaction-goerli.safe.global"
  },
  {
    value: "sepolia",
    label: "Sepolia Testnet",
    chainId: "11155111",
    gnosisPrefix: "sep",
    safeServiceUrl: "https://safe-transaction-sepolia.safe.global"
  },
  {
    value: "polygon",
    label: "Polygon",
    chainId: "137",
    gnosisPrefix: "matic",
    safeServiceUrl: "https://safe-transaction-polygon.safe.global"
  },
  {
    value: "mumbai",
    label: "Mumbai Testnet",
    chainId: "80001",
    gnosisPrefix: "mum"
  },
  {
    value: "bsc",
    label: "Binance Smart Chain",
    chainId: "56",
    gnosisPrefix: "bnb"
  },
  {
    value: "bsc-testnet",
    label: "BSC Testnet",
    chainId: "97",
    gnosisPrefix: "bnbt"
  },
  {
    value: "arbitrum",
    label: "Arbitrum One",
    chainId: "42161",
    gnosisPrefix: "arb1",
    safeServiceUrl: "https://safe-transaction-arbitrum.safe.global"
  },
  {
    value: "arbitrum-goerli",
    label: "Arbitrum Goerli",
    chainId: "421613",
    gnosisPrefix: "arb-goerli"
  },
  {
    value: "optimism",
    label: "Optimism",
    chainId: "10",
    gnosisPrefix: "oeth",
    safeServiceUrl: "https://safe-transaction-optimism.safe.global"
  },
  {
    value: "optimism-goerli",
    label: "Optimism Goerli",
    chainId: "420",
    gnosisPrefix: "ogor"
  },
  {
    value: "avalanche",
    label: "Avalanche",
    chainId: "43114",
    gnosisPrefix: "avax"
  },
  {
    value: "avalanche-fuji",
    label: "Avalanche Fuji",
    chainId: "43113",
    gnosisPrefix: "fuji"
  },
  {
    value: "gnosis",
    label: "Gnosis Chain",
    chainId: "100",
    gnosisPrefix: "gno"
  },
  {
    value: "base",
    label: "Base",
    chainId: "8453",
    gnosisPrefix: "base",
    safeServiceUrl: "https://safe-transaction-base.safe.global"
  },
  {
    value: "base-goerli",
    label: "Base Goerli",
    chainId: "84531",
    gnosisPrefix: "base-gor"
  },
  {
    value: "zksync",
    label: "zkSync Era",
    chainId: "324",
    gnosisPrefix: "zksync"
  },
  {
    value: "zksync-goerli",
    label: "zkSync Era Testnet",
    chainId: "280",
    gnosisPrefix: "zksync-gor"
  }
];

// Find network by chain ID helper
export const findNetworkByChainId = (chainId: number | string) => {
  return NETWORKS.find(n => n.chainId.toString() === chainId.toString());
};

// Find network by value/slug helper
export const findNetworkByValue = (value: string) => {
  return NETWORKS.find(n => n.value === value);
}; 
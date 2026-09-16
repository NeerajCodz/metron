import type { ChainId } from "@metron/types";

export const CHAIN_IDS = {
  ethereumSepolia: 11_155_111,
  arbitrumSepolia: 421_614,
  baseSepolia: 84_532,
  optimismSepolia: 11_155_420,
} as const;

export type SupportedChainKey = keyof typeof CHAIN_IDS;

export interface ChainDefinition {
  key: SupportedChainKey;
  chainId: ChainId;
  displayName: string;
  role: "coordination" | "execution" | "optional_execution";
  rpcEnvironmentKey: string;
  nativeSymbol: "ETH";
}

export const SUPPORTED_CHAINS: Record<SupportedChainKey, ChainDefinition> = {
  ethereumSepolia: {
    key: "ethereumSepolia",
    chainId: CHAIN_IDS.ethereumSepolia,
    displayName: "Ethereum Sepolia",
    role: "coordination",
    rpcEnvironmentKey: "ETHEREUM_SEPOLIA_RPC_URL",
    nativeSymbol: "ETH",
  },
  arbitrumSepolia: {
    key: "arbitrumSepolia",
    chainId: CHAIN_IDS.arbitrumSepolia,
    displayName: "Arbitrum Sepolia",
    role: "execution",
    rpcEnvironmentKey: "ARBITRUM_SEPOLIA_RPC_URL",
    nativeSymbol: "ETH",
  },
  baseSepolia: {
    key: "baseSepolia",
    chainId: CHAIN_IDS.baseSepolia,
    displayName: "Base Sepolia",
    role: "execution",
    rpcEnvironmentKey: "BASE_SEPOLIA_RPC_URL",
    nativeSymbol: "ETH",
  },
  optimismSepolia: {
    key: "optimismSepolia",
    chainId: CHAIN_IDS.optimismSepolia,
    displayName: "Optimism Sepolia",
    role: "optional_execution",
    rpcEnvironmentKey: "OPTIMISM_SEPOLIA_RPC_URL",
    nativeSymbol: "ETH",
  },
};

export const REQUIRED_CHAIN_KEYS = [
  "ethereumSepolia",
  "arbitrumSepolia",
  "baseSepolia",
] as const satisfies readonly SupportedChainKey[];

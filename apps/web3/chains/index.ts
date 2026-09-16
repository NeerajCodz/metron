import { REQUIRED_CHAIN_KEYS, SUPPORTED_CHAINS, type SupportedChainKey } from "@metron/config";
import { createPublicClient, http, type PublicClient, type Transport } from "viem";
import { arbitrumSepolia, baseSepolia, optimismSepolia, sepolia } from "viem/chains";

const VIEM_CHAIN_BY_KEY = {
  ethereumSepolia: sepolia,
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
} as const;

type SupportedViemChain = (typeof VIEM_CHAIN_BY_KEY)[SupportedChainKey];

export interface Web3ChainRuntime {
  key: SupportedChainKey;
  client: PublicClient<Transport, SupportedViemChain>;
}

export function createChainRuntime(
  key: SupportedChainKey,
  environment: NodeJS.ProcessEnv = process.env,
): Web3ChainRuntime {
  const definition = SUPPORTED_CHAINS[key];
  const rpcUrl = environment[definition.rpcEnvironmentKey];
  if (!rpcUrl) {
    throw new Error(`Missing ${definition.rpcEnvironmentKey} for ${definition.displayName}`);
  }
  return {
    key,
    client: createPublicClient({
      chain: VIEM_CHAIN_BY_KEY[key],
      transport: http(rpcUrl, { retryCount: 2, timeout: 10_000 }),
    }),
  };
}

export function createRequiredChainRuntimes(
  environment: NodeJS.ProcessEnv = process.env,
): Web3ChainRuntime[] {
  return REQUIRED_CHAIN_KEYS.map((key) => createChainRuntime(key, environment));
}

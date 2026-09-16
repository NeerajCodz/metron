import { z } from "zod";

import { CHAIN_IDS, type SupportedChainKey } from "./chains.js";

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((address) => address.toLowerCase() !== "0x0000000000000000000000000000000000000000", {
    message: "zero address is not a deployment address",
  });
const transactionHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const bytes32Schema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

export const protocolAddressesSchema = z.strictObject({
  aavePool: addressSchema.optional(),
  uniswapPoolManager: addressSchema.optional(),
  uniswapPositionManager: addressSchema.optional(),
  chainlinkAutomationRegistry: addressSchema.optional(),
  layerZeroEndpoint: addressSchema,
  chainlinkFeeds: z.record(z.string().trim().min(1), addressSchema),
  supportedAssets: z.record(z.string().trim().min(1), addressSchema),
});

export const contractDeploymentSchema = z.strictObject({
  address: addressSchema,
  deploymentTransaction: transactionHashSchema,
  bytecodeHash: bytes32Schema,
  compilerVersion: z.string().trim().min(1),
  sourceCommit: z.string().regex(/^[0-9a-f]{7,40}$/),
  deployedAt: z.number().int().nonnegative(),
});

export const chainDeploymentSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  chainId: z.number().int().positive(),
  layerZeroEndpointId: z.number().int().positive(),
  protocols: protocolAddressesSchema,
  contracts: z.record(z.string().trim().min(1), contractDeploymentSchema),
});

export type ChainDeployment = z.infer<typeof chainDeploymentSchema>;

export function validateDeploymentForChain(
  key: SupportedChainKey,
  input: unknown,
): ChainDeployment {
  const deployment = chainDeploymentSchema.parse(input);
  if (deployment.chainId !== CHAIN_IDS[key]) {
    throw new Error(
      `Deployment chain ID ${deployment.chainId} does not match ${key} (${CHAIN_IDS[key]})`,
    );
  }
  return deployment;
}

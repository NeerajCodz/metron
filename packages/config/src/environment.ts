import { z } from "zod";

const privateKeySchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const urlSchema = z.url();

export const publicEnvironmentSchema = z.strictObject({
  ETHEREUM_SEPOLIA_RPC_URL: urlSchema,
  ARBITRUM_SEPOLIA_RPC_URL: urlSchema,
  BASE_SEPOLIA_RPC_URL: urlSchema,
  OPTIMISM_SEPOLIA_RPC_URL: urlSchema.optional(),
  CONVEX_URL: urlSchema.optional(),
  CONVEX_HTTP_URL: urlSchema.optional(),
  AI_SERVICE_URL: urlSchema,
  DEPLOYMENT_ENV: z.enum(["development", "test", "testnet", "production"]),
});

export const secretEnvironmentSchema = z.strictObject({
  AI_SERVICE_TOKEN: z.string().min(32),
  INTERNAL_SERVICE_TOKEN: z.string().min(32),
  AUTOMATION_PRIVATE_KEY: privateKeySchema.optional(),
  DEPLOYER_PRIVATE_KEY: privateKeySchema.optional(),
  PRIVATE_RELAY_URL: urlSchema.optional(),
  MONITORING_DSN: z.string().trim().min(1).optional(),
  EXPECTED_ADMIN_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type SecretEnvironment = z.infer<typeof secretEnvironmentSchema>;

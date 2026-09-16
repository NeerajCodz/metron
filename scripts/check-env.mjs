import {
  publicEnvironmentSchema,
  secretEnvironmentSchema,
} from "../packages/config/dist/src/index.js";

const publicInput = {
  ETHEREUM_SEPOLIA_RPC_URL: process.env.ETHEREUM_SEPOLIA_RPC_URL,
  ARBITRUM_SEPOLIA_RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC_URL,
  BASE_SEPOLIA_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL,
  OPTIMISM_SEPOLIA_RPC_URL: process.env.OPTIMISM_SEPOLIA_RPC_URL,
  CONVEX_URL: process.env.CONVEX_URL,
  CONVEX_HTTP_URL: process.env.CONVEX_HTTP_URL,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL,
  DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
};

const publicResult = publicEnvironmentSchema.safeParse(publicInput);
if (!publicResult.success) {
  console.error("Public environment validation failed");
  console.error(publicResult.error.issues);
  process.exitCode = 1;
}

if (process.argv.includes("--secrets")) {
  const secretInput = {
    AI_SERVICE_TOKEN: process.env.METRON_AI_SERVICE_TOKEN ?? process.env.AI_SERVICE_TOKEN,
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,
    AUTOMATION_PRIVATE_KEY: process.env.AUTOMATION_PRIVATE_KEY,
    DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY,
    PRIVATE_RELAY_URL: process.env.PRIVATE_RELAY_URL,
    MONITORING_DSN: process.env.MONITORING_DSN,
    EXPECTED_ADMIN_ADDRESS: process.env.EXPECTED_ADMIN_ADDRESS,
  };
  const secretResult = secretEnvironmentSchema.safeParse(secretInput);
  if (!secretResult.success) {
    console.error("Secret environment validation failed");
    console.error(secretResult.error.issues.map(({ path, message }) => ({ path, message })));
    process.exitCode = 1;
  }
}

if (process.exitCode !== 1) {
  console.log("Environment is valid");
}

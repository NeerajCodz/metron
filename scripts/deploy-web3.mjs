import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const chains = {
  ethereumSepolia: "ETHEREUM_SEPOLIA_RPC_URL",
  arbitrumSepolia: "ARBITRUM_SEPOLIA_RPC_URL",
  baseSepolia: "BASE_SEPOLIA_RPC_URL",
  optimismSepolia: "OPTIMISM_SEPOLIA_RPC_URL",
};
const chain = process.argv[2];
if (!chain || !(chain in chains))
  throw new Error(`usage: node scripts/deploy-web3.mjs <${Object.keys(chains).join("|")}>`);

const rpc = process.env[chains[chain]];
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const admin = process.env.EXPECTED_ADMIN_ADDRESS;
const script = process.env.DEPLOY_SCRIPT ?? "script/Deploy.s.sol:Deploy";
if (!rpc || !privateKey || !admin)
  throw new Error(`set ${chains[chain]}, DEPLOYER_PRIVATE_KEY, and EXPECTED_ADMIN_ADDRESS`);
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey))
  throw new Error("DEPLOYER_PRIVATE_KEY must be a 32-byte hex key");
if (!/^0x[0-9a-fA-F]{40}$/.test(admin))
  throw new Error("EXPECTED_ADMIN_ADDRESS must be an EVM address");
if (process.env.DEPLOYMENT_ENV === "production" && process.env.DEPLOY_CONFIRM !== "I_UNDERSTAND") {
  throw new Error("production deployment requires DEPLOY_CONFIRM=I_UNDERSTAND");
}
const scriptPath = resolve("apps/web3", script.split(":")[0]);
try {
  await access(scriptPath);
} catch {
  throw new Error(`deployment script does not exist: ${scriptPath}`);
}

const args = ["script", script, "--broadcast", "--rpc-url", rpc, "--private-key", privateKey];
console.log(JSON.stringify({ chain, script, admin, status: "starting" }));
const forgeWrapper = resolve("scripts/forge.mjs");
const child = spawn("node", [forgeWrapper, ...args], {
  cwd: resolve("apps/web3"),
  stdio: "inherit",
  env: { ...process.env, EXPECTED_ADMIN_ADDRESS: admin },
});
child.on("exit", (code) => process.exit(code ?? 1));

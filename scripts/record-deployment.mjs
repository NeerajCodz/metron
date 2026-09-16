import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const chainIds = {
  ethereumSepolia: 11_155_111,
  arbitrumSepolia: 421_614,
  baseSepolia: 84_532,
  optimismSepolia: 11_155_420,
};
const [chain, runFile, outputFile = `apps/web3/deployments/${chain}.json`] = process.argv.slice(2);
if (!chain || !(chain in chainIds) || !runFile) {
  throw new Error(
    `usage: node scripts/record-deployment.mjs <${Object.keys(chainIds).join("|")}> <broadcast-json> [output-json]`,
  );
}
const layerZeroEndpoint = process.env.LAYERZERO_ENDPOINT_ADDRESS;
const layerZeroEndpointId = Number(process.env.LAYERZERO_ENDPOINT_ID);
if (!/^0x[0-9a-fA-F]{40}$/.test(layerZeroEndpoint ?? "") || !Number.isSafeInteger(layerZeroEndpointId) || layerZeroEndpointId <= 0) {
  throw new Error("set LAYERZERO_ENDPOINT_ADDRESS and positive LAYERZERO_ENDPOINT_ID");
}

const run = JSON.parse(await readFile(resolve(runFile), "utf8"));
const creates = run.transactions?.filter((transaction) => transaction.transactionType === "CREATE") ?? [];
if (creates.length === 0) throw new Error("broadcast file contains no CREATE transactions");
const contracts = {};
for (const transaction of creates) {
  if (!transaction.contractName || !transaction.contractAddress || !transaction.hash) {
    throw new Error("each CREATE transaction needs contractName, contractAddress, and hash");
  }
  const artifactPath = resolve("apps/web3/out", `${transaction.contractName}.sol`, `${transaction.contractName}.json`);
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const bytecode = artifact.deployedBytecode?.object;
  if (typeof bytecode !== "string" || !bytecode.startsWith("0x") || bytecode.length <= 2) {
    throw new Error(`missing deployed bytecode for ${transaction.contractName}`);
  }
  contracts[transaction.contractName] = {
    address: transaction.contractAddress,
    deploymentTransaction: transaction.hash,
    bytecodeHash: `0x${createHash("sha256").update(bytecode.slice(2), "hex").digest("hex")}`,
    compilerVersion: "0.8.30",
    sourceCommit: execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { encoding: "utf8" }).trim(),
    deployedAt: Date.now(),
  };
}
const deployment = {
  schemaVersion: "1.0.0",
  chainId: chainIds[chain],
  layerZeroEndpointId,
  protocols: {
    layerZeroEndpoint,
    chainlinkFeeds: {},
    supportedAssets: {},
  },
  contracts,
};
await mkdir(dirname(resolve(outputFile)), { recursive: true });
await writeFile(resolve(outputFile), `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
console.log(`recorded ${Object.keys(contracts).length} contracts to ${outputFile}`);

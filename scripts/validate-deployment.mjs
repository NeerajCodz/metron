import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDeploymentForChain } from "../packages/config/dist/src/index.js";

const chain = process.argv[2];
const file = process.argv[3];
if (!chain || !file)
  throw new Error("usage: node scripts/validate-deployment.mjs <chain> <record.json>");
const record = JSON.parse(await readFile(resolve(file), "utf8"));
const deployment = validateDeploymentForChain(chain, record);
for (const [name, contract] of Object.entries(deployment.contracts)) {
  if (contract.address.toLowerCase() === deployment.protocols.layerZeroEndpoint.toLowerCase()) {
    throw new Error(`contract ${name} reuses the LayerZero endpoint address`);
  }
}
console.log(
  `validated ${Object.keys(deployment.contracts).length} deployment records for ${chain}`,
);

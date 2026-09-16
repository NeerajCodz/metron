import { INTENT_SCHEMA_VERSION, type Bytes32, type CanonicalIntent } from "@metron/types";
import { canonicalIntentSchema } from "@metron/validation";
import { encodeAbiParameters, keccak256, stringToHex } from "viem";

import { UINT256_MAX } from "./fixed-point.js";

export const INTENT_COMMITMENT_DOMAIN = keccak256(
  stringToHex("METRON_PRIVATE_INTENT_COMMITMENT_V1"),
);

export function normalizeIntent(input: CanonicalIntent): CanonicalIntent {
  const parsed = canonicalIntentSchema.parse(input) as CanonicalIntent;
  return {
    ...parsed,
    owner: parsed.owner.toLowerCase() as CanonicalIntent["owner"],
    chains: [...parsed.chains].sort((left, right) => left - right),
    protocols: [...parsed.protocols].map((protocol) => protocol.toLowerCase()).sort(),
    assets: [...parsed.assets]
      .map((asset) => asset.toLowerCase() as CanonicalIntent["assets"][number])
      .sort(),
  };
}

export function hashNormalizedIntent(input: CanonicalIntent): Bytes32 {
  const intent = normalizeIntent(input);
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint64" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint256" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "int256" },
      { type: "uint256" },
      { type: "uint256[]" },
      { type: "string[]" },
      { type: "address[]" },
      { type: "bool" },
      { type: "bool" },
      { type: "bool" },
      { type: "bool" },
      { type: "bool" },
      { type: "bool" },
    ],
    [
      keccak256(stringToHex(INTENT_SCHEMA_VERSION)),
      intent.owner,
      BigInt(intent.nonce),
      BigInt(intent.expiresAt),
      BigInt(intent.objective.targetApyMinBps ?? UINT256_MAX),
      BigInt(intent.objective.targetApyMaxBps ?? UINT256_MAX),
      intent.risk.maxDrawdownBps,
      intent.risk.maxImpermanentLossBps ?? 10_000,
      intent.risk.maxLiquidationProbabilityBps ?? 10_000,
      BigInt(intent.risk.minHealthFactorWad ?? UINT256_MAX),
      intent.risk.maxSlippageBps,
      intent.risk.maxCapitalMoveBps,
      intent.risk.maxCollateralSaleBps,
      BigInt(intent.risk.maxRepaymentAmount ?? UINT256_MAX),
      BigInt(intent.risk.maxGasFeeUsd ?? UINT256_MAX),
      BigInt(intent.exposure.targetDeltaWad),
      BigInt(intent.exposure.deltaToleranceWad),
      intent.chains.map(BigInt),
      intent.protocols,
      intent.assets,
      intent.automation.rebalance,
      intent.automation.recovery,
      intent.automation.emergencyUnwind,
      intent.privacy.privateParameters,
      intent.privacy.zkOwnershipRequired,
      intent.privacy.zkCollateralRequired,
    ],
  );
  return keccak256(encoded);
}

export function createIntentCommitment(
  input: CanonicalIntent,
  userSecret: Bytes32,
  nullifierNonce: bigint,
): Bytes32 {
  if (nullifierNonce < 0n) {
    throw new RangeError("nullifier nonce must be non-negative");
  }
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }],
      [INTENT_COMMITMENT_DOMAIN, hashNormalizedIntent(input), userSecret, nullifierNonce],
    ),
  );
}

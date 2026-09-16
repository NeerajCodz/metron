import type { Hex } from "viem";
import { encodeAbiParameters, keccak256, stringToHex } from "viem";

import type { SolverRoute } from "@metron/types";

export interface SealedBid {
  routeHash: Hex;
  salt: Hex;
  commitment: Hex;
}

export function hashRoute(route: SolverRoute): Hex {
  return keccak256(stringToHex(JSON.stringify(route)));
}

export function computeBidCommitment(intentId: Hex, solverId: Hex, routeHash: Hex, salt: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }],
      [intentId, solverId, routeHash, salt],
    ),
  );
}

export function sealBid(intentId: Hex, solverId: Hex, route: SolverRoute, salt: Hex): SealedBid {
  const routeHash = hashRoute(route);
  return { routeHash, salt, commitment: computeBidCommitment(intentId, solverId, routeHash, salt) };
}

export function verifyBidCommitment(intentId: Hex, solverId: Hex, bid: SealedBid): boolean {
  return bid.commitment === computeBidCommitment(intentId, solverId, bid.routeHash, bid.salt);
}

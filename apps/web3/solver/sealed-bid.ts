import type { Hex } from "viem";
import { computeBidCommitment, hashRouteJson } from "@metron/protocol";

import type { SolverRoute } from "@metron/types";

export interface SealedBid {
  routeHash: Hex;
  salt: Hex;
  commitment: Hex;
}

export function hashRoute(route: SolverRoute): Hex {
  return hashRouteJson(JSON.stringify(route));
}

export { computeBidCommitment };

export function sealBid(intentId: Hex, solverId: Hex, route: SolverRoute, salt: Hex): SealedBid {
  const routeHash = hashRoute(route);
  return { routeHash, salt, commitment: computeBidCommitment(intentId, solverId, routeHash, salt) };
}

export function verifyBidCommitment(intentId: Hex, solverId: Hex, bid: SealedBid): boolean {
  return bid.commitment === computeBidCommitment(intentId, solverId, bid.routeHash, bid.salt);
}

import { encodeAbiParameters, keccak256, stringToHex } from "viem";

export function hashRouteJson(routeJson: string): `0x${string}` {
  return keccak256(stringToHex(routeJson));
}

export function computeBidCommitment(
  intentId: `0x${string}`,
  solverId: `0x${string}`,
  routeHash: `0x${string}`,
  salt: `0x${string}`,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }],
      [intentId, solverId, routeHash, salt],
    ),
  );
}

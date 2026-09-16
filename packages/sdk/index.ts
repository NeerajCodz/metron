import { encodeAbiParameters } from "viem";
import { getAbi } from "@metron/abi";
import { computeBidCommitment, hashRouteJson } from "@metron/protocol";
import type { PositionId } from "@metron/types";
import type { Abi, Address, Hash, Hex, PublicClient, WalletClient } from "viem";
import type { MetronAiClient, MetronConvexClient } from "./clients.js";

export type ZkCircuit = "intent" | "ownership" | "collateral";
export interface ZkProof {
  proof: Hex;
  publicInputs: readonly Hash[];
}
export type ZkProofRunner = (circuit: ZkCircuit, witness: unknown) => Promise<ZkProof>;

export interface MetronContractAddresses {
  intentManager: Address;
  intentSettlement: Address;
  vault: Address;
  positionManager: Address;
  solverSettlement: Address;
  recoveryExecutor: Address;
  zkIntentVerifier?: Address;
  zkOwnershipVerifier?: Address;
  zkCollateralVerifier?: Address;
}
type CoreContract =
  | "intentManager"
  | "intentSettlement"
  | "vault"
  | "positionManager"
  | "solverSettlement"
  | "recoveryExecutor";

export interface MetronSdkOptions {
  publicClient: PublicClient;
  walletClient?: WalletClient;
  addresses: MetronContractAddresses;
  ai?: MetronAiClient;
  convex?: MetronConvexClient;
  zkProofRunner?: ZkProofRunner;
}

export class MetronSdk {
  constructor(private readonly options: MetronSdkOptions) {}

  hashIntentPayload(payload: unknown): Hash {
    const serialized = JSON.stringify(payload);
    if (serialized === undefined) throw new Error("Intent payload must be JSON serializable");
    return hashRouteJson(serialized);
  }

  computeBidCommitment(intentId: Hash, solverId: Hash, routeHash: Hash, salt: Hash): Hash {
    return computeBidCommitment(intentId, solverId, routeHash, salt);
  }
  async generateProof(circuit: ZkCircuit, witness: unknown): Promise<ZkProof> {
    const runner = this.options.zkProofRunner;
    if (!runner) throw new Error("ZK proof runner is not configured");
    return runner(circuit, witness);
  }

  encodeProofPublicInputs(publicInputs: readonly Hash[]): Hex {
    return encodeAbiParameters([{ type: "bytes32[]" }], [publicInputs]);
  }

  async submitProof(circuit: ZkCircuit, proof: Hex, publicInputs: readonly Hash[]): Promise<Hash> {
    const addressKey =
      `${circuit === "intent" ? "zkIntent" : circuit === "ownership" ? "zkOwnership" : "zkCollateral"}Verifier` as const;
    const address = this.options.addresses[addressKey];
    if (!address) throw new Error(`${circuit} verifier address is not configured`);
    const walletClient = this.options.walletClient;
    const account = walletClient?.account;
    if (!walletClient || !account) throw new Error("A connected wallet client is required");
    const verifier =
      circuit === "intent"
        ? "ZKIntentVerifier"
        : circuit === "ownership"
          ? "ZKOwnershipVerifier"
          : "ZKCollateralVerifier";
    const functionName =
      circuit === "intent"
        ? "verifyIntent"
        : circuit === "ownership"
          ? "verifyOwnership"
          : "verifyCollateral";
    return walletClient.writeContract({
      address,
      abi: getAbi(verifier) as Abi,
      functionName,
      args: [proof, publicInputs],
      account,
    } as never);
  }

  async submitIntent(submission: unknown): Promise<Hash> {
    return this.write("intentManager", "submitIntent", [submission]);
  }

  async deposit(asset: Address, amount: bigint, owner: Address): Promise<Hash> {
    return this.write("vault", "deposit", [asset, amount, owner]);
  }

  async withdraw(asset: Address, amount: bigint, recipient: Address): Promise<Hash> {
    return this.write("vault", "withdraw", [asset, amount, recipient]);
  }

  async readPosition(positionId: PositionId): Promise<unknown> {
    return this.read("positionManager", "getPosition", [positionId]);
  }

  async readAvailableBalance(owner: Address, asset: Address): Promise<unknown> {
    return this.read("vault", "availableBalance", [owner, asset]);
  }

  async openAuction(
    intentId: Hash,
    commitDeadline: bigint,
    revealDeadline: bigint,
    settlementDeadline: bigint,
  ): Promise<Hash> {
    return this.write("solverSettlement", "openAuction", [
      intentId,
      commitDeadline,
      revealDeadline,
      settlementDeadline,
    ]);
  }

  async commitBid(intentId: Hash, solverId: Hash, commitment: Hash): Promise<Hash> {
    return this.write("solverSettlement", "commitBid", [intentId, solverId, commitment]);
  }

  async revealBid(
    intentId: Hash,
    solverId: Hash,
    routeHash: Hash,
    salt: Hash,
    scoreBps: bigint,
    traceId: Hash,
  ): Promise<Hash> {
    return this.write("solverSettlement", "revealBid", [
      intentId,
      solverId,
      routeHash,
      salt,
      scoreBps,
      traceId,
    ]);
  }

  async selectWinner(intentId: Hash): Promise<Hash> {
    return this.write("solverSettlement", "selectWinner", [intentId]);
  }

  async settleIntent(
    intentId: Hash,
    solverId: Hash,
    routeHash: Hash,
    traceId: Hash,
    minimumOutput: bigint,
    deadline: bigint,
  ): Promise<Hash> {
    return this.write("intentSettlement", "authorizeSettlement", [
      intentId,
      solverId,
      routeHash,
      traceId,
      minimumOutput,
      deadline,
    ]);
  }

  simulateRecovery<TRequest, TResponse>(request: TRequest): Promise<TResponse> {
    if (!this.options.ai) throw new Error("AI client is not configured");
    return this.options.ai.simulateRecovery<TRequest, TResponse>(request);
  }

  getConvex(): MetronConvexClient {
    if (!this.options.convex) throw new Error("Convex client is not configured");
    return this.options.convex;
  }

  private async read(
    contract: CoreContract,
    functionName: string,
    args: readonly unknown[],
  ): Promise<unknown> {
    return this.options.publicClient.readContract({
      address: this.options.addresses[contract],
      abi: getAbi(contractName(contract)) as Abi,
      functionName,
      args,
    });
  }

  private async write(
    contract: CoreContract,
    functionName: string,
    args: readonly unknown[],
  ): Promise<Hash> {
    const walletClient = this.options.walletClient;
    const account = walletClient?.account;
    if (!walletClient || !account) throw new Error("A connected wallet client is required");
    return walletClient.writeContract({
      address: this.options.addresses[contract],
      abi: getAbi(contractName(contract)) as Abi,
      functionName,
      args,
      account,
    } as never);
  }
}

function contractName(contract: CoreContract): string {
  return {
    intentManager: "IntentManager",
    intentSettlement: "IntentSettlement",
    vault: "Vault",
    positionManager: "PositionManager",
    solverSettlement: "SolverSettlement",
    recoveryExecutor: "RecoveryExecutor",
  }[contract];
}

export { MetronAiClient, MetronConvexClient } from "./clients.js";
export type { AiClientOptions, ConvexOperation, ConvexTransport } from "./clients.js";

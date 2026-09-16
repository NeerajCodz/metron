// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";
import {SolverRegistry} from "../../contracts/solver/SolverRegistry.sol";
import {SolverSettlement} from "../../contracts/solver/SolverSettlement.sol";
import {IntentSettlement} from "../../contracts/solver/IntentSettlement.sol";

contract SolverSettlementTest is Test {
    address private admin = address(0xA11CE);
    address private owner = address(0xB0B);
    address private solverOperator = address(0xC0DE);
    bytes32 private solverId = keccak256("solver-a");
    bytes32 private traceId = keccak256("trace");
    bytes32 private routeHash = keccak256("route");
    bytes32 private salt = keccak256("salt");

    IntentManager private intentManager;
    SolverRegistry private registry;
    IntentSettlement private intentSettlement;
    SolverSettlement private solverSettlement;
    bytes32 private intentId;

    function setUp() public {
        vm.warp(100);
        vm.startPrank(admin);
        intentManager = new IntentManager(admin);
        registry = new SolverRegistry(admin);
        intentSettlement = new IntentSettlement(admin, address(intentManager), address(registry));
        solverSettlement = new SolverSettlement(address(intentManager), address(registry), address(intentSettlement));
        intentManager.grantRole(intentManager.SETTLER_ROLE(), address(intentSettlement));
        intentSettlement.grantRole(intentSettlement.AUCTION_ROLE(), address(solverSettlement));
        intentSettlement.grantRole(intentSettlement.EXECUTOR_ROLE(), solverOperator);
        registry.registerSolver(solverId, solverOperator, keccak256("metadata"), 1 ether);
        vm.stopPrank();

        uint256[] memory chains = new uint256[](1);
        chains[0] = 1;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = keccak256("aave");
        address[] memory assets = new address[](1);
        assets[0] = address(0x1234);
        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("intent-trace"),
            commitment: keccak256("intent-commitment"),
            policyHash: keccak256("policy"),
            nonce: 0,
            expiresAt: 1_000,
            targetDeltaWad: 0,
            deltaToleranceWad: 1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });
        vm.prank(owner);
        intentId = intentManager.submitIntent(submission, chains, protocols, assets);
    }

    function testCommitRevealSelectAndSettle() public {
        vm.prank(owner);
        solverSettlement.openAuction(intentId, 110, 120, 130);

        bytes32 commitment = solverSettlement.computeCommitment(intentId, solverId, routeHash, salt);
        vm.prank(solverOperator);
        solverSettlement.commitBid(intentId, solverId, commitment, traceId);

        vm.warp(111);
        vm.prank(solverOperator);
        solverSettlement.revealBid(intentId, solverId, routeHash, salt, traceId, 900, 10);

        vm.warp(121);
        solverSettlement.selectWinner(intentId, 20);
        IntentSettlement.Authorization memory authorization = intentSettlement.getAuthorization(intentId);
        assertEq(authorization.solverId, solverId);
        assertEq(authorization.minimumOutput, 20);

        vm.prank(solverOperator);
        intentSettlement.settle(intentId);
        MetronTypes.IntentAuthorization memory intent = intentManager.getIntent(intentId);
        assertEq(uint8(intent.status), uint8(MetronTypes.IntentStatus.SETTLED));
    }

    function testHigherScoreWinsWithDeterministicTieBreak() public {
        bytes32 solverB = keccak256("solver-b");
        address operatorB = address(0xD00D);
        vm.prank(admin);
        registry.registerSolver(solverB, operatorB, bytes32(0), 0);

        vm.prank(owner);
        solverSettlement.openAuction(intentId, 110, 120, 130);
        bytes32 saltB = keccak256("salt-b");
        bytes32 routeB = keccak256("route-b");
        bytes32 commitmentA = solverSettlement.computeCommitment(intentId, solverId, routeHash, salt);
        bytes32 commitmentB = solverSettlement.computeCommitment(intentId, solverB, routeB, saltB);
        vm.prank(solverOperator);
        solverSettlement.commitBid(intentId, solverId, commitmentA, traceId);
        vm.prank(operatorB);
        solverSettlement.commitBid(intentId, solverB, commitmentB, keccak256("trace-b"));
        vm.warp(111);
        vm.prank(solverOperator);
        solverSettlement.revealBid(intentId, solverId, routeHash, salt, traceId, 500, 1);
        vm.prank(operatorB);
        solverSettlement.revealBid(intentId, solverB, routeB, saltB, keccak256("trace-b"), 800, 1);
        vm.warp(121);
        solverSettlement.selectWinner(intentId, 0);
        assertEq(intentSettlement.getAuthorization(intentId).solverId, solverB);
    }
}

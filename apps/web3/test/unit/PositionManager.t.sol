// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {PositionManager} from "../../contracts/core/PositionManager.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract PositionManagerTest is Test {
    bytes32 private constant STRATEGY_ID = keccak256("strategy-1");
    bytes32 private constant AAVE_PROTOCOL = keccak256("aave-v3");
    bytes32 private constant LENDING_COMPONENT = keccak256("lending:421614:aave");

    address private admin = makeAddr("admin");
    address private executor = makeAddr("executor");
    address private owner = makeAddr("owner");
    address private stranger = makeAddr("stranger");
    address private usdc = makeAddr("usdc");

    IntentManager private intentManager;
    PositionManager private positionManager;
    bytes32 private executorRole;
    bytes32 private intentId;

    function setUp() public {
        intentManager = new IntentManager(admin);
        positionManager = new PositionManager(admin, intentManager);
        executorRole = positionManager.EXECUTOR_ROLE();
        vm.prank(admin);
        positionManager.grantRole(executorRole, executor);
        intentId = _submitIntent();
    }

    function test_ExecutorCreatesPendingPositionFromActiveIntent() public {
        bytes32 positionId = _createPosition();
        MetronTypes.Position memory position = positionManager.getPosition(positionId);

        assertEq(position.owner, owner);
        assertEq(position.intentId, intentId);
        assertEq(position.strategyId, STRATEGY_ID);
        assertEq(uint256(position.status), uint256(MetronTypes.PositionStatus.PENDING));
    }

    function test_NonExecutorCannotCreatePosition() public {
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, executorRole)
        );
        positionManager.createPosition(intentId, STRATEGY_ID);
    }

    function test_EnforcesPositionStateMachine() public {
        bytes32 positionId = _createPosition();

        vm.prank(executor);
        vm.expectRevert(
            abi.encodeWithSelector(
                PositionManager.InvalidStatusTransition.selector,
                MetronTypes.PositionStatus.PENDING,
                MetronTypes.PositionStatus.CLOSED
            )
        );
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.CLOSED);

        vm.startPrank(executor);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.ACTIVE);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.RESTRICTED);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.EMERGENCY);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.UNWINDING);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.CLOSED);
        vm.stopPrank();

        assertEq(uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.CLOSED));
    }

    function test_OwnerRequestsCloseButAnotherAccountCannot() public {
        bytes32 positionId = _createAndActivatePosition();

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(PositionManager.UnauthorizedOwner.selector, stranger, owner));
        positionManager.requestClose(positionId);

        vm.prank(owner);
        positionManager.requestClose(positionId);
        assertEq(uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.UNWINDING));
    }

    function test_TracksChainLevelComponentsAndRejectsTerminalUpdates() public {
        bytes32 positionId = _createAndActivatePosition();
        bytes32 componentHash = keccak256("aave-position-state");

        vm.prank(executor);
        positionManager.upsertComponent(positionId, LENDING_COMPONENT, 421_614, AAVE_PROTOCOL, componentHash, true);

        PositionManager.PositionComponent memory component = positionManager.getComponent(positionId, LENDING_COMPONENT);
        assertEq(component.chainId, 421_614);
        assertEq(component.protocolId, AAVE_PROTOCOL);
        assertEq(component.componentHash, componentHash);
        assertTrue(component.active);
        assertEq(positionManager.getComponentKeys(positionId).length, 1);

        vm.startPrank(executor);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.CLOSED);
        vm.expectRevert(abi.encodeWithSelector(PositionManager.TerminalPosition.selector, positionId));
        positionManager.upsertComponent(positionId, LENDING_COMPONENT, 421_614, AAVE_PROTOCOL, componentHash, false);
        vm.stopPrank();
    }

    function _createPosition() private returns (bytes32) {
        vm.prank(executor);
        return positionManager.createPosition(intentId, STRATEGY_ID);
    }

    function _createAndActivatePosition() private returns (bytes32 positionId) {
        positionId = _createPosition();
        vm.prank(executor);
        positionManager.transitionStatus(positionId, MetronTypes.PositionStatus.ACTIVE);
    }

    function _submitIntent() private returns (bytes32) {
        uint256[] memory chains = new uint256[](1);
        chains[0] = 421_614;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = AAVE_PROTOCOL;
        address[] memory assets = new address[](1);
        assets[0] = usdc;

        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("trace-1"),
            commitment: keccak256("intent-1"),
            policyHash: keccak256("policy-1"),
            nonce: 0,
            expiresAt: uint64(block.timestamp + 1 days),
            targetDeltaWad: 0,
            deltaToleranceWad: 0.1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });
        vm.prank(owner);
        return intentManager.submitIntent(submission, chains, protocols, assets);
    }
}

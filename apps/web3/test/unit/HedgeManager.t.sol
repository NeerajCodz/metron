// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {HedgeManager} from "../../contracts/hedging/HedgeManager.sol";
import {IPositionManager} from "../../contracts/interfaces/IPositionManager.sol";
import {IRiskController} from "../../contracts/interfaces/IRiskController.sol";
import {IStrategyAdapter} from "../../contracts/interfaces/IStrategyAdapter.sol";
import {IVault} from "../../contracts/interfaces/IVault.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract HedgePositionMock is IPositionManager {
    MetronTypes.Position private position;

    constructor(address owner, bytes32 intentId) {
        position = MetronTypes.Position({
            owner: owner,
            intentId: intentId,
            strategyId: keccak256("strategy"),
            traceId: keccak256("trace"),
            policyHash: keccak256("policy"),
            coordinationChainId: 421614,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            status: MetronTypes.PositionStatus.ACTIVE
        });
    }

    function createPosition(bytes32, bytes32) external pure returns (bytes32) {
        return bytes32(0);
    }

    function transitionStatus(bytes32, MetronTypes.PositionStatus) external pure {}

    function getPosition(bytes32) external view returns (MetronTypes.Position memory) {
        return position;
    }
}

contract HedgeRiskMock is IRiskController {
    function validateExecution(bytes32, MetronTypes.ExecutionConstraints calldata) external pure returns (bool) {
        return true;
    }
}

contract HedgeVaultMock is IVault {
    function consume(address, address, bytes32, uint256, address) external pure {}

    function deposit(address, uint256 amount, address) external pure returns (uint256) {
        return amount;
    }
}

contract HedgeTokenMock is ERC20 {
    constructor() ERC20("Hedge", "HEDGE") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract HedgeAdapterMock is IStrategyAdapter {
    HedgeTokenMock private immutable token;

    constructor(HedgeTokenMock token_) {
        token = token_;
    }

    function execute(address, address, address, uint256, bytes calldata) external returns (bytes32) {
        token.mint(msg.sender, 50);
        return keccak256("hedge");
    }
}

contract HedgeManagerTest is Test {
    address private admin = address(0xA11CE);
    address private owner = address(0xB0B);
    bytes32 private positionId = keccak256("position");
    bytes32 private intentId = keccak256("intent");
    HedgeManager private manager;
    HedgeTokenMock private token;

    function setUp() public {
        vm.warp(1000);
        token = new HedgeTokenMock();
        HedgePositionMock positionManager = new HedgePositionMock(owner, intentId);
        HedgeRiskMock risk = new HedgeRiskMock();
        HedgeVaultMock vault = new HedgeVaultMock();
        manager = new HedgeManager(admin, positionManager, risk, vault);
        vm.prank(owner);
        manager.configurePolicy(positionId, 0, 10, 100, 20);
    }

    function testEligibilityCooldownAndBoundedOutput() public {
        assertTrue(manager.canRebalance(positionId, 100));
        HedgeAdapterMock adapter = new HedgeAdapterMock(token);
        MetronTypes.ExecutionConstraints memory constraints = MetronTypes.ExecutionConstraints({
            slippageBps: 10,
            capitalMoveBps: 10,
            collateralSaleBps: 0,
            repaymentAmount: 0,
            resultingHealthFactorWad: 2e18,
            gasFeeWei: 1,
            actionRisk: MetronTypes.ActionRisk.RISK_REDUCING,
            automationKind: MetronTypes.AutomationKind.REBALANCE
        });
        vm.prank(admin);
        (bytes32 executionId, uint256 output) = manager.rebalance(
            positionId,
            keccak256("hedge-trace"),
            100,
            5,
            address(0x1111),
            address(token),
            keccak256("reservation"),
            10,
            50,
            constraints,
            uint64(block.timestamp + 1000),
            adapter,
            bytes("")
        );
        assertTrue(executionId != bytes32(0));
        assertEq(output, 50);
        assertFalse(manager.canRebalance(positionId, 100));
    }

    function testRepeatedIdenticalExecutionIsRejected() public {
        HedgeAdapterMock adapter = new HedgeAdapterMock(token);
        MetronTypes.ExecutionConstraints memory constraints = MetronTypes.ExecutionConstraints({
            slippageBps: 10,
            capitalMoveBps: 10,
            collateralSaleBps: 0,
            repaymentAmount: 0,
            resultingHealthFactorWad: 2e18,
            gasFeeWei: 1,
            actionRisk: MetronTypes.ActionRisk.RISK_REDUCING,
            automationKind: MetronTypes.AutomationKind.REBALANCE
        });
        vm.prank(admin);
        manager.rebalance(
            positionId,
            keccak256("hedge-trace"),
            100,
            5,
            address(0x1111),
            address(token),
            keccak256("reservation"),
            10,
            50,
            constraints,
            uint64(block.timestamp + 1000),
            adapter,
            bytes("")
        );
        vm.warp(block.timestamp + 101);
        vm.prank(admin);
        vm.expectRevert();
        manager.rebalance(
            positionId,
            keccak256("hedge-trace"),
            100,
            5,
            address(0x1111),
            address(token),
            keccak256("reservation"),
            10,
            50,
            constraints,
            uint64(block.timestamp + 1000),
            adapter,
            bytes("")
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {PositionManager} from "../../contracts/core/PositionManager.sol";
import {StrategyExecutor} from "../../contracts/core/StrategyExecutor.sol";
import {Vault} from "../../contracts/core/Vault.sol";
import {IStrategyAdapter} from "../../contracts/interfaces/IStrategyAdapter.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";
import {RiskController} from "../../contracts/risk/RiskController.sol";

contract StrategyToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract StrategyAdapterMock is IStrategyAdapter {
    uint256 public outputAmount;

    function setOutputAmount(uint256 amount) external {
        outputAmount = amount;
    }

    function execute(address, address, address outputAsset, uint256, bytes calldata data)
        external
        returns (bytes32 resultHash)
    {
        IERC20(outputAsset).transfer(msg.sender, outputAmount);
        return keccak256(data);
    }
}

contract StrategyExecutorTest is Test {
    bytes32 private constant PROTOCOL_ID = keccak256("mock-protocol");
    bytes32 private constant STRATEGY_ID = keccak256("strategy-1");
    bytes32 private constant RESERVATION_ID = keccak256("reservation-1");
    uint256 private constant INPUT_AMOUNT = 1_000e18;
    uint256 private constant OUTPUT_AMOUNT = 990e18;

    address private admin = makeAddr("admin");
    address private keeper = makeAddr("keeper");
    address private owner = makeAddr("owner");

    IntentManager private intentManager;
    PositionManager private positionManager;
    RiskController private riskController;
    Vault private vault;
    StrategyExecutor private strategyExecutor;
    StrategyAdapterMock private adapter;
    StrategyToken private inputToken;
    StrategyToken private outputToken;
    bytes32 private intentId;

    function setUp() public {
        inputToken = new StrategyToken("Input", "IN");
        outputToken = new StrategyToken("Output", "OUT");
        intentManager = new IntentManager(admin);
        positionManager = new PositionManager(admin, intentManager);
        vault = new Vault(admin);
        riskController = new RiskController(admin, intentManager, _protocolLimits());
        strategyExecutor = new StrategyExecutor(admin, intentManager, positionManager, riskController, vault);
        adapter = new StrategyAdapterMock();

        vm.startPrank(admin);
        vault.grantRole(vault.EXECUTOR_ROLE(), address(strategyExecutor));
        positionManager.grantRole(positionManager.EXECUTOR_ROLE(), address(strategyExecutor));
        strategyExecutor.grantRole(strategyExecutor.EXECUTOR_ROLE(), keeper);
        strategyExecutor.configureAdapter(address(adapter), PROTOCOL_ID, true);
        vm.stopPrank();

        inputToken.mint(owner, INPUT_AMOUNT);
        outputToken.mint(address(adapter), OUTPUT_AMOUNT * 10);
        intentId = _submitAndConfigureIntent();

        vm.startPrank(owner);
        inputToken.approve(address(vault), INPUT_AMOUNT);
        vault.deposit(address(inputToken), INPUT_AMOUNT, owner);
        vault.reserveSelf(address(inputToken), INPUT_AMOUNT, RESERVATION_ID);
        vm.stopPrank();
        adapter.setOutputAmount(OUTPUT_AMOUNT);
    }

    function test_ExecutesAllowedActionAndCreditsActualOutput() public {
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT);
        uint256 deadline = block.timestamp + 10 minutes;

        vm.prank(keeper);
        (bytes32 executionId, bytes32 positionId) =
            strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, deadline);

        assertTrue(strategyExecutor.executionCompleted(executionId));
        assertEq(vault.reservedBalance(owner, address(inputToken), RESERVATION_ID), 0);
        assertEq(vault.availableBalance(owner, address(outputToken)), OUTPUT_AMOUNT);
        assertEq(uint256(positionManager.getPosition(positionId).status), uint256(MetronTypes.PositionStatus.ACTIVE));
    }

    function test_ReplayFailsBeforeAnyCapitalMoves() public {
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT);
        uint256 deadline = block.timestamp + 10 minutes;
        bytes32 executionId = strategyExecutor.computeExecutionId(intentId, STRATEGY_ID, actions, deadline);

        vm.prank(keeper);
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, deadline);

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.ExecutionAlreadyCompleted.selector, executionId));
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, deadline);
    }

    function test_InsufficientOutputRevertsReservationAndReplayState() public {
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT + 1);
        uint256 deadline = block.timestamp + 10 minutes;
        bytes32 executionId = strategyExecutor.computeExecutionId(intentId, STRATEGY_ID, actions, deadline);

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.InsufficientOutput.selector, OUTPUT_AMOUNT + 1, OUTPUT_AMOUNT)
        );
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, deadline);

        assertFalse(strategyExecutor.executionCompleted(executionId));
        assertEq(vault.reservedBalance(owner, address(inputToken), RESERVATION_ID), INPUT_AMOUNT);
    }

    function test_DisabledAdapterFailsClosed() public {
        vm.prank(admin);
        strategyExecutor.configureAdapter(address(adapter), PROTOCOL_ID, false);
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT);

        vm.prank(keeper);
        vm.expectRevert(
            abi.encodeWithSelector(StrategyExecutor.AdapterNotAllowed.selector, address(adapter), PROTOCOL_ID)
        );
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, block.timestamp + 10 minutes);
    }

    function test_RiskViolationFailsBeforeCapitalMoves() public {
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT);
        actions[0].constraints.slippageBps = 101;

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(RiskController.SlippageLimitExceeded.selector, 100, 101));
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, block.timestamp + 10 minutes);

        assertEq(vault.reservedBalance(owner, address(inputToken), RESERVATION_ID), INPUT_AMOUNT);
    }

    function test_ExpiredExecutionFailsClosed() public {
        MetronTypes.StrategyAction[] memory actions = _actions(OUTPUT_AMOUNT);
        uint256 deadline = block.timestamp + 10 minutes;
        vm.warp(deadline + 1);

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(StrategyExecutor.ExecutionExpired.selector, deadline));
        strategyExecutor.executeStrategy(intentId, STRATEGY_ID, actions, deadline);
    }

    function _actions(uint256 minimumOutput) private view returns (MetronTypes.StrategyAction[] memory actions) {
        actions = new MetronTypes.StrategyAction[](1);
        actions[0] = MetronTypes.StrategyAction({
            adapter: address(adapter),
            asset: address(inputToken),
            outputAsset: address(outputToken),
            protocolId: PROTOCOL_ID,
            reservationId: RESERVATION_ID,
            amount: INPUT_AMOUNT,
            minimumOutput: minimumOutput,
            data: bytes("deterministic-route"),
            constraints: MetronTypes.ExecutionConstraints({
                slippageBps: 100,
                capitalMoveBps: 1_000,
                collateralSaleBps: 0,
                repaymentAmount: 0,
                resultingHealthFactorWad: 1.5e18,
                gasFeeWei: 0.01 ether,
                actionRisk: MetronTypes.ActionRisk.NEUTRAL,
                automationKind: MetronTypes.AutomationKind.MANUAL
            })
        });
    }

    function _submitAndConfigureIntent() private returns (bytes32 newIntentId) {
        MetronTypes.AutomationPolicy memory policy = MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 1_000,
            maxCollateralSaleBps: 500,
            maxSlippageBps: 100,
            maxRepaymentAmount: 10_000e18,
            maxGasFeeWei: 0.05 ether,
            minHealthFactorWad: 1.2e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
        uint256[] memory chains = new uint256[](1);
        chains[0] = block.chainid;
        bytes32[] memory protocols = new bytes32[](1);
        protocols[0] = PROTOCOL_ID;
        address[] memory assets = new address[](2);
        assets[0] = address(inputToken);
        assets[1] = address(outputToken);

        IntentManager.IntentSubmission memory submission = IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("trace-1"),
            commitment: keccak256("intent-1"),
            policyHash: keccak256(abi.encode(policy)),
            nonce: 0,
            expiresAt: uint64(block.timestamp + 1 days),
            targetDeltaWad: 0,
            deltaToleranceWad: 0.1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });
        vm.prank(owner);
        newIntentId = intentManager.submitIntent(submission, chains, protocols, assets);
        vm.prank(owner);
        riskController.configureIntentPolicy(newIntentId, policy);
    }

    function _protocolLimits() private pure returns (MetronTypes.AutomationPolicy memory) {
        return MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 2_000,
            maxCollateralSaleBps: 1_000,
            maxSlippageBps: 300,
            maxRepaymentAmount: type(uint128).max,
            maxGasFeeWei: 1 ether,
            minHealthFactorWad: 1.1e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });
    }
}

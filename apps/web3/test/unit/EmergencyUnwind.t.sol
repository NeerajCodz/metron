// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {CircuitBreaker} from "../../contracts/emergency/CircuitBreaker.sol";
import {EmergencyUnwind, IFlashCallback} from "../../contracts/emergency/EmergencyUnwind.sol";
import {IFlashLiquidityProvider} from "../../contracts/interfaces/IFlashLiquidityProvider.sol";
import {IRecoveryExecutor} from "../../contracts/interfaces/IRecoveryExecutor.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract UnwindToken is ERC20 {
    constructor() ERC20("Unwind USD", "uUSD") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockRecoveryExecutor is IRecoveryExecutor {
    uint256 public calls;
    function recoverPosition(bytes32, MetronTypes.StrategyAction[] calldata, uint256, MetronTypes.PositionStatus)
        external
        returns (bytes32)
    {
        ++calls;
        return keccak256("recovery");
    }
}

contract MockFlashProvider is IFlashLiquidityProvider {
    UnwindToken public immutable token;
    uint256 public feeAmount;
    constructor(UnwindToken token_) { token = token_; }
    function setFee(uint256 amount) external { feeAmount = amount; }
    function flashLoan(address receiver, address loanToken, uint256 amount, bytes calldata data) external {
        token.transfer(receiver, amount);
        IFlashCallback(receiver).onFlashLoan(loanToken, amount, feeAmount, data);
    }
    function repay(address loanToken, uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        loanToken;
    }
}

contract EmergencyUnwindTest is Test {
    address internal admin = address(0xA11CE);
    CircuitBreaker internal breaker;
    UnwindToken internal token;
    MockRecoveryExecutor internal recovery;
    MockFlashProvider internal provider;
    EmergencyUnwind internal unwind;

    function setUp() external {
        breaker = new CircuitBreaker(admin);
        token = new UnwindToken();
        recovery = new MockRecoveryExecutor();
        provider = new MockFlashProvider(token);
        unwind = new EmergencyUnwind(admin, breaker, recovery);
        token.mint(address(provider), 100e18);
        token.mint(address(unwind), 1e18);
        vm.prank(admin);
        unwind.grantRole(keccak256("UNWIND_ROLE"), address(this));
    }

    function testAtomicUnwindRepaysFlashLiquidity() external {
        MetronTypes.StrategyAction[] memory actions = new MetronTypes.StrategyAction[](1);
        bytes32 positionId = keccak256("position");
        bytes32 unwindId = unwind.unwind(
            positionId, actions, MetronTypes.PositionStatus.CLOSED, provider, address(token), 100e18, block.timestamp + 1 days
        );
        assertTrue(unwind.completedUnwinds(unwindId));
        assertEq(recovery.calls(), 1);
        assertEq(token.balanceOf(address(provider)), 100e18 + provider.feeAmount());
    }

    function testInsufficientRepaymentRevertsEntireUnwind() external {
        provider.setFee(2e18);
        MetronTypes.StrategyAction[] memory actions = new MetronTypes.StrategyAction[](1);
        vm.expectRevert();
        unwind.unwind(
            keccak256("position"), actions, MetronTypes.PositionStatus.CLOSED, provider, address(token), 100e18, block.timestamp + 1 days
        );
        assertEq(recovery.calls(), 0);
        assertEq(token.balanceOf(address(unwind)), 1e18);
    }
}

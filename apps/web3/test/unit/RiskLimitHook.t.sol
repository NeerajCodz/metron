// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IUniswapV4Hook} from "../../contracts/interfaces/IUniswapV4Hook.sol";
import {RiskLimitHook} from "../../contracts/hooks/RiskLimitHook.sol";

contract RiskLimitHookTest is Test {
    address private admin = makeAddr("admin");
    address private poolManager = makeAddr("pool-manager");
    address private trader = makeAddr("trader");
    RiskLimitHook private hook;
    IUniswapV4Hook.PoolKey private poolKey;
    bytes32 private poolKeyHash;

    function setUp() public {
        hook = new RiskLimitHook(admin, poolManager);
        poolKey = IUniswapV4Hook.PoolKey({
            currency0: address(1), currency1: address(2), fee: 3_000, tickSpacing: 60, hooks: address(hook)
        });
        poolKeyHash = keccak256(
            abi.encode(poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks)
        );
        vm.startPrank(admin);
        hook.configurePool(poolKeyHash, 100e18, 1 hours, true);
        hook.configureTrader(trader, true);
        vm.stopPrank();
    }

    function test_BeforeSwapEnforcesPolicyAndRecordsTrace() public {
        IUniswapV4Hook.SwapParams memory params =
            IUniswapV4Hook.SwapParams({zeroForOne: true, amountSpecified: -50e18, sqrtPriceLimitX96: 1});
        bytes memory hookData = abi.encode(50e18, block.timestamp + 10 minutes, keccak256("trace"));

        vm.prank(poolManager);
        (bytes4 selector, int256 delta, uint24 fee) = hook.beforeSwap(trader, poolKey, params, hookData);

        assertEq(selector, IUniswapV4Hook.beforeSwap.selector);
        assertEq(delta, 0);
        assertEq(fee, 0);
        (,, uint64 lastSwapAt,) = hook.poolPolicies(poolKeyHash);
        assertEq(lastSwapAt, block.timestamp);
    }

    function test_CooldownAndTradeSizeAreEnforced() public {
        IUniswapV4Hook.SwapParams memory params =
            IUniswapV4Hook.SwapParams({zeroForOne: true, amountSpecified: -50e18, sqrtPriceLimitX96: 1});
        bytes memory hookData = abi.encode(50e18, block.timestamp + 10 minutes, keccak256("trace"));
        vm.prank(poolManager);
        hook.beforeSwap(trader, poolKey, params, hookData);

        vm.prank(poolManager);
        vm.expectRevert(abi.encodeWithSelector(RiskLimitHook.CooldownActive.selector, block.timestamp + 1 hours));
        hook.beforeSwap(trader, poolKey, params, hookData);

        vm.warp(block.timestamp + 1 hours);
        params.amountSpecified = -101e18;
        bytes memory oversizedData = abi.encode(101e18, block.timestamp + 10 minutes, keccak256("trace-2"));
        vm.prank(poolManager);
        vm.expectRevert(abi.encodeWithSelector(RiskLimitHook.TradeTooLarge.selector, 100e18, 101e18));
        hook.beforeSwap(trader, poolKey, params, oversizedData);
    }

    function test_TraderDeadlineAndCallerAuthenticationFailClosed() public {
        IUniswapV4Hook.SwapParams memory params =
            IUniswapV4Hook.SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 1});
        bytes memory data = abi.encode(1e18, block.timestamp + 1, keccak256("trace"));
        vm.expectRevert(abi.encodeWithSelector(RiskLimitHook.UnauthorizedPoolManager.selector, address(this)));
        hook.beforeSwap(trader, poolKey, params, data);

        vm.prank(poolManager);
        vm.expectRevert(abi.encodeWithSelector(RiskLimitHook.UnauthorizedTrader.selector, address(99)));
        hook.beforeSwap(address(99), poolKey, params, data);

        vm.prank(poolManager);
        vm.warp(block.timestamp + 2);
        vm.expectRevert(abi.encodeWithSelector(RiskLimitHook.HookDataExpired.selector, block.timestamp - 1));
        hook.beforeSwap(trader, poolKey, params, abi.encode(1e18, block.timestamp - 1, keccak256("trace")));
    }

    function test_AfterSwapAuthenticatesPoolManager() public {
        IUniswapV4Hook.SwapParams memory params =
            IUniswapV4Hook.SwapParams({zeroForOne: true, amountSpecified: -1e18, sqrtPriceLimitX96: 1});
        vm.prank(poolManager);
        (bytes4 selector, int256 delta) = hook.afterSwap(trader, poolKey, params, 0, bytes(""));
        assertEq(selector, IUniswapV4Hook.afterSwap.selector);
        assertEq(delta, 0);
    }
}

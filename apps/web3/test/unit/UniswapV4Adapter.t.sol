// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {UniswapV4Adapter} from "../../contracts/defi/UniswapV4Adapter.sol";
import {IUniswapV4PoolManager} from "../../contracts/interfaces/IUniswapV4PoolManager.sol";

contract UniswapToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract PoolManagerMock is IUniswapV4PoolManager {
    int256 public swapDelta;
    int256 public liquidityDelta;
    int256 public liquidityFees;

    function setSwapDelta(int128 amount0, int128 amount1) external {
        swapDelta = _pack(amount0, amount1);
    }

    function setLiquidityDelta(int128 amount0, int128 amount1, int256 fees) external {
        liquidityDelta = _pack(amount0, amount1);
        liquidityFees = fees;
    }

    function unlock(bytes calldata data) external returns (bytes memory result) {
        return UniswapV4Adapter(msg.sender).unlockCallback(data);
    }

    function swap(PoolKey calldata, SwapParams calldata, bytes calldata) external returns (int256) {
        return swapDelta;
    }

    function modifyLiquidity(PoolKey calldata, ModifyLiquidityParams calldata, bytes calldata)
        external
        returns (int256 callerDelta, int256 feesAccrued)
    {
        return (liquidityDelta, liquidityFees);
    }

    function sync(address) external {}

    function take(address currency, address to, uint256 amount) external {
        IERC20(currency).transfer(to, amount);
    }

    function settle() external payable returns (uint256 paid) {
        return 0;
    }

    function _pack(int128 amount0, int128 amount1) private pure returns (int256) {
        return (int256(amount0) << 128) | int256(uint256(uint128(amount1)));
    }
}

contract UniswapV4AdapterTest is Test {
    address private admin = makeAddr("admin");
    address private caller = makeAddr("caller");
    UniswapToken private token0;
    UniswapToken private token1;
    PoolManagerMock private poolManager;
    UniswapV4Adapter private adapter;
    IUniswapV4PoolManager.PoolKey private poolKey;

    function setUp() public {
        token0 = new UniswapToken("Token 0", "T0");
        token1 = new UniswapToken("Token 1", "T1");
        poolManager = new PoolManagerMock();
        adapter = new UniswapV4Adapter(admin, poolManager);
        bytes32 callerRole = adapter.CALLER_ROLE();
        vm.prank(admin);
        adapter.grantRole(callerRole, caller);
        if (address(token0) < address(token1)) {
            poolKey = IUniswapV4PoolManager.PoolKey({
                currency0: address(token0), currency1: address(token1), fee: 3_000, tickSpacing: 60, hooks: address(1)
            });
        } else {
            poolKey = IUniswapV4PoolManager.PoolKey({
                currency0: address(token1), currency1: address(token0), fee: 3_000, tickSpacing: 60, hooks: address(1)
            });
        }
    }

    function test_ExactInputSwapSettlesInputAndTakesOutput() public {
        UniswapToken(poolKey.currency0).mint(address(adapter), 100e18);
        UniswapToken(poolKey.currency1).mint(address(poolManager), 95e18);
        poolManager.setSwapDelta(-100e18, 95e18);

        vm.prank(caller);
        uint256 outputAmount = adapter.executeSwap(poolKey, true, -100e18, 1, 95e18, bytes("hook-data"));

        assertEq(outputAmount, 95e18);
        assertEq(IERC20(poolKey.currency0).balanceOf(address(poolManager)), 100e18);
        assertEq(IERC20(poolKey.currency1).balanceOf(address(adapter)), 95e18);
    }

    function test_OutputMinimumRevertsAtomically() public {
        UniswapToken(poolKey.currency0).mint(address(adapter), 100e18);
        UniswapToken(poolKey.currency1).mint(address(poolManager), 95e18);
        poolManager.setSwapDelta(-100e18, 95e18);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(UniswapV4Adapter.OutputBelowMinimum.selector, 96e18, 95e18));
        adapter.executeSwap(poolKey, true, -100e18, 1, 96e18, bytes(""));

        assertEq(IERC20(poolKey.currency0).balanceOf(address(adapter)), 100e18);
        assertEq(IERC20(poolKey.currency1).balanceOf(address(adapter)), 0);
    }

    function test_ModifyLiquiditySettlesReturnedDeltas() public {
        UniswapToken(poolKey.currency0).mint(address(adapter), 10e18);
        UniswapToken(poolKey.currency1).mint(address(adapter), 20e18);
        poolManager.setLiquidityDelta(-10e18, -20e18, 1e18);

        vm.prank(caller);
        (int256 callerDelta, int256 feesAccrued) =
            adapter.modifyLiquidity(poolKey, -600, 600, 1_000e18, keccak256("position"), bytes(""));

        assertEq(callerDelta, _pack(-10e18, -20e18));
        assertEq(feesAccrued, 1e18);
        assertEq(IERC20(poolKey.currency0).balanceOf(address(poolManager)), 10e18);
        assertEq(IERC20(poolKey.currency1).balanceOf(address(poolManager)), 20e18);
    }

    function _pack(int128 amount0, int128 amount1) private pure returns (int256) {
        return (int256(amount0) << 128) | int256(uint256(uint128(amount1)));
    }

    function test_InvalidPoolKeyAndUnauthorizedCallbackFail() public {
        IUniswapV4PoolManager.PoolKey memory invalidKey = poolKey;
        invalidKey.currency0 = poolKey.currency1;
        invalidKey.currency1 = poolKey.currency0;
        vm.prank(caller);
        vm.expectRevert(UniswapV4Adapter.InvalidPoolKey.selector);
        adapter.executeSwap(invalidKey, true, -1, 1, 1, bytes(""));

        vm.expectRevert(abi.encodeWithSelector(UniswapV4Adapter.UnauthorizedCallback.selector, address(this)));
        adapter.unlockCallback(bytes(""));
    }
}

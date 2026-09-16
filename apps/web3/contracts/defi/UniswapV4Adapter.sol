// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniswapV4Adapter} from "../interfaces/IUniswapV4Adapter.sol";
import {IUniswapV4PoolManager} from "../interfaces/IUniswapV4PoolManager.sol";

contract UniswapV4Adapter is AccessControl, IUniswapV4Adapter {
    using SafeERC20 for IERC20;

    bytes32 public constant CALLER_ROLE = keccak256("CALLER_ROLE");

    enum Operation {
        SWAP,
        MODIFY_LIQUIDITY
    }

    error InvalidAddress();
    error InvalidPoolKey();
    error InvalidAmount();
    error InvalidPriceLimit();
    error InvalidMinimumOutput();
    error UnauthorizedCallback(address caller);
    error OutputBelowMinimum(uint256 minimum, uint256 received);
    error InvalidDelta();

    IUniswapV4PoolManager public immutable poolManager;

    event SwapExecuted(
        address indexed currencyIn,
        address indexed currencyOut,
        int256 amountSpecified,
        uint256 outputAmount,
        uint256 minimumOutput
    );
    event LiquidityModified(
        address indexed currency0,
        address indexed currency1,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        int256 callerDelta,
        int256 feesAccrued
    );

    constructor(address admin, IUniswapV4PoolManager poolManager_) {
        if (admin == address(0) || address(poolManager_) == address(0)) revert InvalidAddress();
        poolManager = poolManager_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function executeSwap(
        IUniswapV4PoolManager.PoolKey calldata key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        uint256 minimumOutput,
        bytes calldata hookData
    ) external onlyRole(CALLER_ROLE) returns (uint256 outputAmount) {
        _validatePoolKey(key);
        if (amountSpecified >= 0) revert InvalidAmount();
        if (sqrtPriceLimitX96 == 0) revert InvalidPriceLimit();
        if (minimumOutput == 0) revert InvalidMinimumOutput();

        IUniswapV4PoolManager.SwapParams memory params = IUniswapV4PoolManager.SwapParams({
            zeroForOne: zeroForOne, amountSpecified: amountSpecified, sqrtPriceLimitX96: sqrtPriceLimitX96
        });
        bytes memory result = poolManager.unlock(abi.encode(Operation.SWAP, key, abi.encode(params), hookData));
        int256 swapDelta = abi.decode(result, (int256));
        int256 signedOutput = zeroForOne ? _amount1(swapDelta) : _amount0(swapDelta);
        if (signedOutput <= 0) revert InvalidDelta();
        outputAmount = uint256(signedOutput);
        if (outputAmount < minimumOutput) revert OutputBelowMinimum(minimumOutput, outputAmount);
        emit SwapExecuted(
            zeroForOne ? key.currency0 : key.currency1,
            zeroForOne ? key.currency1 : key.currency0,
            amountSpecified,
            outputAmount,
            minimumOutput
        );
    }

    function modifyLiquidity(
        IUniswapV4PoolManager.PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes32 salt,
        bytes calldata hookData
    ) external onlyRole(CALLER_ROLE) returns (int256 callerDelta, int256 feesAccrued) {
        _validatePoolKey(key);
        if (tickLower >= tickUpper || liquidityDelta == 0) revert InvalidAmount();
        IUniswapV4PoolManager.ModifyLiquidityParams memory params = IUniswapV4PoolManager.ModifyLiquidityParams({
            tickLower: tickLower, tickUpper: tickUpper, liquidityDelta: liquidityDelta, salt: salt
        });
        bytes memory result =
            poolManager.unlock(abi.encode(Operation.MODIFY_LIQUIDITY, key, abi.encode(params), hookData));
        (callerDelta, feesAccrued) = abi.decode(result, (int256, int256));
        emit LiquidityModified(
            key.currency0, key.currency1, tickLower, tickUpper, liquidityDelta, callerDelta, feesAccrued
        );
    }

    function transferAsset(address asset, address recipient, uint256 amount) external onlyRole(CALLER_ROLE) {
        if (asset == address(0) || recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IERC20(asset).safeTransfer(recipient, amount);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory result) {
        if (msg.sender != address(poolManager)) revert UnauthorizedCallback(msg.sender);
        (
            Operation operation,
            IUniswapV4PoolManager.PoolKey memory key,
            bytes memory operationData,
            bytes memory hookData
        ) = abi.decode(data, (Operation, IUniswapV4PoolManager.PoolKey, bytes, bytes));
        if (operation == Operation.SWAP) {
            IUniswapV4PoolManager.SwapParams memory params =
                abi.decode(operationData, (IUniswapV4PoolManager.SwapParams));
            int256 swapDelta = poolManager.swap(key, params, hookData);
            _settleDelta(key, swapDelta);
            return abi.encode(swapDelta);
        }
        IUniswapV4PoolManager.ModifyLiquidityParams memory params =
            abi.decode(operationData, (IUniswapV4PoolManager.ModifyLiquidityParams));
        (int256 callerDelta, int256 feesAccrued) = poolManager.modifyLiquidity(key, params, hookData);
        _settleDelta(key, callerDelta);
        return abi.encode(callerDelta, feesAccrued);
    }

    function _settleDelta(IUniswapV4PoolManager.PoolKey memory key, int256 delta) private {
        _settleCurrency(key.currency0, _amount0(delta));
        _settleCurrency(key.currency1, _amount1(delta));
    }

    function _settleCurrency(address currency, int256 amount) private {
        if (amount < 0) {
            uint256 owed = uint256(-amount);
            poolManager.sync(currency);
            IERC20(currency).safeTransfer(address(poolManager), owed);
            poolManager.settle();
        } else if (amount > 0) {
            poolManager.take(currency, address(this), uint256(amount));
        }
    }

    function _validatePoolKey(IUniswapV4PoolManager.PoolKey calldata key) private pure {
        if (key.currency0 == address(0) || key.currency1 == address(0)) revert InvalidPoolKey();
        if (key.currency0 >= key.currency1 || key.hooks == address(0)) revert InvalidPoolKey();
        if (key.tickSpacing <= 0 || key.fee > 1_000_000) revert InvalidPoolKey();
    }

    function _amount0(int256 delta) private pure returns (int256) {
        return int256(int128(delta >> 128));
    }

    function _amount1(int256 delta) private pure returns (int256) {
        return int256(int128(delta));
    }
}

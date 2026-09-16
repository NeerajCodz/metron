// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IUniswapV4PoolManager} from "./IUniswapV4PoolManager.sol";

interface IUniswapV4Adapter {
    function executeSwap(
        IUniswapV4PoolManager.PoolKey calldata key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        uint256 minimumOutput,
        bytes calldata hookData
    ) external returns (uint256 outputAmount);

    function modifyLiquidity(
        IUniswapV4PoolManager.PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes32 salt,
        bytes calldata hookData
    ) external returns (int256 callerDelta, int256 feesAccrued);
    function transferAsset(address asset, address recipient, uint256 amount) external;
}

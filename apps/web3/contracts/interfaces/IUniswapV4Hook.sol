// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IUniswapV4Hook {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    function beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        returns (bytes4 selector, int256 beforeSwapDelta, uint24 lpFeeOverride);

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        int256 delta,
        bytes calldata hookData
    ) external returns (bytes4 selector, int256 hookDelta);
}

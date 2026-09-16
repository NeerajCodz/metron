// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IFlashLiquidityProvider {
    function flashLoan(address receiver, address token, uint256 amount, bytes calldata data) external;
    function repay(address token, uint256 amount) external;
}

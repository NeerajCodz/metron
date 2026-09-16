// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IPriceObserver {
    function observePrice(address asset) external view returns (uint256 price, uint8 decimals, uint256 updatedAt);
}

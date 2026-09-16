// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IOracleAdapter {
    function getPrice(address asset) external view returns (uint256 priceWad, uint256 updatedAt);
}

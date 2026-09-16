// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IVault {
    function consume(address owner, address asset, bytes32 authorizationId, uint256 amount, address recipient) external;

    function deposit(address asset, uint256 amount, address owner) external returns (uint256 creditedAmount);
}

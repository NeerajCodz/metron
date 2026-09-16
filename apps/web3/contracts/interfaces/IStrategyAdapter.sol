// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IStrategyAdapter {
    /// @dev The adapter receives input assets before this call and must transfer its output
    /// to msg.sender before returning. The caller verifies the actual balance delta.
    function execute(address owner, address inputAsset, address outputAsset, uint256 inputAmount, bytes calldata data)
        external
        returns (bytes32 resultHash);
}

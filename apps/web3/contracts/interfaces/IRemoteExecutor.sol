// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IRemoteExecutor {
    function executeRemote(uint32 srcEid, bytes32 guid, bytes calldata message) external returns (bool success);
}

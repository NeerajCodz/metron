// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MetronTypes} from "../libraries/MetronTypes.sol";

interface IIntentManager {
    function getIntent(bytes32 intentId) external view returns (MetronTypes.IntentAuthorization memory);
    function settleIntent(bytes32 intentId) external;

    function isExecutionAuthorized(bytes32 intentId, uint256 chainId, bytes32 protocolId, address asset)
        external
        view
        returns (bool);
}

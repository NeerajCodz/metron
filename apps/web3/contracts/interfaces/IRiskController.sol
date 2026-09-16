// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {MetronTypes} from "../libraries/MetronTypes.sol";

interface IRiskController {
    function validateExecution(bytes32 intentId, MetronTypes.ExecutionConstraints calldata constraints)
        external
        view
        returns (bool);
}

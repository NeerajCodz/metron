// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface ILayerZeroAdapter {
    function quote(uint32 dstEid, bytes32 receiver, bytes calldata message, bytes calldata options)
        external
        view
        returns (uint256 nativeFee, uint256 lzTokenFee);
    function sendMessage(
        uint32 dstEid,
        bytes32 receiver,
        bytes calldata message,
        bytes calldata options,
        uint64 expiresAt,
        address refundAddress
    ) external payable returns (bytes32 guid);
}

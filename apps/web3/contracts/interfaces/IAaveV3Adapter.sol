// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IAaveV3Adapter {
    function supply(address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount, address recipient) external returns (uint256 withdrawn);

    function borrow(address asset, uint256 amount, uint256 interestRateMode, address recipient) external;

    function repay(address asset, uint256 amount, uint256 interestRateMode) external returns (uint256 repaid);

    function accountData()
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

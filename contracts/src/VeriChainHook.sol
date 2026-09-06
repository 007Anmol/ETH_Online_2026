// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVeriChainStatus {
    function getProductStatus(
        uint256 productId
    ) external view returns (uint8);
}

contract VeriChainHook {
    IVeriChainStatus public registry;

    event SettlementChecked(
        uint256 indexed productId,
        bool allowed
    );

    constructor(
        address registryAddress
    ) {
        registry = IVeriChainStatus(registryAddress);
    }

    function canSettle(
        uint256 productId
    ) public view returns (bool) {
        uint8 status = registry.getProductStatus(productId);

        // 3 = SUSPECT_COUNTERFEIT
        // Settlement is blocked.
        if (status == 3) {
            return false;
        }

        return true;
    }

    function checkSettlement(
        uint256 productId
    ) external returns (bool allowed) {
        allowed = canSettle(productId);

        emit SettlementChecked(
            productId,
            allowed
        );
    }
}
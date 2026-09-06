// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ownable.sol";

interface IVeriChainStatus {
    function getProductStatus(
        uint256 productId
    ) external view returns (uint8);
}

contract VeriChainHook is Ownable {
    IVeriChainStatus public immutable registry;

    event SettlementChecked(
        uint256 indexed productId,
        bool allowed
    );

    constructor(
        address registryAddress
    ) Ownable(msg.sender) {
        require(
            registryAddress != address(0),
            "Invalid registry"
        );

        registry = IVeriChainStatus(
            registryAddress
        );
    }

    function canSettle(
        uint256 productId
    ) public view returns (bool) {
        uint8 status =
            registry.getProductStatus(
                productId
            );

        // SUSPECT_COUNTERFEIT = 3
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
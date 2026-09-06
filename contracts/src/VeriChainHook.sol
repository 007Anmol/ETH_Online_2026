// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ownable.sol";

interface IVeriChainStatus {
    function getProductStatus(
        uint256 productId
    ) external view returns (uint8);
}

interface IVeriChainEscrowStatus {
    function getEscrowStatus(uint256 escrowId) external view returns (uint8);
}

contract VeriChainHook is Ownable {
    IVeriChainStatus public immutable registry;
    IVeriChainEscrowStatus public immutable escrow;

    event SettlementChecked(
        uint256 indexed productId,
        bool allowed
    );

    constructor(
        address registryAddress,
        address escrowAddress
    ) Ownable(msg.sender) {
        require(
            registryAddress != address(0),
            "Invalid registry"
        );

        registry = IVeriChainStatus(
            registryAddress
        );

        require(escrowAddress != address(0), "Invalid escrow");
        escrow = IVeriChainEscrowStatus(escrowAddress);
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

    function canSettle(
        uint256 productId,
        uint256 escrowId
    ) public view returns (bool) {
        if (!canSettle(productId)) {
            return false;
        }

        // ACTIVE = 0. Frozen and released escrow cannot settle again.
        return escrow.getEscrowStatus(escrowId) == 0;
    }

    function checkSettlement(
        uint256 productId,
        uint256 escrowId
    ) external returns (bool allowed) {
        allowed = canSettle(productId, escrowId);

        emit SettlementChecked(
            productId,
            allowed
        );
    }
}
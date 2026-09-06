// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ownable.sol";

interface IVeriChainRegistry {
    function getProductStatus(
        uint256 productId
    ) external view returns (uint8);
}

contract VeriChainEscrow is Ownable {
    enum EscrowStatus {
        ACTIVE,
        FROZEN,
        RELEASED
    }

    struct Escrow {
        uint256 productId;
        address payer;
        address payee;
        uint256 amount;
        EscrowStatus status;
    }

    IVeriChainRegistry public registry;

    uint256 public nextEscrowId = 1;

    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        uint256 indexed productId,
        address indexed payer,
        address payee,
        uint256 amount
    );

    event EscrowFrozen(
        uint256 indexed escrowId,
        uint256 indexed productId
    );

    event EscrowReleased(
        uint256 indexed escrowId,
        uint256 indexed productId,
        address indexed payee,
        uint256 amount
    );

    event EscrowResolved(
        uint256 indexed escrowId,
        uint256 indexed productId
    );

    constructor(
        address registryAddress
    ) Ownable(msg.sender) {
        registry = IVeriChainRegistry(registryAddress);
    }

    function createEscrow(
        uint256 productId,
        address payee
    ) external payable returns (uint256 escrowId) {
        require(msg.value > 0, "Escrow amount is zero");
        require(payee != address(0), "Invalid payee");

        escrowId = nextEscrowId++;

        escrows[escrowId] = Escrow({
            productId: productId,
            payer: msg.sender,
            payee: payee,
            amount: msg.value,
            status: EscrowStatus.ACTIVE
        });

        emit EscrowCreated(
            escrowId,
            productId,
            msg.sender,
            payee,
            msg.value
        );
    }

    function freezeEscrowPool(
        uint256 productId
    ) external onlyOwner {
        for (uint256 i = 1; i < nextEscrowId; i++) {
            Escrow storage escrow = escrows[i];

            if (
                escrow.productId == productId &&
                escrow.status == EscrowStatus.ACTIVE
            ) {
                escrow.status = EscrowStatus.FROZEN;

                emit EscrowFrozen(i, productId);
            }
        }
    }

    function resolveEscrow(
        uint256 escrowId
    ) external onlyOwner {
        Escrow storage escrow = escrows[escrowId];

        require(
            escrow.status == EscrowStatus.FROZEN,
            "Escrow not frozen"
        );

        escrow.status = EscrowStatus.ACTIVE;

        emit EscrowResolved(
            escrowId,
            escrow.productId
        );
    }

    function releaseEscrow(
        uint256 escrowId
    ) external onlyOwner {
        Escrow storage escrow = escrows[escrowId];

        require(
            escrow.status == EscrowStatus.ACTIVE,
            "Escrow not active"
        );

        // Product status:
        // 0 = CREATED
        // 1 = IN_TRANSIT
        // 2 = DELIVERED
        // 3 = SUSPECT_COUNTERFEIT
        // 4 = RESOLVED

        uint8 productStatus =
            registry.getProductStatus(escrow.productId);

        require(
            productStatus != 3,
            "Product flagged"
        );

        escrow.status = EscrowStatus.RELEASED;

        uint256 amount = escrow.amount;
        address payee = escrow.payee;

        escrow.amount = 0;

        (bool success, ) = payable(payee).call{
            value: amount
        }("");

        require(success, "Payment failed");

        emit EscrowReleased(
            escrowId,
            escrow.productId,
            payee,
            amount
        );
    }

    function getEscrowStatus(
        uint256 escrowId
    ) external view returns (EscrowStatus) {
        return escrows[escrowId].status;
    }
}
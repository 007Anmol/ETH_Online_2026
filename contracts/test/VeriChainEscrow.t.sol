// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/VeriChainEscrow.sol";

contract MockRegistry {
    mapping(uint256 => uint8) public statuses;

    function setProductStatus(
        uint256 productId,
        uint8 status
    ) external {
        statuses[productId] = status;
    }

    function getProductStatus(
        uint256 productId
    ) external view returns (uint8) {
        return statuses[productId];
    }
}

contract VeriChainEscrowTest is Test {
    VeriChainEscrow escrow;
    MockRegistry registry;

    address payer = address(1);
    address payee = address(2);
    address attacker = address(3);

    uint256 productId = 1;
    uint256 escrowAmount = 1 ether;

    function setUp() public {
        registry = new MockRegistry();

        escrow = new VeriChainEscrow(
            address(registry)
        );

        vm.deal(payer, 10 ether);
    }

    function testCreateEscrow() public {
        vm.prank(payer);

        uint256 escrowId =
            escrow.createEscrow{value: escrowAmount}(
                productId,
                payee
            );

        (
            uint256 storedProductId,
            address storedPayer,
            address storedPayee,
            uint256 amount,
            VeriChainEscrow.EscrowStatus status
        ) = escrow.escrows(escrowId);

        assertEq(storedProductId, productId);
        assertEq(storedPayer, payer);
        assertEq(storedPayee, payee);
        assertEq(amount, escrowAmount);
        assertEq(
            uint8(status),
            uint8(VeriChainEscrow.EscrowStatus.ACTIVE)
        );
    }

    function testFreezeEscrowPool() public {
        vm.prank(payer);

        uint256 escrowId =
            escrow.createEscrow{value: escrowAmount}(
                productId,
                payee
            );

        escrow.freezeEscrowPool(productId);

        assertEq(
            uint8(escrow.getEscrowStatus(escrowId)),
            uint8(VeriChainEscrow.EscrowStatus.FROZEN)
        );
    }

    function testResolveEscrow() public {
        vm.prank(payer);

        uint256 escrowId =
            escrow.createEscrow{value: escrowAmount}(
                productId,
                payee
            );

        escrow.freezeEscrowPool(productId);

        escrow.resolveEscrow(escrowId);

        assertEq(
            uint8(escrow.getEscrowStatus(escrowId)),
            uint8(VeriChainEscrow.EscrowStatus.ACTIVE)
        );
    }

    function testReleaseEscrow() public {
        vm.prank(payer);

        uint256 escrowId =
            escrow.createEscrow{value: escrowAmount}(
                productId,
                payee
            );

        uint256 payeeBalanceBefore =
            payee.balance;

        escrow.releaseEscrow(escrowId);

        assertEq(
            payee.balance,
            payeeBalanceBefore + escrowAmount
        );

        assertEq(
            uint8(escrow.getEscrowStatus(escrowId)),
            uint8(VeriChainEscrow.EscrowStatus.RELEASED)
        );
    }

    function testCannotReleaseFlaggedProduct() public {
        vm.prank(payer);

        uint256 escrowId =
            escrow.createEscrow{value: escrowAmount}(
                productId,
                payee
            );

        registry.setProductStatus(
            productId,
            3
        );

        vm.expectRevert("Product flagged");

        escrow.releaseEscrow(escrowId);
    }

    function testOnlyOwnerCanFreeze() public {
        vm.prank(payer);

        escrow.createEscrow{value: escrowAmount}(
            productId,
            payee
        );

        vm.prank(attacker);

        vm.expectRevert();

        escrow.freezeEscrowPool(productId);
    }
}
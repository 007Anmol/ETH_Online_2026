// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/VeriChainHook.sol";

contract MockStatusRegistry {
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

contract MockEscrow {
    mapping(uint256 => uint8) public statuses;

    function setEscrowStatus(
        uint256 escrowId,
        uint8 status
    ) external {
        statuses[escrowId] = status;
    }

    function getEscrowStatus(
        uint256 escrowId
    ) external view returns (uint8) {
        return statuses[escrowId];
    }
}

contract VeriChainHookTest is Test {
    VeriChainHook hook;
    MockStatusRegistry registry;
    MockEscrow escrow;

    uint256 productId = 1;

    function setUp() public {
        registry = new MockStatusRegistry();
        escrow = new MockEscrow();

        hook = new VeriChainHook(
            address(registry),
            address(escrow)
        );
    }

    function testCanSettleNormalProduct() public {
        registry.setProductStatus(
            productId,
            0
        );

        assertTrue(
            hook.canSettle(productId)
        );
    }

    function testCannotSettleFlaggedProduct() public {
        registry.setProductStatus(
            productId,
            3
        );

        assertFalse(
            hook.canSettle(productId)
        );
    }

    function testCanSettleResolvedProduct() public {
        registry.setProductStatus(
            productId,
            4
        );

        assertTrue(
            hook.canSettle(productId)
        );
    }

    function testCheckSettlement() public {
        registry.setProductStatus(
            productId,
            0
        );

        bool allowed =
            hook.checkSettlement(productId, 1);

        assertTrue(allowed);
    }

    function testCannotSettleFrozenEscrow() public {
        registry.setProductStatus(productId, 0);
        escrow.setEscrowStatus(1, 1);

        assertFalse(hook.canSettle(productId, 1));
    }
}
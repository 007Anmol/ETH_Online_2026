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

contract VeriChainHookTest is Test {
    VeriChainHook hook;
    MockStatusRegistry registry;

    uint256 productId = 1;

    function setUp() public {
        registry = new MockStatusRegistry();

        hook = new VeriChainHook(
            address(registry)
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
            hook.checkSettlement(productId);

        assertTrue(allowed);
    }
}
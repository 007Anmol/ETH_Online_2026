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

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/test/shared/HookMiner.sol";

contract VeriChainHookTest is Test {
    VeriChainHook hook;
    MockStatusRegistry registry;
    MockEscrow escrow;

    uint256 productId = 1;

    function setUp() public {
        registry = new MockStatusRegistry();
        escrow = new MockEscrow();

        IPoolManager mockManager = IPoolManager(makeAddr("MockPoolManager"));
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(mockManager, address(registry), address(escrow));
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(VeriChainHook).creationCode,
            constructorArgs
        );

        hook = new VeriChainHook{salt: salt}(
            mockManager,
            address(registry),
            address(escrow)
        );
        require(address(hook) == hookAddress, "Hook address mismatch");
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
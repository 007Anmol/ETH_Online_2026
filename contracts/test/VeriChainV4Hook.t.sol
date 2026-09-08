// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {HookMiner} from "v4-periphery/test/shared/HookMiner.sol";
import {VeriChainHook} from "../src/VeriChainHook.sol";

contract MockRegistry {
    mapping(uint256 => uint8) public statuses;

    function setProductStatus(uint256 productId, uint8 status) external {
        statuses[productId] = status;
    }

    function getProductStatus(uint256 productId) external view returns (uint8) {
        return statuses[productId];
    }
}

contract MockEscrowContract {
    mapping(uint256 => uint8) public statuses;

    function setEscrowStatus(uint256 escrowId, uint8 status) external {
        statuses[escrowId] = status;
    }

    function getEscrowStatus(uint256 escrowId) external view returns (uint8) {
        return statuses[escrowId];
    }
}

contract VeriChainV4HookTest is Deployers {
    VeriChainHook hook;
    MockRegistry registry;
    MockEscrowContract escrow;

    uint256 constant PRODUCT_ID = 1024;
    uint256 constant ESCROW_ID = 42;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        registry = new MockRegistry();
        escrow = new MockEscrowContract();

        // Default valid states: product DELIVERED/IN_TRANSIT (0 or 2), escrow ACTIVE (0)
        registry.setProductStatus(PRODUCT_ID, 0);
        escrow.setEscrowStatus(ESCROW_ID, 0);

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(manager, address(registry), address(escrow));
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            type(VeriChainHook).creationCode,
            constructorArgs
        );

        hook = new VeriChainHook{salt: salt}(
            manager,
            address(registry),
            address(escrow)
        );
        require(address(hook) == hookAddress, "Hook address mismatch");

        // Initialize pool with hook using key defined in Deployers
        (key,) = initPoolAndAddLiquidity(
            currency0,
            currency1,
            IHooks(address(hook)),
            3000,
            SQRT_PRICE_1_1
        );
    }

    function testSwapAllowedForNormalProduct() public {
        bytes memory hookData = abi.encode(PRODUCT_ID, ESCROW_ID);

        BalanceDelta delta = swap(
            key,
            true, // zeroForOne
            -100, // exact input
            hookData
        );

        assertTrue(hook.canSettle(PRODUCT_ID, ESCROW_ID));
        assertEq(delta.amount0(), -100);
        assertGt(delta.amount1(), 0);
    }

    function testSwapBlockedForFlaggedProduct() public {
        // SUSPECT_COUNTERFEIT = 3
        registry.setProductStatus(PRODUCT_ID, 3);
        assertFalse(hook.canSettle(PRODUCT_ID, ESCROW_ID));

        bytes memory hookData = abi.encode(PRODUCT_ID, ESCROW_ID);

        vm.expectRevert();
        swap(key, true, -100, hookData);
    }

    function testSwapBlockedForFrozenEscrow() public {
        // FROZEN = 1
        escrow.setEscrowStatus(ESCROW_ID, 1);
        assertFalse(hook.canSettle(PRODUCT_ID, ESCROW_ID));

        bytes memory hookData = abi.encode(PRODUCT_ID, ESCROW_ID);

        vm.expectRevert();
        swap(key, true, -100, hookData);
    }

    function testSwapBlockedWhenMissingHookData() public {
        bytes memory emptyHookData = "";

        vm.expectRevert();
        swap(key, true, -100, emptyHookData);
    }

    function testCanSettleDirectView() public {
        registry.setProductStatus(PRODUCT_ID, 0);
        escrow.setEscrowStatus(ESCROW_ID, 0);
        assertTrue(hook.canSettle(PRODUCT_ID, ESCROW_ID));

        registry.setProductStatus(PRODUCT_ID, 3);
        assertFalse(hook.canSettle(PRODUCT_ID, ESCROW_ID));

        registry.setProductStatus(PRODUCT_ID, 4); // RESOLVED
        assertTrue(hook.canSettle(PRODUCT_ID, ESCROW_ID));
    }
}

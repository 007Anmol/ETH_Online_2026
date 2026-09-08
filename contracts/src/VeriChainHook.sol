// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "./BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import "./Ownable.sol";

interface IVeriChainStatus {
    function getProductStatus(uint256 productId) external view returns (uint8);
}

interface IVeriChainEscrowStatus {
    function getEscrowStatus(uint256 escrowId) external view returns (uint8);
}

contract VeriChainHook is BaseHook, Ownable {
    error SettlementBlockedProductFlagged(uint256 productId, uint8 status);
    error SettlementBlockedEscrowFrozen(uint256 escrowId, uint8 status);
    error InvalidHookData();

    IVeriChainStatus public immutable registry;
    IVeriChainEscrowStatus public immutable escrow;

    event SettlementChecked(
        uint256 indexed productId,
        uint256 indexed escrowId,
        bool allowed
    );

    constructor(
        IPoolManager _poolManager,
        address registryAddress,
        address escrowAddress
    ) BaseHook(_poolManager) Ownable(msg.sender) {
        require(registryAddress != address(0), "Invalid registry");
        require(escrowAddress != address(0), "Invalid escrow");

        registry = IVeriChainStatus(registryAddress);
        escrow = IVeriChainEscrowStatus(escrowAddress);
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function beforeSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        bytes calldata hookData
    ) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        if (hookData.length < 32) {
            revert InvalidHookData();
        }

        uint256 productId;
        uint256 escrowId;

        if (hookData.length >= 64) {
            (productId, escrowId) = abi.decode(hookData, (uint256, uint256));
        } else {
            productId = abi.decode(hookData, (uint256));
        }

        uint8 productStatus = registry.getProductStatus(productId);
        // SUSPECT_COUNTERFEIT = 3
        if (productStatus == 3) {
            revert SettlementBlockedProductFlagged(productId, productStatus);
        }

        if (escrowId > 0) {
            uint8 escrowStatus = escrow.getEscrowStatus(escrowId);
            // ACTIVE = 0. Frozen (1) or released (2) cannot settle
            if (escrowStatus != 0) {
                revert SettlementBlockedEscrowFrozen(escrowId, escrowStatus);
            }
        }

        emit SettlementChecked(productId, escrowId, true);

        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    function canSettle(uint256 productId) public view returns (bool) {
        return registry.getProductStatus(productId) != 3;
    }

    function canSettle(uint256 productId, uint256 escrowId) public view returns (bool) {
        if (!canSettle(productId)) return false;
        return escrow.getEscrowStatus(escrowId) == 0;
    }

    function checkSettlement(uint256 productId, uint256 escrowId) external returns (bool allowed) {
        allowed = canSettle(productId, escrowId);
        emit SettlementChecked(productId, escrowId, allowed);
    }
}
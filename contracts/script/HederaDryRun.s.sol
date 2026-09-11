// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VeriChainRegistry.sol";
import "../src/VeriChainSupplyChain.sol";
import "../src/VeriChainEscrow.sol";

/// @notice Post-deploy Hedera dry-run: Team 1 identity + Team 2 logistics/escrow setup.
contract HederaDryRun is Script {
    function run() external {
        VeriChainRegistry registry = VeriChainRegistry(vm.envAddress("TEAM1_REGISTRY_ADDRESS"));
        VeriChainSupplyChain supplyChain = VeriChainSupplyChain(vm.envAddress("SUPPLY_CHAIN_ADDRESS"));
        VeriChainEscrow escrow = VeriChainEscrow(vm.envAddress("ESCROW_ADDRESS"));

        bytes32 batchId = keccak256(bytes("RADO-2026-001"));
        bytes32 productId = keccak256(bytes("VC-RADO2026001-000001"));
        bytes32 tagId = keccak256(bytes("04DEADBEEF01"));

        vm.startBroadcast();

        address deployer = msg.sender;

        (bool batchExists, , , ) = registry.getBatch(batchId);
        if (!batchExists) {
            registry.createBatch(batchId, 1);
        }

        (bool productExists, , ) = registry.getProduct(productId);
        if (!productExists) {
            bytes32[] memory products = new bytes32[](1);
            products[0] = productId;
            registry.mintBatch(batchId, products);
        }

        (, , bytes32 boundTag) = registry.getProduct(productId);
        if (boundTag == bytes32(0)) {
            registry.bindTag(productId, tagId);
        }

        (, , , bool logisticsExists) = supplyChain.products(1);
        if (!logisticsExists) {
            supplyChain.registerLogisticsProduct(1, productId, deployer);
        }

        uint256 nextShipment = supplyChain.nextShipmentId();
        if (nextShipment == 1) {
            uint256 shipmentId = supplyChain.createShipment(1, deployer);
            supplyChain.acceptShipment(shipmentId);
        }

        if (escrow.nextEscrowId() == 1) {
            escrow.createEscrow{value: 0.01 ether}(1, deployer);
        }

        vm.stopBroadcast();

        console2.log("Registry owner:", registry.owner());
        console2.log("SupplyChain owner:", supplyChain.owner());
        console2.log("Escrow owner:", escrow.owner());
        console2.log("Next shipment id:", supplyChain.nextShipmentId());
        console2.log("Next escrow id:", escrow.nextEscrowId());
        console2.log("Product status:", supplyChain.getProductStatus(1));
    }
}

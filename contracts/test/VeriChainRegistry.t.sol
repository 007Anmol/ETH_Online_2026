// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/VeriChainRegistry.sol";

contract VeriChainRegistryTest is Test {
    VeriChainRegistry registry;

    address manufacturer = address(1);
    address distributor = address(2);
    address logistics = address(3);
    address retailer = address(4);

    uint256 productId = 1;
    uint256 tokenId = 1001;

    bytes32 batchId = bytes32("BATCH-001");
    bytes32 serialNumber = bytes32("SERIAL-001");
    bytes32 tagId = bytes32("TAG-001");

    function setUp() public {
        registry = new VeriChainRegistry();

        vm.prank(registry.owner());

        registry.registerProduct(
            productId,
            tokenId,
            batchId,
            serialNumber,
            tagId,
            manufacturer
        );
    }

    function testProductRegistration() public {
        (
            uint256 storedTokenId,
            bytes32 storedBatchId,
            bytes32 storedSerialNumber,
            bytes32 storedTagId,
            address currentCustodian,
            VeriChainRegistry.ProductStatus status,
            bool exists
        ) = registry.products(productId);

        assertEq(storedTokenId, tokenId);
        assertEq(storedBatchId, batchId);
        assertEq(storedSerialNumber, serialNumber);
        assertEq(storedTagId, tagId);
        assertEq(currentCustodian, manufacturer);
        assertEq(uint8(status), 0);
        assertTrue(exists);
    }

    function testCreateShipment() public {
        vm.prank(manufacturer);

        uint256 shipmentId =
            registry.createShipment(productId, distributor);

        (
            uint256 storedShipmentId,
            uint256 storedProductId,
            address sender,
            address receiver,
            VeriChainRegistry.ShipmentStatus shipmentStatus,
            bool shipmentExists
        ) = registry.shipments(shipmentId);

        assertEq(storedShipmentId, shipmentId);
        assertEq(storedProductId, productId);
        assertEq(sender, manufacturer);
        assertEq(receiver, distributor);
        assertEq(uint8(shipmentStatus), 0);
        assertTrue(shipmentExists);

        assertEq(
            uint8(registry.getProductStatus(productId)),
            1
        );
    }

    function testAcceptShipment() public {
        vm.prank(manufacturer);

        uint256 shipmentId =
            registry.createShipment(productId, distributor);

        vm.prank(distributor);

        registry.acceptShipment(shipmentId);

        (
            uint256 storedTokenId,
            bytes32 storedBatchId,
            bytes32 storedSerialNumber,
            bytes32 storedTagId,
            address currentCustodian,
            VeriChainRegistry.ProductStatus productStatus,
            bool productExists
        ) = registry.products(productId);

        assertEq(currentCustodian, distributor);

        assertEq(
            uint8(productStatus),
            uint8(VeriChainRegistry.ProductStatus.DELIVERED)
        );

        (
            uint256 storedShipmentId,
            uint256 storedProductId,
            address sender,
            address receiver,
            VeriChainRegistry.ShipmentStatus shipmentStatus,
            bool shipmentExists
        ) = registry.shipments(shipmentId);

        assertEq(
            uint8(shipmentStatus),
            uint8(VeriChainRegistry.ShipmentStatus.RECEIVED)
        );
    }

    function testTransferCustody() public {
        vm.prank(manufacturer);

        registry.transferCustody(
            productId,
            distributor
        );

        (
            uint256 storedTokenId,
            bytes32 storedBatchId,
            bytes32 storedSerialNumber,
            bytes32 storedTagId,
            address currentCustodian,
            VeriChainRegistry.ProductStatus status,
            bool exists
        ) = registry.products(productId);

        assertEq(currentCustodian, distributor);
    }

    function testRecordCheckpoint() public {
        registry.recordCheckpoint(
            productId,
            1000,
            190760,
            728778,
            keccak256("Mumbai")
        );

        VeriChainRegistry.Checkpoint[] memory checkpoints =
            registry.getCheckpoints(productId);

        assertEq(checkpoints.length, 1);
        assertEq(checkpoints[0].timestamp, 1000);
        assertEq(checkpoints[0].latitude, 190760);
        assertEq(checkpoints[0].longitude, 728778);
        assertEq(
            checkpoints[0].locationHash,
            keccak256("Mumbai")
        );
    }

    function testRecordAnomaly() public {
        bytes32 reasonHash =
            keccak256("Impossible velocity");

        vm.prank(registry.owner());

        registry.recordAnomaly(
            productId,
            98,
            reasonHash
        );

        assertEq(
            uint8(registry.getProductStatus(productId)),
            uint8(VeriChainRegistry.ProductStatus.SUSPECT_COUNTERFEIT)
        );

        VeriChainRegistry.Anomaly[] memory anomalies =
            registry.getAnomalies(productId);

        assertEq(anomalies.length, 1);
        assertEq(anomalies[0].riskScore, 98);
        assertEq(anomalies[0].reasonHash, reasonHash);
        assertFalse(anomalies[0].resolved);
    }

    function testResolveAnomaly() public {
        vm.startPrank(registry.owner());

        registry.recordAnomaly(
            productId,
            98,
            keccak256("Route deviation")
        );

        registry.resolveAnomaly(productId);

        vm.stopPrank();

        assertEq(
            uint8(registry.getProductStatus(productId)),
            uint8(VeriChainRegistry.ProductStatus.RESOLVED)
        );

        VeriChainRegistry.Anomaly[] memory anomalies =
            registry.getAnomalies(productId);

        assertTrue(anomalies[0].resolved);
    }

    function testOnlyOwnerCanRegisterProduct() public {
        vm.prank(distributor);

        vm.expectRevert();

        registry.registerProduct(
            2,
            1002,
            bytes32("BATCH-002"),
            bytes32("SERIAL-002"),
            bytes32("TAG-002"),
            distributor
        );
    }

    function testOnlyOwnerCanRecordAnomaly() public {
        vm.prank(distributor);

        vm.expectRevert();

        registry.recordAnomaly(
            productId,
            90,
            keccak256("Test anomaly")
        );
    }
}
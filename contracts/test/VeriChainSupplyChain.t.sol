// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VeriChainRegistry} from "../src/VeriChainRegistry.sol";
import {VeriChainSupplyChain} from "../src/VeriChainSupplyChain.sol";
import {VeriChainEscrow} from "../src/VeriChainEscrow.sol";

contract VeriChainSupplyChainTest is Test {
    VeriChainRegistry internal identity;
    VeriChainSupplyChain internal supply;
    VeriChainEscrow internal escrow;

    address internal manufacturer = address(0xA11CE);
    address internal distributor = address(0xB0B);

    bytes32 internal productHash = keccak256(bytes("VC-RADO2026001-000001"));
    bytes32 internal tagHash = keccak256(bytes("04DEADBEEF01"));
    bytes32 internal batchHash = keccak256(bytes("RADO-2026-001"));

    function setUp() public {
        identity = new VeriChainRegistry();
        supply = new VeriChainSupplyChain(address(identity));
        escrow = new VeriChainEscrow(address(supply));

        identity.createBatch(batchHash, 1);
        bytes32[] memory products = new bytes32[](1);
        products[0] = productHash;
        identity.mintBatch(batchHash, products);
        identity.bindTag(productHash, tagHash);

        supply.registerLogisticsProduct(1, productHash, manufacturer);
    }

    function test_registerRequiresTeam1Binding() public {
        bytes32 other = keccak256(bytes("VC-OTHER-1"));
        vm.expectRevert("Team 1 product missing");
        supply.registerLogisticsProduct(2, other, manufacturer);
    }

    function test_shipmentAndAccept() public {
        vm.prank(manufacturer);
        uint256 shipmentId = supply.createShipment(1, distributor);

        vm.prank(distributor);
        supply.acceptShipment(shipmentId);

        assertEq(uint8(supply.getProductStatus(1)), 2);
    }

    function test_anomalyFreezesEscrowRelease() public {
        vm.deal(manufacturer, 1 ether);
        vm.prank(manufacturer);
        uint256 escrowId = escrow.createEscrow{value: 0.1 ether}(1, distributor);

        supply.recordAnomaly(1, 95, keccak256("velocity"));
        assertEq(uint8(supply.getProductStatus(1)), 3);

        escrow.freezeEscrowPool(1);
        assertEq(uint8(escrow.getEscrowStatus(escrowId)), uint8(VeriChainEscrow.EscrowStatus.FROZEN));

        vm.expectRevert("Escrow not active");
        escrow.releaseEscrow(escrowId);
    }
}

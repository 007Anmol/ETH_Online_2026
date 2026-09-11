// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VeriChainRegistry.sol";
import "../src/VeriChainEscrow.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        VeriChainRegistry registry = new VeriChainRegistry();

        VeriChainEscrow escrow = new VeriChainEscrow(
            address(registry)
        );

        registry.registerProduct(
            1,
            1001,
            bytes32("DEMO-BATCH-001"),
            bytes32("DEMO-SERIAL-001"),
            bytes32("DEMO-TAG-001"),
            msg.sender
        );

        vm.stopBroadcast();

        console2.log("Registry:", address(registry));
        console2.log("Escrow:", address(escrow));
        console2.log("Seeded product: 1");
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VeriChainRegistry.sol";
import "../src/VeriChainEscrow.sol";
import "../src/VeriChainHook.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        VeriChainRegistry registry = new VeriChainRegistry();

        VeriChainEscrow escrow = new VeriChainEscrow(
            address(registry)
        );

        VeriChainHook hook = new VeriChainHook(
            address(registry)
        );

        vm.stopBroadcast();

        console2.log("Registry:", address(registry));
        console2.log("Escrow:", address(escrow));
        console2.log("Hook:", address(hook));
    }
}
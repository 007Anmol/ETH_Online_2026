// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VeriChainRegistry.sol";

/// @notice Deploys Team 1 identity registry only.
/// @dev VeriChainEscrow / VeriChainHook are Team 2 settlement boundaries and
///      must be deployed separately once their product-status interface is finalized.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        VeriChainRegistry registry = new VeriChainRegistry();

        vm.stopBroadcast();

        console2.log("VeriChainRegistry (Team 1 identity):", address(registry));
        console2.log("Owner:", registry.owner());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/VeriChainSupplyChain.sol";
import "../src/VeriChainEscrow.sol";

/// @notice Deploys Team 2 logistics + escrow against an existing Team 1 registry.
contract DeployTeam2 is Script {
    function run() external {
        address identity = vm.envAddress("TEAM1_REGISTRY_ADDRESS");

        vm.startBroadcast();

        VeriChainSupplyChain supplyChain = new VeriChainSupplyChain(identity);
        VeriChainEscrow escrow = new VeriChainEscrow(address(supplyChain));

        // Transfer escrow ownership to the same deployer so agent/owner can freeze.
        // Supply chain owner remains deployer for registerLogisticsProduct / recordAnomaly.

        vm.stopBroadcast();

        console2.log("Team1 identity registry:", identity);
        console2.log("VeriChainSupplyChain:", address(supplyChain));
        console2.log("VeriChainEscrow:", address(escrow));
        console2.log("SupplyChain owner:", supplyChain.owner());
        console2.log("Escrow owner:", escrow.owner());
    }
}

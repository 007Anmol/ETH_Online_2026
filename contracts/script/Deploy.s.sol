// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VeriChainRegistry} from "../src/VeriChainRegistry.sol";

/// @notice Deploy VeriChainRegistry once to Hedera testnet (chain id 296), then freeze the address.
/// @dev Hashio currently rejects `forge script` block tags. Use:
///      forge create src/VeriChainRegistry.sol:VeriChainRegistry --rpc-url $HEDERA_TESTNET_RPC_URL --legacy --broadcast
contract Deploy is Script {
    function run() external returns (VeriChainRegistry registry) {
        uint256 deployerKey = vm.envUint("HEDERA_OPERATOR_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        registry = new VeriChainRegistry();
        vm.stopBroadcast();

        console.log("VeriChainRegistry", address(registry));
        console.log("owner", registry.owner());
    }
}

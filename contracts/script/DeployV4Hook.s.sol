// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {HookMiner} from "v4-periphery/test/shared/HookMiner.sol";
import {VeriChainRegistry} from "../src/VeriChainRegistry.sol";
import {VeriChainEscrow} from "../src/VeriChainEscrow.sol";
import {VeriChainHook} from "../src/VeriChainHook.sol";

contract DeployV4Hook is Script {
    // The CREATE2 deployer must already exist on the selected Hedera network.
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("HEDERA_DEPLOYER_PRIVATE_KEY");
        address poolManagerAddress = vm.envAddress("UNISWAP_POOL_MANAGER_ADDRESS");
        require(poolManagerAddress != address(0), "UNISWAP_POOL_MANAGER_ADDRESS is required");

        vm.startBroadcast(deployerPrivateKey);

        VeriChainRegistry registry = new VeriChainRegistry();
        VeriChainEscrow escrow = new VeriChainEscrow(address(registry));

        IPoolManager manager = IPoolManager(poolManagerAddress);

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(manager, address(registry), address(escrow));
        (address hookAddress, bytes32 salt) = HookMiner.find(
            vm.addr(deployerPrivateKey),
            flags,
            type(VeriChainHook).creationCode,
            constructorArgs
        );

        VeriChainHook hook = new VeriChainHook{salt: salt}(
            manager,
            address(registry),
            address(escrow)
        );
        require(address(hook) == hookAddress, "Hook address mismatch");

        vm.stopBroadcast();

        console2.log("--- VeriChain v4 Deployment Summary ---");
        console2.log("Registry:    ", address(registry));
        console2.log("Escrow:      ", address(escrow));
        console2.log("PoolManager: ", address(manager));
        console2.log("V4 Hook:     ", address(hook));
        console2.log("Mined Salt:  ", vm.toString(salt));
    }
}

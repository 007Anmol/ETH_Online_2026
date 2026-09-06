// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VeriChainRegistry} from "../src/VeriChainRegistry.sol";

contract VeriChainRegistryTest is Test {
    VeriChainRegistry internal registry;

    bytes32 internal batchId;
    bytes32 internal productA;
    bytes32 internal productB;
    bytes32 internal productC;
    bytes32 internal tagA;
    bytes32 internal tagB;
    bytes32 internal nonceHash;

    function setUp() public {
        registry = new VeriChainRegistry();
        batchId = keccak256(bytes("RADO-2026-001"));
        productA = keccak256(bytes("VC-RADO2026001-000001"));
        productB = keccak256(bytes("VC-RADO2026001-000002"));
        productC = keccak256(bytes("VC-RADO2026001-000003"));
        tagA = keccak256(bytes("04DEADBEEF01"));
        tagB = keccak256(bytes("04CAFEBABE02"));
        nonceHash = keccak256(bytes("04DEADBEEF01:nonce-1"));
    }

    function _createAndMintTwo() internal {
        registry.createBatch(batchId, 2);
        bytes32[] memory ids = new bytes32[](2);
        ids[0] = productA;
        ids[1] = productB;
        registry.mintBatch(batchId, ids);
    }

    function test_createBatch_storesQuantity() public {
        registry.createBatch(batchId, 3);
        (bool exists, uint32 quantity, uint32 mintedCount, VeriChainRegistry.BatchStatus status) =
            registry.getBatch(batchId);
        assertTrue(exists);
        assertEq(quantity, 3);
        assertEq(mintedCount, 0);
        assertEq(uint8(status), uint8(VeriChainRegistry.BatchStatus.Created));
    }

    function test_createBatch_duplicateReverts() public {
        registry.createBatch(batchId, 3);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainRegistry.BatchAlreadyExists.selector, batchId)
        );
        registry.createBatch(batchId, 3);
    }

    function test_mintBatch_overMintReverts() public {
        registry.createBatch(batchId, 2);
        bytes32[] memory tooMany = new bytes32[](3);
        tooMany[0] = productA;
        tooMany[1] = productB;
        tooMany[2] = productC;
        vm.expectRevert(abi.encodeWithSelector(VeriChainRegistry.OverMint.selector, batchId, uint32(2)));
        registry.mintBatch(batchId, tooMany);
    }

    function test_mintBatch_secondWaveOverMintReverts() public {
        _createAndMintTwo();
        bytes32[] memory extra = new bytes32[](1);
        extra[0] = productC;
        vm.expectRevert(abi.encodeWithSelector(VeriChainRegistry.OverMint.selector, batchId, uint32(0)));
        registry.mintBatch(batchId, extra);
    }

    function test_mintBatch_marksMintedWhenFull() public {
        _createAndMintTwo();
        (bool exists, uint32 quantity, uint32 mintedCount, VeriChainRegistry.BatchStatus status) =
            registry.getBatch(batchId);
        assertTrue(exists);
        assertEq(quantity, 2);
        assertEq(mintedCount, 2);
        assertEq(uint8(status), uint8(VeriChainRegistry.BatchStatus.Minted));

        (bool productExists, bytes32 productBatch,) = registry.getProduct(productA);
        assertTrue(productExists);
        assertEq(productBatch, batchId);
    }

    function test_bindTag_secondBindOfSameTagReverts() public {
        _createAndMintTwo();
        registry.bindTag(productA, tagA);
        vm.expectRevert(abi.encodeWithSelector(VeriChainRegistry.TagAlreadyBound.selector, tagA));
        registry.bindTag(productB, tagA);
    }

    function test_bindTag_secondTagOnSameProductReverts() public {
        _createAndMintTwo();
        registry.bindTag(productA, tagA);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainRegistry.ProductAlreadyBound.selector, productA)
        );
        registry.bindTag(productA, tagB);
    }

    function test_bindTag_storesPair() public {
        _createAndMintTwo();
        registry.bindTag(productA, tagA);
        (, , bytes32 boundTag) = registry.getProduct(productA);
        (bool tagExists, VeriChainRegistry.TagStatus status, bytes32 boundProduct) =
            registry.getTag(tagA);
        assertEq(boundTag, tagA);
        assertTrue(tagExists);
        assertEq(uint8(status), uint8(VeriChainRegistry.TagStatus.Bound));
        assertEq(boundProduct, productA);
    }

    function test_consumeNonce_replayReverts() public {
        _createAndMintTwo();
        registry.bindTag(productA, tagA);
        registry.consumeNonce(tagA, nonceHash);
        assertTrue(registry.isNonceConsumed(nonceHash));
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainRegistry.NonceAlreadyConsumed.selector, nonceHash)
        );
        registry.consumeNonce(tagA, nonceHash);
    }

    function test_revokeTag_freesProductAndBlocksTagReuse() public {
        _createAndMintTwo();
        registry.bindTag(productA, tagA);
        registry.revokeTag(tagA);

        (, VeriChainRegistry.TagStatus status,) = registry.getTag(tagA);
        assertEq(uint8(status), uint8(VeriChainRegistry.TagStatus.Revoked));
        (, , bytes32 boundTag) = registry.getProduct(productA);
        assertEq(boundTag, bytes32(0));

        vm.expectRevert(abi.encodeWithSelector(VeriChainRegistry.TagIsRevoked.selector, tagA));
        registry.bindTag(productB, tagA);

        registry.bindTag(productA, tagB);
        (, , bytes32 replacement) = registry.getProduct(productA);
        assertEq(replacement, tagB);
    }
}

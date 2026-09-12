// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VeriChainConsumerNFT} from "../src/VeriChainConsumerNFT.sol";

contract VeriChainConsumerNFTTest is Test {
    VeriChainConsumerNFT internal nft;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal marketplace = address(0x7A57E7);

    bytes32 internal productA;
    bytes32 internal productB;

    function setUp() public {
        nft = new VeriChainConsumerNFT();
        productA = keccak256(bytes("VC-RADO2026001-000001"));
        productB = keccak256(bytes("VC-RADO2026001-000002"));
    }

    function test_mint_setsOwner() public {
        nft.mint(productA, alice);
        assertEq(nft.ownerOf(productA), alice);
        assertTrue(nft.exists(productA));
    }

    function test_mint_emitsTransferFromZero() public {
        vm.expectEmit(true, true, true, true);
        emit VeriChainConsumerNFT.Transfer(address(0), alice, productA);
        nft.mint(productA, alice);
    }

    function test_mint_onlyOwnerCanMint() public {
        vm.prank(alice);
        vm.expectRevert(VeriChainConsumerNFT.Unauthorized.selector);
        nft.mint(productA, alice);
    }

    function test_mint_cannotMintTwice() public {
        nft.mint(productA, alice);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainConsumerNFT.TokenAlreadyMinted.selector, productA)
        );
        nft.mint(productA, bob);
    }

    function test_mint_rejectsZeroRecipient() public {
        vm.expectRevert(VeriChainConsumerNFT.InvalidRecipient.selector);
        nft.mint(productA, address(0));
    }

    function test_ownerOf_revertsForUnknownToken() public {
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainConsumerNFT.TokenNotFound.selector, productA)
        );
        nft.ownerOf(productA);
    }

    function test_transferFrom_ownerCanTransfer() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        nft.transferFrom(alice, bob, productA);
        assertEq(nft.ownerOf(productA), bob);
    }

    function test_transferFrom_nonOwnerNonApprovedReverts() public {
        nft.mint(productA, alice);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainConsumerNFT.NotOwnerOrApproved.selector, productA)
        );
        nft.transferFrom(alice, bob, productA);
    }

    function test_transferFrom_wrongFromReverts() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(VeriChainConsumerNFT.NotOwner.selector, productA));
        nft.transferFrom(bob, alice, productA);
    }

    function test_transferFrom_rejectsZeroRecipient() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        vm.expectRevert(VeriChainConsumerNFT.InvalidRecipient.selector);
        nft.transferFrom(alice, address(0), productA);
    }

    function test_approve_allowsApprovedSpenderToTransfer() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        nft.approve(marketplace, productA);
        assertEq(nft.getApproved(productA), marketplace);

        vm.prank(marketplace);
        nft.transferFrom(alice, bob, productA);
        assertEq(nft.ownerOf(productA), bob);
    }

    function test_approve_clearsAfterTransfer() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        nft.approve(marketplace, productA);

        vm.prank(marketplace);
        nft.transferFrom(alice, bob, productA);

        assertEq(nft.getApproved(productA), address(0));
    }

    function test_setApprovalForAll_allowsOperatorToTransferAnyToken() public {
        nft.mint(productA, alice);
        nft.mint(productB, alice);

        vm.prank(alice);
        nft.setApprovalForAll(marketplace, true);
        assertTrue(nft.isApprovedForAll(alice, marketplace));

        vm.prank(marketplace);
        nft.transferFrom(alice, bob, productA);
        vm.prank(marketplace);
        nft.transferFrom(alice, bob, productB);

        assertEq(nft.ownerOf(productA), bob);
        assertEq(nft.ownerOf(productB), bob);
    }

    function test_setApprovalForAll_revokedOperatorCannotTransfer() public {
        nft.mint(productA, alice);
        vm.prank(alice);
        nft.setApprovalForAll(marketplace, true);
        vm.prank(alice);
        nft.setApprovalForAll(marketplace, false);

        vm.prank(marketplace);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainConsumerNFT.NotOwnerOrApproved.selector, productA)
        );
        nft.transferFrom(alice, bob, productA);
    }
}

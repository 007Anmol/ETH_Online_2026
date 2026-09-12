// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VeriChainConsumerNFT} from "../src/VeriChainConsumerNFT.sol";
import {VeriChainMarketplace} from "../src/VeriChainMarketplace.sol";

contract VeriChainMarketplaceTest is Test {
    VeriChainConsumerNFT internal nft;
    VeriChainMarketplace internal market;

    address internal seller = address(0xA11CE);
    address internal buyer = address(0xB0B);
    address internal buyer2 = address(0xC0C);

    bytes32 internal productA;
    uint256 internal constant PRICE = 20 ether; // "ether" here == 20 HBAR-equivalent test units

    function setUp() public {
        nft = new VeriChainConsumerNFT();
        market = new VeriChainMarketplace(address(nft));
        productA = keccak256(bytes("VC-RADO2026001-000001"));
    }

    function _mintAndApprove() internal {
        nft.mint(productA, seller);
        vm.prank(seller);
        nft.setApprovalForAll(address(market), true);
    }

    function test_createListing_succeeds() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        VeriChainMarketplace.Listing memory listing = market.getListing(productA);
        assertEq(listing.seller, seller);
        assertEq(listing.price, PRICE);
        assertEq(uint8(listing.status), uint8(VeriChainMarketplace.ListingStatus.Active));
    }

    function test_createListing_revertsIfNotOwner() public {
        _mintAndApprove();
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.SellerNotOwner.selector, productA)
        );
        market.createListing(productA, PRICE);
    }

    function test_createListing_revertsWithoutMarketplaceApproval() public {
        nft.mint(productA, seller);
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.MarketplaceNotApproved.selector, productA)
        );
        market.createListing(productA, PRICE);
    }

    function test_createListing_revertsOnZeroPrice() public {
        _mintAndApprove();
        vm.prank(seller);
        vm.expectRevert(VeriChainMarketplace.InvalidPrice.selector);
        market.createListing(productA, 0);
    }

    function test_createListing_revertsIfBlocked() public {
        _mintAndApprove();
        market.setProductBlocked(productA, true);
        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.ProductIsBlocked.selector, productA)
        );
        market.createListing(productA, PRICE);
    }

    function test_createListing_revertsIfAlreadyActive() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.prank(seller);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.ListingAlreadyActive.selector, productA)
        );
        market.createListing(productA, PRICE);
    }

    function test_cancelListing_succeeds() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.prank(seller);
        market.cancelListing(productA);

        VeriChainMarketplace.Listing memory listing = market.getListing(productA);
        assertEq(uint8(listing.status), uint8(VeriChainMarketplace.ListingStatus.Cancelled));
    }

    function test_cancelListing_revertsForNonSeller() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.prank(buyer);
        vm.expectRevert(VeriChainMarketplace.Unauthorized.selector);
        market.cancelListing(productA);
    }

    function test_buy_cancelledListingReverts() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);
        vm.prank(seller);
        market.cancelListing(productA);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.ListingNotActive.selector, productA)
        );
        market.buy{value: PRICE}(productA);
    }

    function test_buy_succeedsAndTransfersNftAndCreditsSeller() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        market.buy{value: PRICE}(productA);

        assertEq(nft.ownerOf(productA), buyer);
        assertEq(market.pendingWithdrawals(seller), PRICE);

        VeriChainMarketplace.Listing memory listing = market.getListing(productA);
        assertEq(uint8(listing.status), uint8(VeriChainMarketplace.ListingStatus.Sold));
    }

    function test_buy_emitsFullEventSequence() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);
        vm.deal(buyer, PRICE);

        vm.expectEmit(true, true, false, true);
        emit VeriChainMarketplace.EscrowFunded(productA, buyer, PRICE);
        vm.expectEmit(true, true, true, true);
        emit VeriChainMarketplace.NFTTransferred(productA, seller, buyer);
        vm.expectEmit(true, true, false, true);
        emit VeriChainMarketplace.EscrowReleased(productA, seller, PRICE);
        vm.expectEmit(true, true, true, true);
        emit VeriChainMarketplace.SaleCompleted(productA, buyer, seller);

        vm.prank(buyer);
        market.buy{value: PRICE}(productA);
    }

    function test_buy_revertsOnWrongPayment() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.IncorrectPayment.selector, PRICE, PRICE - 1)
        );
        market.buy{value: PRICE - 1}(productA);
    }

    function test_buy_revertsOnSelfBuy() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.deal(seller, PRICE);
        vm.prank(seller);
        vm.expectRevert(abi.encodeWithSelector(VeriChainMarketplace.SelfBuy.selector, productA));
        market.buy{value: PRICE}(productA);
    }

    function test_buy_revertsIfBlockedAfterListing() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);
        market.setProductBlocked(productA, true);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.ProductIsBlocked.selector, productA)
        );
        market.buy{value: PRICE}(productA);

        // Listing must remain Active (never silently marked Sold/Completed
        // on a blocked settlement attempt) and the NFT must not move.
        VeriChainMarketplace.Listing memory listing = market.getListing(productA);
        assertEq(uint8(listing.status), uint8(VeriChainMarketplace.ListingStatus.Active));
        assertEq(nft.ownerOf(productA), seller);
    }

    function test_buy_revertsIfSellerNoLongerOwnsToken() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        // Seller moves the NFT directly (outside the marketplace) after listing.
        vm.prank(seller);
        nft.transferFrom(seller, buyer2, productA);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.SellerNoLongerOwner.selector, productA)
        );
        market.buy{value: PRICE}(productA);
    }

    /// @notice The core double-buy guarantee: two "concurrent" purchase
    ///         attempts for the same listing — only the first-executed one
    ///         succeeds, the second cleanly reverts. On a real chain only one
    ///         transaction can execute first; this proves the contract state
    ///         (not an off-chain lock) is what makes the second one fail.
    function test_buy_doubleBuy_onlyFirstSucceeds() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);

        vm.deal(buyer, PRICE);
        vm.deal(buyer2, PRICE);

        vm.prank(buyer);
        market.buy{value: PRICE}(productA);

        vm.prank(buyer2);
        vm.expectRevert(
            abi.encodeWithSelector(VeriChainMarketplace.ListingNotActive.selector, productA)
        );
        market.buy{value: PRICE}(productA);

        assertEq(nft.ownerOf(productA), buyer);
        assertEq(address(market).balance, PRICE); // buyer2's payment never left their wallet
    }

    function test_withdraw_paysSeller() public {
        _mintAndApprove();
        vm.prank(seller);
        market.createListing(productA, PRICE);
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        market.buy{value: PRICE}(productA);

        uint256 balanceBefore = seller.balance;
        vm.prank(seller);
        market.withdraw();

        assertEq(seller.balance, balanceBefore + PRICE);
        assertEq(market.pendingWithdrawals(seller), 0);
    }

    function test_withdraw_revertsWithNothingOwed() public {
        vm.prank(seller);
        vm.expectRevert(VeriChainMarketplace.NoWithdrawableBalance.selector);
        market.withdraw();
    }

    function test_setProductBlocked_onlyOwner() public {
        vm.prank(buyer);
        vm.expectRevert(VeriChainMarketplace.Unauthorized.selector);
        market.setProductBlocked(productA, true);
    }
}

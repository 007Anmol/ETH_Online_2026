// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {VeriChainConsumerNFT} from "./VeriChainConsumerNFT.sol";

/// @title VeriChainMarketplace
/// @notice Team 3 — consumer-to-consumer resale with on-chain escrow.
/// @dev Deliberately NOT built on the existing `VeriChainEscrow`/`VeriChainHook`
///      stubs: those are reserved for a different (org-to-org, manufacturer/
///      distributor) payment model — see CONSUMER_BACKEND_PLAN.md's
///      "Open decision" note. This contract is wallet-to-wallet and
///      product-safety-gated instead.
///
///      Native HBAR is the settlement currency (this runs on Hedera EVM,
///      where the native token IS HBAR) — `payable`/`msg.value`, not an
///      ERC-20, keeping this consistent with `contracts/foundry.toml`'s
///      `hedera_testnet` RPC target and avoiding an invented token.
///
///      Escrow design: a purchase is a single atomic transaction. Payment
///      custody, the NFT transfer, and payout crediting all happen inside
///      one `buy()` call, protected by checks-effects-interactions and a
///      reentrancy guard, instead of spreading "funded" / "transferred" /
///      "released" across multiple transactions. That is a deliberate
///      security choice, not a shortcut: splitting escrow funding and release
///      into separate transactions would open a real multi-block race window
///      for no benefit here (there is no dispute/arbitration step in this
///      version — the safety gate below is the only thing that can block a
///      sale, and it is checked before any state changes, in the same
///      transaction). The off-chain indexer still observes four distinct
///      events (`EscrowFunded`, `NFTTransferred`, `EscrowReleased`,
///      `SaleCompleted`) from the one confirmed receipt and can present them
///      as sequential steps in the UI.
///
///      Settlement uses a pull-payment pattern (`pendingWithdrawals` +
///      `withdraw()`) rather than pushing HBAR to the seller inside `buy()`,
///      so a malicious/broken seller address can never block or reenter a
///      purchase.
contract VeriChainMarketplace {
    enum ListingStatus {
        None,
        Active,
        Sold,
        Cancelled
    }

    struct Listing {
        address seller;
        uint256 price;
        ListingStatus status;
    }

    error Unauthorized();
    error InvalidPrice();
    error ListingAlreadyActive(bytes32 productIdHash);
    error ListingNotActive(bytes32 productIdHash);
    error SellerNotOwner(bytes32 productIdHash);
    error MarketplaceNotApproved(bytes32 productIdHash);
    error ProductIsBlocked(bytes32 productIdHash);
    error SelfBuy(bytes32 productIdHash);
    error IncorrectPayment(uint256 expected, uint256 sent);
    error SellerNoLongerOwner(bytes32 productIdHash);
    error NoWithdrawableBalance();
    error WithdrawFailed();
    error Reentrant();

    event ListingCreated(
        bytes32 indexed productIdHash,
        address indexed seller,
        uint256 price
    );
    event ListingCancelled(bytes32 indexed productIdHash, address indexed seller);
    event EscrowFunded(
        bytes32 indexed productIdHash,
        address indexed buyer,
        uint256 amount
    );
    event NFTTransferred(
        bytes32 indexed productIdHash,
        address indexed from,
        address indexed to
    );
    event EscrowReleased(
        bytes32 indexed productIdHash,
        address indexed seller,
        uint256 amount
    );
    event SaleCompleted(bytes32 indexed productIdHash, address indexed buyer, address indexed seller);
    event Withdrawn(address indexed seller, uint256 amount);
    event ProductBlockedSet(bytes32 indexed productIdHash, bool isBlocked);

    address public owner;
    VeriChainConsumerNFT public immutable nft;

    mapping(bytes32 productIdHash => Listing) public listings;
    mapping(address seller => uint256 amount) public pendingWithdrawals;

    /// @dev Contracts on Hedera cannot read Supabase's `product_status`
    ///      directly (see CONSUMER_BACKEND_PLAN.md's trust-boundary note on
    ///      SUSPECT_COUNTERFEIT/REVOKED) — this is the explicit, authorized
    ///      on-chain mirror of that flag, synchronized by the backend
    ///      operator only when the off-chain investigation flags a product.
    mapping(bytes32 productIdHash => bool isBlocked) public blocked;

    uint256 private _locked;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (_locked == 1) revert Reentrant();
        _locked = 1;
        _;
        _locked = 0;
    }

    constructor(address nftAddress) {
        owner = msg.sender;
        nft = VeriChainConsumerNFT(nftAddress);
    }

    /// @notice Authorized backend sync point for SUSPECT_COUNTERFEIT/REVOKED.
    ///         A grievance alone must never call this directly — only an
    ///         authorized investigation outcome should (enforced off-chain by
    ///         who is allowed to hold `owner`'s key / call this function).
    function setProductBlocked(bytes32 productIdHash, bool isBlocked) external onlyOwner {
        blocked[productIdHash] = isBlocked;
        emit ProductBlockedSet(productIdHash, isBlocked);
    }

    function createListing(bytes32 productIdHash, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (blocked[productIdHash]) revert ProductIsBlocked(productIdHash);
        if (nft.ownerOf(productIdHash) != msg.sender) {
            revert SellerNotOwner(productIdHash);
        }
        if (listings[productIdHash].status == ListingStatus.Active) {
            revert ListingAlreadyActive(productIdHash);
        }
        bool approvedForAll = nft.isApprovedForAll(msg.sender, address(this));
        bool approvedForToken = nft.getApproved(productIdHash) == address(this);
        if (!approvedForAll && !approvedForToken) {
            revert MarketplaceNotApproved(productIdHash);
        }

        listings[productIdHash] = Listing({
            seller: msg.sender,
            price: price,
            status: ListingStatus.Active
        });

        emit ListingCreated(productIdHash, msg.sender, price);
    }

    function cancelListing(bytes32 productIdHash) external {
        Listing storage listing = listings[productIdHash];
        if (listing.status != ListingStatus.Active) {
            revert ListingNotActive(productIdHash);
        }
        if (listing.seller != msg.sender) revert Unauthorized();

        listing.status = ListingStatus.Cancelled;
        emit ListingCancelled(productIdHash, msg.sender);
    }

    /// @notice Buys an active listing in one atomic, reentrancy-guarded
    ///         transaction. The FIRST call to reach the `status = Sold`
    ///         write wins; every other concurrent call for the same
    ///         `productIdHash` reverts with `ListingNotActive` because the
    ///         status flip happens before any external call — this is the
    ///         contract-level double-buy protection the plan requires
    ///         (Supabase's unique index is defense-in-depth only, not the
    ///         source of truth).
    function buy(bytes32 productIdHash) external payable nonReentrant {
        Listing storage listing = listings[productIdHash];
        if (listing.status != ListingStatus.Active) {
            revert ListingNotActive(productIdHash);
        }
        if (msg.sender == listing.seller) revert SelfBuy(productIdHash);
        if (msg.value != listing.price) {
            revert IncorrectPayment(listing.price, msg.value);
        }
        if (blocked[productIdHash]) revert ProductIsBlocked(productIdHash);
        address seller = listing.seller;
        if (nft.ownerOf(productIdHash) != seller) {
            revert SellerNoLongerOwner(productIdHash);
        }

        // Effects before interactions: flip status first so a re-entrant or
        // racing call for the same product sees ListingNotActive.
        listing.status = ListingStatus.Sold;
        emit EscrowFunded(productIdHash, msg.sender, msg.value);

        // Interaction: the only external call in this function, to a
        // contract we deployed and control the address of (not arbitrary
        // user-supplied code), immediately after effects are finalized.
        nft.transferFrom(seller, msg.sender, productIdHash);
        emit NFTTransferred(productIdHash, seller, msg.sender);

        pendingWithdrawals[seller] += msg.value;
        emit EscrowReleased(productIdHash, seller, msg.value);

        emit SaleCompleted(productIdHash, msg.sender, seller);
    }

    /// @notice Pull-payment settlement — the seller calls this to actually
    ///         receive HBAR credited by a completed sale.
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NoWithdrawableBalance();

        pendingWithdrawals[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert WithdrawFailed();

        emit Withdrawn(msg.sender, amount);
    }

    function getListing(bytes32 productIdHash) external view returns (Listing memory) {
        return listings[productIdHash];
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title VeriChainConsumerNFT
/// @notice Team 3 — consumer ownership token. One token per physical product.
/// @dev Deliberately NOT a generic OpenZeppelin ERC-721 port: this repo has no
///      external Solidity dependencies installed (see contracts/lib — only
///      forge-std), and every other VeriChain contract identifies a product by
///      `bytes32 productIdHash = keccak256(product_code)` (see
///      VeriChainRegistry.sol), not an incrementing uint256. To keep one
///      consistent identity scheme across the whole system, the "tokenId" for
///      this contract IS that same `productIdHash` — there is no separate
///      tokenId <-> productId mapping to keep in sync; they are the same
///      value. This is the "explicitly define productId <-> tokenId mapping"
///      decision required by the plan: the mapping is the identity function.
///
///      Ownership here represents CONSUMER ownership (who currently holds the
///      product after claiming/buying it) — distinct from
///      VeriChainRegistry's manufacturing identity and from Team 2's
///      custody/logistics tracking. A product must be minted here exactly
///      once, by the authorized operator, at the point a consumer first
///      claims it (see `mint`).
contract VeriChainConsumerNFT {
    error Unauthorized();
    error InvalidId();
    error InvalidRecipient();
    error TokenAlreadyMinted(bytes32 productIdHash);
    error TokenNotFound(bytes32 productIdHash);
    error NotOwnerOrApproved(bytes32 productIdHash);
    error NotOwner(bytes32 productIdHash);

    event Transfer(
        address indexed from,
        address indexed to,
        bytes32 indexed productIdHash
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        bytes32 indexed productIdHash
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    address public owner;

    mapping(bytes32 productIdHash => address currentOwner) private _owners;
    mapping(bytes32 productIdHash => address approvedSpender) private _tokenApprovals;
    mapping(address tokenOwner => mapping(address operator => bool)) private _operatorApprovals;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Mints consumer ownership for a product exactly once. Called by
    ///         the authorized backend operator at the moment a consumer's
    ///         ownership claim is confirmed (never re-mintable afterwards —
    ///         all further movement goes through `transferFrom`).
    function mint(bytes32 productIdHash, address initialOwner) external onlyOwner {
        if (productIdHash == bytes32(0)) revert InvalidId();
        if (initialOwner == address(0)) revert InvalidRecipient();
        if (_owners[productIdHash] != address(0)) {
            revert TokenAlreadyMinted(productIdHash);
        }

        _owners[productIdHash] = initialOwner;
        emit Transfer(address(0), initialOwner, productIdHash);
    }

    function ownerOf(bytes32 productIdHash) public view returns (address) {
        address tokenOwner = _owners[productIdHash];
        if (tokenOwner == address(0)) revert TokenNotFound(productIdHash);
        return tokenOwner;
    }

    function exists(bytes32 productIdHash) external view returns (bool) {
        return _owners[productIdHash] != address(0);
    }

    /// @notice Approves a single spender (typically the marketplace contract)
    ///         to move exactly this one token on the owner's behalf.
    function approve(address spender, bytes32 productIdHash) external {
        address tokenOwner = ownerOf(productIdHash);
        if (msg.sender != tokenOwner && !_operatorApprovals[tokenOwner][msg.sender]) {
            revert NotOwnerOrApproved(productIdHash);
        }
        _tokenApprovals[productIdHash] = spender;
        emit Approval(tokenOwner, spender, productIdHash);
    }

    function getApproved(bytes32 productIdHash) external view returns (address) {
        // Reverts via ownerOf if the token doesn't exist, keeping "approved
        // for a token that doesn't exist" impossible to observe as anything
        // other than a revert.
        ownerOf(productIdHash);
        return _tokenApprovals[productIdHash];
    }

    /// @notice Blanket-approves an operator (the marketplace contract) to
    ///         move ANY of the caller's tokens — this is what lets a seller
    ///         list a product once and have the marketplace settle it later
    ///         without a second on-chain approval per listing.
    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) public view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    /// @notice Direct consumer-to-consumer ownership transfer (no payment, no
    ///         escrow) — this is what backs the "Transfer" feature. Also used
    ///         internally by the marketplace contract to settle a sale.
    function transferFrom(address from, address to, bytes32 productIdHash) external {
        address tokenOwner = ownerOf(productIdHash);
        if (tokenOwner != from) revert NotOwner(productIdHash);
        if (to == address(0)) revert InvalidRecipient();

        bool isOwner = msg.sender == from;
        bool isApprovedSpender = _tokenApprovals[productIdHash] == msg.sender;
        bool isApprovedOperator = _operatorApprovals[from][msg.sender];
        if (!isOwner && !isApprovedSpender && !isApprovedOperator) {
            revert NotOwnerOrApproved(productIdHash);
        }

        _tokenApprovals[productIdHash] = address(0);
        _owners[productIdHash] = to;

        emit Transfer(from, to, productIdHash);
    }
}

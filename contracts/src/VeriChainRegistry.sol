// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @title VeriChainRegistry
/// @notice Team 1 identity. Ids are keccak256 hashes computed off-chain from
///         batch_code, product_code, tag_uid, and tag_uid:nonce.
/// @dev Names, plant, and category stay off-chain. Do not write identity here
///      onto VeriChainHook or VeriChainEscrow.
contract VeriChainRegistry {
    enum BatchStatus {
        Created,
        Minted
    }

    enum TagStatus {
        Unset,
        Bound,
        Revoked
    }

    struct Batch {
        bool exists;
        uint32 quantity;
        uint32 mintedCount;
        BatchStatus status;
    }

    struct Product {
        bool exists;
        bytes32 batchIdHash;
        bytes32 boundTagIdHash;
    }

    struct Tag {
        bool exists;
        TagStatus status;
        bytes32 productIdHash;
    }

    error Unauthorized();
    error InvalidQuantity();
    error InvalidId();
    error BatchAlreadyExists(bytes32 batchIdHash);
    error BatchNotFound(bytes32 batchIdHash);
    error OverMint(bytes32 batchIdHash, uint32 remaining);
    error ProductAlreadyMinted(bytes32 productIdHash);
    error ProductNotFound(bytes32 productIdHash);
    error ProductAlreadyBound(bytes32 productIdHash);
    error TagAlreadyBound(bytes32 tagIdHash);
    error TagIsRevoked(bytes32 tagIdHash);
    error TagNotBound(bytes32 tagIdHash);
    error NonceAlreadyConsumed(bytes32 nonceHash);

    event BatchCreated(bytes32 indexed batchIdHash, uint32 quantity);
    event BatchMinted(
        bytes32 indexed batchIdHash,
        uint32 added,
        uint32 mintedCount
    );
    event TagBound(bytes32 indexed productIdHash, bytes32 indexed tagIdHash);
    event TagRevoked(bytes32 indexed productIdHash, bytes32 indexed tagIdHash);
    event NonceConsumed(bytes32 indexed tagIdHash, bytes32 indexed nonceHash);

    address public owner;

    mapping(bytes32 batchIdHash => Batch) private batches;
    mapping(bytes32 productIdHash => Product) private products;
    mapping(bytes32 tagIdHash => Tag) private tags;
    mapping(bytes32 nonceHash => bool) private consumedNonces;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createBatch(
        bytes32 batchIdHash,
        uint32 quantity
    ) external onlyOwner {
        if (batchIdHash == bytes32(0)) revert InvalidId();
        if (quantity == 0) revert InvalidQuantity();
        if (batches[batchIdHash].exists) {
            revert BatchAlreadyExists(batchIdHash);
        }

        batches[batchIdHash] = Batch({
            exists: true,
            quantity: quantity,
            mintedCount: 0,
            status: BatchStatus.Created
        });

        emit BatchCreated(batchIdHash, quantity);
    }

    function mintBatch(
        bytes32 batchIdHash,
        bytes32[] calldata productIdHashes
    ) external onlyOwner {
        Batch storage batch = batches[batchIdHash];
        if (!batch.exists) revert BatchNotFound(batchIdHash);

        uint256 added = productIdHashes.length;
        if (added == 0) revert InvalidQuantity();

        uint32 remaining = batch.quantity - batch.mintedCount;
        if (added > remaining) {
            revert OverMint(batchIdHash, remaining);
        }

        for (uint256 i = 0; i < added; ++i) {
            bytes32 productIdHash = productIdHashes[i];
            if (productIdHash == bytes32(0)) revert InvalidId();
            if (products[productIdHash].exists) {
                revert ProductAlreadyMinted(productIdHash);
            }
            products[productIdHash] = Product({
                exists: true,
                batchIdHash: batchIdHash,
                boundTagIdHash: bytes32(0)
            });
        }

        batch.mintedCount += uint32(added);
        if (batch.mintedCount == batch.quantity) {
            batch.status = BatchStatus.Minted;
        }

        emit BatchMinted(batchIdHash, uint32(added), batch.mintedCount);
    }

    function bindTag(
        bytes32 productIdHash,
        bytes32 tagIdHash
    ) external onlyOwner {
        if (productIdHash == bytes32(0) || tagIdHash == bytes32(0)) {
            revert InvalidId();
        }

        Product storage product = products[productIdHash];
        if (!product.exists) revert ProductNotFound(productIdHash);
        if (product.boundTagIdHash != bytes32(0)) {
            revert ProductAlreadyBound(productIdHash);
        }

        Tag storage tag = tags[tagIdHash];
        if (tag.exists) {
            if (tag.status == TagStatus.Bound) revert TagAlreadyBound(tagIdHash);
            if (tag.status == TagStatus.Revoked) revert TagIsRevoked(tagIdHash);
        }

        product.boundTagIdHash = tagIdHash;
        tags[tagIdHash] = Tag({
            exists: true,
            status: TagStatus.Bound,
            productIdHash: productIdHash
        });

        emit TagBound(productIdHash, tagIdHash);
    }

    function revokeTag(bytes32 tagIdHash) external onlyOwner {
        if (tagIdHash == bytes32(0)) revert InvalidId();

        Tag storage tag = tags[tagIdHash];
        if (!tag.exists || tag.status != TagStatus.Bound) {
            revert TagNotBound(tagIdHash);
        }

        bytes32 productIdHash = tag.productIdHash;
        products[productIdHash].boundTagIdHash = bytes32(0);
        tag.status = TagStatus.Revoked;
        tag.productIdHash = bytes32(0);

        emit TagRevoked(productIdHash, tagIdHash);
    }

    function consumeNonce(
        bytes32 tagIdHash,
        bytes32 nonceHash
    ) external onlyOwner {
        if (tagIdHash == bytes32(0) || nonceHash == bytes32(0)) {
            revert InvalidId();
        }

        Tag storage tag = tags[tagIdHash];
        if (!tag.exists || tag.status != TagStatus.Bound) {
            revert TagNotBound(tagIdHash);
        }
        if (consumedNonces[nonceHash]) {
            revert NonceAlreadyConsumed(nonceHash);
        }

        consumedNonces[nonceHash] = true;
        emit NonceConsumed(tagIdHash, nonceHash);
    }

    function getBatch(
        bytes32 batchIdHash
    )
        external
        view
        returns (
            bool exists,
            uint32 quantity,
            uint32 mintedCount,
            BatchStatus status
        )
    {
        Batch storage batch = batches[batchIdHash];
        return (batch.exists, batch.quantity, batch.mintedCount, batch.status);
    }

    function getProduct(
        bytes32 productIdHash
    )
        external
        view
        returns (bool exists, bytes32 batchIdHash, bytes32 boundTagIdHash)
    {
        Product storage product = products[productIdHash];
        return (product.exists, product.batchIdHash, product.boundTagIdHash);
    }

    function getTag(
        bytes32 tagIdHash
    )
        external
        view
        returns (bool exists, TagStatus status, bytes32 productIdHash)
    {
        Tag storage tag = tags[tagIdHash];
        return (tag.exists, tag.status, tag.productIdHash);
    }

    function isNonceConsumed(bytes32 nonceHash) external view returns (bool) {
        return consumedNonces[nonceHash];
    }
}

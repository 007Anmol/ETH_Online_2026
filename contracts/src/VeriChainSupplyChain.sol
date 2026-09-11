// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Ownable.sol";

/// @notice Minimal Team 1 identity read surface.
interface IVeriChainIdentity {
    function getProduct(
        bytes32 productIdHash
    )
        external
        view
        returns (bool exists, bytes32 batchIdHash, bytes32 boundTagIdHash);
}

/// @title VeriChainSupplyChain
/// @notice Team 2 logistics / custody / anomaly state.
/// @dev Separated from Team 1 VeriChainRegistry identity. Escrow/Hook read
///      getProductStatus(uint256) from this contract.
contract VeriChainSupplyChain is Ownable {
    enum ProductStatus {
        CREATED,
        IN_TRANSIT,
        DELIVERED,
        SUSPECT_COUNTERFEIT,
        RESOLVED
    }

    enum ShipmentStatus {
        CREATED,
        IN_TRANSIT,
        RECEIVED,
        CANCELLED
    }

    struct Product {
        bytes32 team1ProductIdHash;
        address currentCustodian;
        ProductStatus status;
        bool exists;
    }

    struct Shipment {
        uint256 shipmentId;
        uint256 productId;
        address sender;
        address receiver;
        ShipmentStatus status;
        bool exists;
    }

    struct Checkpoint {
        uint256 timestamp;
        int256 latitude;
        int256 longitude;
        bytes32 locationHash;
        address recordedBy;
    }

    struct Anomaly {
        uint256 riskScore;
        bytes32 reasonHash;
        uint256 timestamp;
        bool resolved;
    }

    IVeriChainIdentity public identity;

    uint256 public nextShipmentId = 1;

    mapping(uint256 => Product) public products;
    mapping(bytes32 => uint256) public productIdByTeam1Hash;
    mapping(uint256 => Shipment) public shipments;
    mapping(uint256 => Checkpoint[]) private productCheckpoints;
    mapping(uint256 => Anomaly[]) private productAnomalies;

    event LogisticsProductRegistered(
        uint256 indexed productId,
        bytes32 indexed team1ProductIdHash,
        address indexed custodian
    );

    event ShipmentCreated(
        uint256 indexed shipmentId,
        uint256 indexed productId,
        address indexed sender,
        address receiver
    );

    event CustodyTransferred(
        uint256 indexed productId,
        address indexed from,
        address indexed to
    );

    event ShipmentReceived(
        uint256 indexed shipmentId,
        uint256 indexed productId,
        address indexed receiver
    );

    event CheckpointRecorded(
        uint256 indexed productId,
        uint256 timestamp,
        int256 latitude,
        int256 longitude,
        bytes32 locationHash
    );

    event AnomalyDetected(
        uint256 indexed productId,
        uint256 riskScore,
        bytes32 reasonHash
    );

    event AnomalyResolved(uint256 indexed productId);

    constructor(address identityRegistry) Ownable(msg.sender) {
        require(identityRegistry != address(0), "Invalid identity");
        identity = IVeriChainIdentity(identityRegistry);
    }

    /// @notice Bridge a Team 1 identity hash into Team 2 logistics product id.
    function registerLogisticsProduct(
        uint256 productId,
        bytes32 team1ProductIdHash,
        address initialCustodian
    ) external onlyOwner {
        require(productId != 0, "Invalid product id");
        require(team1ProductIdHash != bytes32(0), "Invalid team1 hash");
        require(initialCustodian != address(0), "Invalid custodian");
        require(!products[productId].exists, "Product already exists");
        require(productIdByTeam1Hash[team1ProductIdHash] == 0, "Hash already linked");

        (bool exists, , bytes32 boundTag) = identity.getProduct(team1ProductIdHash);
        require(exists, "Team 1 product missing");
        require(boundTag != bytes32(0), "Team 1 tag not bound");

        products[productId] = Product({
            team1ProductIdHash: team1ProductIdHash,
            currentCustodian: initialCustodian,
            status: ProductStatus.CREATED,
            exists: true
        });
        productIdByTeam1Hash[team1ProductIdHash] = productId;

        emit LogisticsProductRegistered(productId, team1ProductIdHash, initialCustodian);
    }

    function createShipment(
        uint256 productId,
        address receiver
    ) external returns (uint256 shipmentId) {
        Product storage product = products[productId];

        require(product.exists, "Product does not exist");
        require(msg.sender == product.currentCustodian, "Not current custodian");
        require(receiver != address(0), "Invalid receiver");
        require(product.status != ProductStatus.IN_TRANSIT, "Product already in shipment");
        require(
            product.status != ProductStatus.SUSPECT_COUNTERFEIT,
            "Product flagged"
        );

        shipmentId = nextShipmentId++;

        shipments[shipmentId] = Shipment({
            shipmentId: shipmentId,
            productId: productId,
            sender: msg.sender,
            receiver: receiver,
            status: ShipmentStatus.CREATED,
            exists: true
        });

        product.status = ProductStatus.IN_TRANSIT;

        emit ShipmentCreated(shipmentId, productId, msg.sender, receiver);
    }

    function acceptShipment(uint256 shipmentId) external {
        Shipment storage shipment = shipments[shipmentId];

        require(shipment.exists, "Shipment does not exist");
        require(msg.sender == shipment.receiver, "Not shipment receiver");
        require(
            shipment.status == ShipmentStatus.CREATED ||
                shipment.status == ShipmentStatus.IN_TRANSIT,
            "Invalid shipment state"
        );

        Product storage product = products[shipment.productId];
        require(
            product.currentCustodian == shipment.sender,
            "Shipment is no longer active"
        );

        address previousCustodian = product.currentCustodian;
        product.currentCustodian = msg.sender;
        product.status = ProductStatus.DELIVERED;
        shipment.status = ShipmentStatus.RECEIVED;

        emit CustodyTransferred(shipment.productId, previousCustodian, msg.sender);
        emit ShipmentReceived(shipmentId, shipment.productId, msg.sender);
    }

    function transferCustody(uint256 productId, address newCustodian) external {
        Product storage product = products[productId];

        require(product.exists, "Product does not exist");
        require(msg.sender == product.currentCustodian, "Not current custodian");
        require(newCustodian != address(0), "Invalid custodian");

        address previousCustodian = product.currentCustodian;
        product.currentCustodian = newCustodian;

        emit CustodyTransferred(productId, previousCustodian, newCustodian);
    }

    function recordCheckpoint(
        uint256 productId,
        uint256 timestamp,
        int256 latitude,
        int256 longitude,
        bytes32 locationHash
    ) external {
        require(products[productId].exists, "Product does not exist");

        productCheckpoints[productId].push(
            Checkpoint({
                timestamp: timestamp,
                latitude: latitude,
                longitude: longitude,
                locationHash: locationHash,
                recordedBy: msg.sender
            })
        );

        emit CheckpointRecorded(productId, timestamp, latitude, longitude, locationHash);
    }

    function recordAnomaly(
        uint256 productId,
        uint256 riskScore,
        bytes32 reasonHash
    ) external onlyOwner {
        require(products[productId].exists, "Product does not exist");
        require(riskScore <= 100, "Invalid risk score");

        productAnomalies[productId].push(
            Anomaly({
                riskScore: riskScore,
                reasonHash: reasonHash,
                timestamp: block.timestamp,
                resolved: false
            })
        );

        products[productId].status = ProductStatus.SUSPECT_COUNTERFEIT;
        emit AnomalyDetected(productId, riskScore, reasonHash);
    }

    function resolveAnomaly(uint256 productId) external onlyOwner {
        Product storage product = products[productId];
        require(product.exists, "Product does not exist");

        product.status = ProductStatus.RESOLVED;

        if (productAnomalies[productId].length > 0) {
            productAnomalies[productId][productAnomalies[productId].length - 1]
                .resolved = true;
        }

        emit AnomalyResolved(productId);
    }

    function getProductStatus(uint256 productId) external view returns (uint8) {
        return uint8(products[productId].status);
    }

    function getCheckpoints(
        uint256 productId
    ) external view returns (Checkpoint[] memory) {
        return productCheckpoints[productId];
    }

    function getAnomalies(
        uint256 productId
    ) external view returns (Anomaly[] memory) {
        return productAnomalies[productId];
    }
}

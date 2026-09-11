/**
 * Team 2 supply-chain ABI (VeriChainSupplyChain).
 * Identity remains on Team 1 VeriChainRegistry.
 */
export const legacySupplyChainAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "nextShipmentId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getProductStatus",
    stateMutability: "view",
    inputs: [{ name: "productId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "products",
    stateMutability: "view",
    inputs: [{ name: "productId", type: "uint256" }],
    outputs: [
      { name: "team1ProductIdHash", type: "bytes32" },
      { name: "currentCustodian", type: "address" },
      { name: "status", type: "uint8" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "registerLogisticsProduct",
    stateMutability: "nonpayable",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "team1ProductIdHash", type: "bytes32" },
      { name: "initialCustodian", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "shipments",
    stateMutability: "view",
    inputs: [{ name: "shipmentId", type: "uint256" }],
    outputs: [
      { name: "shipmentId", type: "uint256" },
      { name: "productId", type: "uint256" },
      { name: "sender", type: "address" },
      { name: "receiver", type: "address" },
      { name: "status", type: "uint8" },
      { name: "exists", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "createShipment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shipmentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "acceptShipment",
    stateMutability: "nonpayable",
    inputs: [{ name: "shipmentId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transferCustody",
    stateMutability: "nonpayable",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "newCustodian", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordCheckpoint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "latitude", type: "int256" },
      { name: "longitude", type: "int256" },
      { name: "locationHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordAnomaly",
    stateMutability: "nonpayable",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "riskScore", type: "uint256" },
      { name: "reasonHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "ShipmentCreated",
    inputs: [
      { name: "shipmentId", type: "uint256", indexed: true },
      { name: "productId", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "receiver", type: "address", indexed: false },
    ],
  },
] as const;

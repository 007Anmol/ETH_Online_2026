export const hookAbi = [
  {
    type: "function",
    name: "canSettle",
    stateMutability: "view",
    inputs: [
      { name: "productId", type: "uint256" },
      { name: "escrowId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
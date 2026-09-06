export const registryAbi = [
  {
    type: "function",
    name: "getProductStatus",
    stateMutability: "view",
    inputs: [
      {
        name: "productId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },
] as const;
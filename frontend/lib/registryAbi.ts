export const registryAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },
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
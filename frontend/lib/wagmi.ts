import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";
const isMainnet = network === "mainnet";
const testnetRpcUrl = process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL ?? "https://testnet.hashio.io/api";
const mainnetRpcUrl = process.env.NEXT_PUBLIC_HEDERA_MAINNET_RPC_URL ?? "https://mainnet.hashio.io/api";
const rpcUrl = process.env.NEXT_PUBLIC_HEDERA_RPC_URL ?? (isMainnet ? mainnetRpcUrl : testnetRpcUrl);

export const hedera = defineChain({
  id: isMainnet ? 295 : 296,
  name: isMainnet ? "Hedera Mainnet" : "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: {
    default: {
      name: "HashScan",
      url: isMainnet ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet",
    },
  },
});

export const config = createConfig({
  chains: [hedera],
  connectors: [injected()],
  transports: {
    295: http(mainnetRpcUrl),
    296: http(testnetRpcUrl),
  },
});
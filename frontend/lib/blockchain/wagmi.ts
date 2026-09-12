import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, type Chain } from "viem";

const network = (process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet").toLowerCase();
const configuredChainId = Number(process.env.NEXT_PUBLIC_HEDERA_CHAIN_ID ?? "");
const testnetRpcUrl =
  process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL ?? "https://testnet.hashio.io/api";
const mainnetRpcUrl =
  process.env.NEXT_PUBLIC_HEDERA_MAINNET_RPC_URL ?? "https://mainnet.hashio.io/api";
const rpcUrl =
  process.env.NEXT_PUBLIC_HEDERA_RPC_URL ??
  (network === "mainnet" ? mainnetRpcUrl : testnetRpcUrl);

const isLocal =
  network === "local" ||
  network === "anvil" ||
  configuredChainId === 31337 ||
  rpcUrl.includes("127.0.0.1") ||
  rpcUrl.includes("localhost");

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [testnetRpcUrl] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
});

export const hederaMainnet = defineChain({
  id: 295,
  name: "Hedera Mainnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [mainnetRpcUrl] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/mainnet" },
  },
});

export const anvil = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl || "http://127.0.0.1:8545"] } },
});

/** Active chain for this frontend session (local Anvil or Hedera). */
export const hedera: Chain = isLocal
  ? anvil
  : network === "mainnet"
    ? hederaMainnet
    : hederaTestnet;

export const config = createConfig({
  chains: [hedera],
  connectors: [injected()],
  transports: {
    [hedera.id]: http(rpcUrl, {
      batch: false,
      retryCount: 3,
      timeout: 60_000,
    }),
  },
});

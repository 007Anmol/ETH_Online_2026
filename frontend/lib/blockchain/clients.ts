import { createPublicClient, http } from "viem";
import { hedera } from "./wagmi";

const rpcUrl =
  process.env.NEXT_PUBLIC_HEDERA_RPC_URL ??
  process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL ??
  hedera.rpcUrls.default.http[0] ??
  "https://testnet.hashio.io/api";

/** Read-only viem client for Team 1 Registry queries. */
export const publicClient = createPublicClient({
  chain: hedera,
  transport: http(rpcUrl),
});

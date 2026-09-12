"use client";

import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import { createPublicClient, http, type Abi } from "viem";
import { HEDERA_TESTNET } from "@/lib/consumer/chain/hedera-wallet-client";

const consumerNftAbi = consumerNftAbiJson as Abi;
const NFT_CONTRACT_ADDRESS = "0xF217e76F80a2743769B3f6D51bE1F1B6C2cC7b49" as const;
const MARKETPLACE_CONTRACT_ADDRESS = "0xCC98075D05c02a7f136ff534bB01C5bE4476da4F" as const;

const publicClient = createPublicClient({
  chain: HEDERA_TESTNET,
  transport: http(HEDERA_TESTNET.rpcUrls.default.http[0]),
});

/**
 * Client-safe on-chain read — `@verichain/hedera`'s equivalent
 * (`isMarketplaceApproved`) can't be imported into a client bundle, since it
 * transitively pulls in `services/hedera/src/client.ts`'s
 * `import "server-only"`. Same pattern as lib/consumer/chain/hbar-units.ts.
 */
export async function isMarketplaceApprovedClient(ownerAddress: `0x${string}`): Promise<boolean> {
  return (await publicClient.readContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: consumerNftAbi,
    functionName: "isApprovedForAll",
    args: [ownerAddress, MARKETPLACE_CONTRACT_ADDRESS],
  })) as boolean;
}

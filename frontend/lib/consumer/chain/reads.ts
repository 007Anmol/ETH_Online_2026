"use client";

import consumerNftAbiJson from "@verichain/shared/abi/VeriChainConsumerNFT.json";
import marketplaceAbiJson from "@verichain/shared/abi/VeriChainMarketplace.json";
import { HEDERA_CONSUMER_MARKETPLACE_ADDRESS, HEDERA_CONSUMER_NFT_ADDRESS } from "@verichain/shared";
import { createPublicClient, http, type Abi } from "viem";
import { HEDERA_TESTNET } from "@/lib/consumer/chain/hedera-wallet-client";

const consumerNftAbi = consumerNftAbiJson as Abi;
const marketplaceAbi = marketplaceAbiJson as Abi;
const NFT_CONTRACT_ADDRESS = HEDERA_CONSUMER_NFT_ADDRESS;
const MARKETPLACE_CONTRACT_ADDRESS = HEDERA_CONSUMER_MARKETPLACE_ADDRESS;

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

/** Real on-chain pull-payment balance (`pendingWithdrawals[seller]`) — the
 *  HBAR a seller has been credited from completed sales but not yet claimed
 *  via `withdraw()`. Read directly from the contract, never from Supabase,
 *  since this is settlement money, not app state. */
export async function getPendingWithdrawalClient(sellerAddress: `0x${string}`): Promise<bigint> {
  return (await publicClient.readContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: marketplaceAbi,
    functionName: "pendingWithdrawals",
    args: [sellerAddress],
  })) as bigint;
}

import { json, readJson } from "@/lib/api/http";
import { verifyPrivyAccessToken } from "@/lib/auth/privy";
import { extractEthereumWallet, getPrivyUser } from "@/lib/auth/privy-user";
import { issueWalletChallenge } from "@/lib/auth/wallet-challenge";

type ChallengeBody = { privyAccessToken?: string };

export async function POST(request: Request) {
  const parsed = await readJson<ChallengeBody>(request);
  if (!parsed.ok || !parsed.body.privyAccessToken) {
    return json({ error: "Privy authentication is required" }, 401);
  }

  try {
    const { userId } = await verifyPrivyAccessToken(parsed.body.privyAccessToken);
    const walletAddress = extractEthereumWallet(await getPrivyUser(userId));

    if (!walletAddress) {
      return json({ error: "No Ethereum wallet is linked to this Privy account" }, 403);
    }

    return json(await issueWalletChallenge(walletAddress));
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not create wallet challenge" },
      401,
    );
  }
}
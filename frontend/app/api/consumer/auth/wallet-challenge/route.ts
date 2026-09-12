import { json, readJson } from "@/lib/api/http";
import { verifyPrivyAccessToken } from "@/lib/auth/privy";
import { extractEthereumWallet, getPrivyUser } from "@/lib/auth/privy-user";
import { issueWalletChallenge } from "@/lib/auth/wallet-challenge";

type ChallengeBody = { privyAccessToken?: string };

/**
 * Step 1 of real consumer wallet sign-in — same primitive as the
 * manufacturer flow (`/api/auth/wallet-challenge`), reused rather than
 * duplicated: verify the caller actually controls a Privy-linked Ethereum
 * wallet, then issue a signable challenge message. No World ID requirement
 * here — that's a manufacturer-only policy, not a consumer one.
 */
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

    return json(await issueWalletChallenge(walletAddress, "consumer authentication"));
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Could not create wallet challenge" },
      401,
    );
  }
}

import { json, readJson } from "@/lib/api/http";
import { completeManufacturerLogin } from "@/lib/auth/complete-login";
import { verifyPrivyAccessToken } from "@/lib/auth/privy";
import { extractEthereumWallet, getPrivyUser } from "@/lib/auth/privy-user";
import { verifyWalletSignature } from "@/lib/auth/verify-wallet-signature";
import { consumeWalletChallenge } from "@/lib/auth/wallet-challenge";
import { verifyWorldIdProof } from "@/lib/auth/verify-world-id";
import { createServiceClient } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import type { Database } from "@/lib/types";

type CompleteAuthBody = {
	privyAccessToken?: string;
	worldIdProof?: unknown;
	walletAddress?: string;
	walletSignature?: string;
};

export async function POST(request: Request) {
	const parsed = await readJson<CompleteAuthBody>(request);

	if (!parsed.ok) {
		return json({ error: "Invalid JSON body" }, 400);
	}

	try {
		const result = await completeManufacturerLogin(parsed.body, {
			consumeChallenge: consumeWalletChallenge,
			verifySignature: verifyWalletSignature,
			verifyPrivyWallet: async (token) => {
				const { userId } = await verifyPrivyAccessToken(token);
				return extractEthereumWallet(await getPrivyUser(userId));
			},
			verifyWorldId: verifyWorldIdProof,
			loadProfile: async (walletAddress) => {
				const { data: profile, error } = await createServiceClient()
					.from("profiles")
					.select(
						"id, wallet_address, organization_id, role, world_id_nullifier_hash, display_name",
					)
					.eq("wallet_address", walletAddress)
					.maybeSingle();

				if (error) {
					throw new Error("Could not load manufacturer profile");
				}

				return profile;
			},
			saveWorldId: async (profileId, nullifier) => {
				const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
					world_id_verified: true,
					world_id_nullifier_hash: nullifier,
				};
				const { error } = await createServiceClient()
					.from("profiles")
					.update(profileUpdate)
					.eq("id", profileId);

				if (error) {
					throw new Error("Could not save World ID verification");
				}
			},
			createSession: setSession,
		});

		if (!result.ok) {
			return json({ error: result.error }, result.status);
		}

		return json({
			authenticated: true,
			session: {
				walletAddress: result.session.walletAddress,
				role: result.session.role,
				displayName: result.session.displayName,
			},
		});
	} catch (error) {
		console.error("Complete authentication failed", error);
		return json(
			{ error: error instanceof Error ? error.message : "Authentication failed" },
			401,
		);
	}
}

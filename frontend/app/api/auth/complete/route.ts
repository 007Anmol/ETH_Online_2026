import { json, readJson } from "@/lib/api/http";
import { verifyPrivyAccessToken } from "@/lib/auth/privy";
import { verifyWorldIdProof } from "@/lib/auth/verify-world-id";
import { createServiceClient } from "@/lib/supabase";
import { setSession } from "@/lib/session";
import type { Database, Session } from "@/lib/types";

type CompleteAuthBody = {
	privyAccessToken?: string;
	worldIdProof?: unknown;
};

function normalizeWalletAddress(value: string): string {
	return value.trim().toLowerCase();
}

function extractWalletAddress(user: unknown): string | null {
	const candidate = user as {
		linked_accounts?: Array<{
			type?: string;
			address?: string;
			chain_type?: string;
		}>;
	};

	const wallet = candidate.linked_accounts?.find(
		(account) =>
			account.type === "wallet" &&
			account.chain_type === "ethereum" &&
			typeof account.address === "string",
	);

	return wallet?.address ?? null;
}

async function getPrivyUser(userId: string): Promise<unknown> {
	const { PrivyClient } = await import("@privy-io/node");
	const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
	const appSecret = process.env.PRIVY_APP_SECRET;

	if (!appId || !appSecret) {
		throw new Error("Privy server configuration is missing");
	}

	const client = new PrivyClient({ appId, appSecret });
	return client.users()._get(userId);
}

export async function POST(request: Request) {
	const parsed = await readJson<CompleteAuthBody>(request);

	if (!parsed.ok) {
		return json({ error: "Invalid JSON body" }, 400);
	}

	const { privyAccessToken, worldIdProof } = parsed.body;

	if (!privyAccessToken || !worldIdProof) {
		return json(
			{ error: "Both Privy authentication and World ID proof are required" },
			400,
		);
	}

	try {
		const { userId } = await verifyPrivyAccessToken(privyAccessToken);
		const privyUser = await getPrivyUser(userId);
		const walletAddress = extractWalletAddress(privyUser);

		if (!walletAddress) {
			return json(
				{ error: "No Ethereum wallet is linked to this Privy account" },
				403,
			);
		}

		const worldVerification = await verifyWorldIdProof(worldIdProof);

		if (!worldVerification.nullifier) {
			return json(
				{ error: "World ID verification did not return a nullifier" },
				400,
			);
		}

		const supabase = createServiceClient();
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select(
				"id, wallet_address, organization_id, role, world_id_verified, world_id_nullifier_hash, display_name",
			)
			.eq("wallet_address", normalizeWalletAddress(walletAddress))
			.maybeSingle();

		if (profileError) {
			console.error("Profile lookup failed", profileError);
			return json({ error: "Could not load manufacturer profile" }, 500);
		}

		if (!profile) {
			return json(
				{
					error:
						"This wallet is not registered. Ask an administrator to add it as a manufacturer.",
				},
				403,
			);
		}

		if (profile.role !== "MANUFACTURER") {
			return json({ error: "This wallet is not authorized as a manufacturer" }, 403);
		}

		if (
			profile.world_id_nullifier_hash &&
			profile.world_id_nullifier_hash !== worldVerification.nullifier
		) {
			return json(
				{ error: "This manufacturer profile is already linked to another World ID" },
				403,
			);
		}

		const profileUpdate: Database["public"]["Tables"]["profiles"]["Update"] = {
			world_id_verified: true,
			world_id_nullifier_hash: worldVerification.nullifier,
		};

		const { error: updateError } = await supabase
			.from("profiles")
			.update(profileUpdate)
			.eq("id", profile.id);

		if (updateError) {
			console.error("Profile update failed", updateError);
			return json({ error: "Could not save World ID verification" }, 500);
		}

		const session: Session = {
			walletAddress: profile.wallet_address,
			role: profile.role,
			profileId: profile.id,
			organizationId: profile.organization_id,
			displayName: profile.display_name,
		};

		await setSession(session);

		return json({
			authenticated: true,
			session: {
				walletAddress: session.walletAddress,
				role: session.role,
				displayName: session.displayName,
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
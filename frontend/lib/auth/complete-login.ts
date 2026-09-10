import type { Session, UserRole } from "@/lib/types";
import type { WalletChallenge } from "@/lib/auth/wallet-challenge-token";

export function normalizeWalletAddress(value: string): string {
  return value.trim().toLowerCase();
}

export type ManufacturerProfile = {
  id: string;
  wallet_address: string;
  organization_id: string | null;
  role: string;
  world_id_nullifier_hash: string | null;
  display_name: string | null;
};

export type CompleteLoginInput = {
  privyAccessToken?: string;
  worldIdProof?: unknown;
  walletAddress?: string;
  walletSignature?: string;
};

export type CompleteLoginDeps = {
  consumeChallenge: () => Promise<WalletChallenge | null>;
  verifySignature: (input: {
    address: string;
    message: string;
    signature: string;
  }) => Promise<boolean>;
  verifyPrivyWallet: (token: string) => Promise<string | null>;
  verifyWorldId: (proof: unknown) => Promise<{ nullifier?: string }>;
  loadProfile: (walletAddress: string) => Promise<ManufacturerProfile | null>;
  saveWorldId: (profileId: string, nullifier: string) => Promise<void>;
  createSession: (session: Session) => Promise<void>;
};

export type CompleteLoginResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export function evaluateManufacturerAccess(profile: {
  role: string;
  world_id_verified: boolean;
}): { ok: true } | { ok: false; status: 403; error: string } {
  if (profile.role !== "MANUFACTURER" || !profile.world_id_verified) {
    return {
      ok: false,
      status: 403,
      error: "Verified manufacturer authorization required",
    };
  }
  return { ok: true };
}

export async function completeManufacturerLogin(
  input: CompleteLoginInput,
  deps: CompleteLoginDeps,
): Promise<CompleteLoginResult> {
  const signature = input.walletSignature?.trim() ?? "";

  if (!input.privyAccessToken || !input.worldIdProof || !input.walletAddress) {
    return {
      ok: false,
      status: 400,
      error: "Privy, wallet, and World ID proof are required",
    };
  }

  if (!signature) {
    return { ok: false, status: 400, error: "Wallet signature is required" };
  }

  const challenge = await deps.consumeChallenge();
  if (!challenge) {
    return {
      ok: false,
      status: 401,
      error: "Wallet challenge is missing, expired, or already used",
    };
  }

  const submittedWallet = normalizeWalletAddress(input.walletAddress);
  if (submittedWallet !== challenge.walletAddress) {
    return {
      ok: false,
      status: 401,
      error: "Wallet does not match the signed challenge",
    };
  }

  const signatureMatches = await deps.verifySignature({
    address: challenge.walletAddress,
    message: challenge.message,
    signature,
  });
  if (!signatureMatches) {
    return { ok: false, status: 401, error: "Wallet signature is invalid" };
  }

  const privyWallet = await deps.verifyPrivyWallet(input.privyAccessToken);
  if (!privyWallet) {
    return {
      ok: false,
      status: 403,
      error: "No Ethereum wallet is linked to this Privy account",
    };
  }
  if (submittedWallet !== normalizeWalletAddress(privyWallet)) {
    return { ok: false, status: 401, error: "Wallet does not match the Privy account" };
  }

  let worldVerification: { nullifier?: string };
  try {
    worldVerification = await deps.verifyWorldId(input.worldIdProof);
  } catch (error) {
    return {
      ok: false,
      status: 401,
      error: error instanceof Error ? error.message : "World ID proof rejected",
    };
  }

  if (!worldVerification.nullifier) {
    return {
      ok: false,
      status: 400,
      error: "World ID verification did not return a nullifier",
    };
  }

  let profile: ManufacturerProfile | null;
  try {
    profile = await deps.loadProfile(submittedWallet);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error:
        error instanceof Error ? error.message : "Could not load manufacturer profile",
    };
  }
  if (!profile) {
    return {
      ok: false,
      status: 403,
      error:
        "This wallet is not registered. Ask an administrator to add it as a manufacturer.",
    };
  }

  if (profile.role !== "MANUFACTURER") {
    return {
      ok: false,
      status: 403,
      error: "This wallet is not authorized as a manufacturer",
    };
  }

  if (
    profile.world_id_nullifier_hash &&
    profile.world_id_nullifier_hash !== worldVerification.nullifier
  ) {
    return {
      ok: false,
      status: 403,
      error: "This manufacturer profile is already linked to another World ID",
    };
  }

  try {
    await deps.saveWorldId(profile.id, worldVerification.nullifier);
  } catch {
    return { ok: false, status: 500, error: "Could not save World ID verification" };
  }

  const session: Session = {
    walletAddress: profile.wallet_address,
    role: profile.role as UserRole,
    profileId: profile.id,
    organizationId: profile.organization_id,
    displayName: profile.display_name,
  };

  await deps.createSession(session);
  return { ok: true, session };
}

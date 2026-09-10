import {
  completeManufacturerLogin,
  evaluateManufacturerAccess,
  type CompleteLoginDeps,
  type ManufacturerProfile,
} from "../lib/auth/complete-login";
import type { WalletChallenge } from "../lib/auth/wallet-challenge-token";
import { createReporter } from "./test-helpers";

const { check, finish } = createReporter("Complete login rejections");

const WALLET = "0x1111111111111111111111111111111111111111";

const challenge: WalletChallenge = {
  nonce: "nonce-1",
  walletAddress: WALLET,
  message: "VeriChain manufacturer authentication",
  expiresAt: Math.floor(Date.now() / 1000) + 300,
};

const manufacturer: ManufacturerProfile = {
  id: "profile-1",
  wallet_address: WALLET,
  organization_id: "org-1",
  role: "MANUFACTURER",
  world_id_nullifier_hash: null,
  display_name: "Demo Manufacturer",
};

const validInput = {
  privyAccessToken: "privy-token",
  worldIdProof: { proof: "ok" },
  walletAddress: WALLET,
  walletSignature: "0x" + "ab".repeat(65),
};

function oneShotChallenge(value: WalletChallenge | null) {
  let remaining = value;
  return async () => {
    const current = remaining;
    remaining = null;
    return current;
  };
}

function deps(overrides: Partial<CompleteLoginDeps> = {}): CompleteLoginDeps {
  return {
    consumeChallenge: oneShotChallenge(challenge),
    verifySignature: async () => true,
    verifyPrivyWallet: async () => WALLET,
    verifyWorldId: async () => ({ nullifier: "nullifier-1" }),
    loadProfile: async () => manufacturer,
    saveWorldId: async () => {},
    createSession: async () => {},
    ...overrides,
  };
}

async function main() {
  const missingSignature = await completeManufacturerLogin(
    { ...validInput, walletSignature: "" },
    deps(),
  );
  check("missing signature is rejected", !missingSignature.ok && missingSignature.status === 400);

  const missingChallenge = await completeManufacturerLogin(
    validInput,
    deps({ consumeChallenge: async () => null }),
  );
  check(
    "missing or replayed challenge is rejected",
    !missingChallenge.ok && missingChallenge.status === 401,
  );

  const replayDeps = deps();
  await completeManufacturerLogin(validInput, replayDeps);
  const replayed = await completeManufacturerLogin(validInput, replayDeps);
  check("replayed challenge is rejected", !replayed.ok && replayed.status === 401);

  const wrongWallet = await completeManufacturerLogin(
    { ...validInput, walletAddress: "0x2222222222222222222222222222222222222222" },
    deps(),
  );
  check(
    "challenge wallet mismatch is rejected",
    !wrongWallet.ok && wrongWallet.status === 401,
  );

  const wrongSignature = await completeManufacturerLogin(
    validInput,
    deps({ verifySignature: async () => false }),
  );
  check(
    "wrong wallet signature is rejected",
    !wrongSignature.ok && wrongSignature.status === 401,
  );

  const privyMismatch = await completeManufacturerLogin(
    validInput,
    deps({ verifyPrivyWallet: async () => "0x2222222222222222222222222222222222222222" }),
  );
  check(
    "Privy wallet mismatch is rejected",
    !privyMismatch.ok && privyMismatch.status === 401,
  );

  const invalidWorldId = await completeManufacturerLogin(
    validInput,
    deps({
      verifyWorldId: async () => {
        throw new Error("World ID proof rejected");
      },
    }),
  );
  check(
    "invalid World ID proof is rejected",
    !invalidWorldId.ok && invalidWorldId.status === 401,
  );

  const unregistered = await completeManufacturerLogin(
    validInput,
    deps({ loadProfile: async () => null }),
  );
  check(
    "wallet not in profiles is rejected",
    !unregistered.ok && unregistered.status === 403,
  );

  const wrongRole = await completeManufacturerLogin(
    validInput,
    deps({
      loadProfile: async () => ({ ...manufacturer, role: "CONSUMER" }),
    }),
  );
  check(
    "non-manufacturer role is rejected",
    !wrongRole.ok && wrongRole.status === 403,
  );

  let sessionCreated = false;
  const success = await completeManufacturerLogin(
    validInput,
    deps({
      createSession: async () => {
        sessionCreated = true;
      },
    }),
  );
  check("verified manufacturer login can create a session", success.ok && sessionCreated);

  const unverifiedMint = evaluateManufacturerAccess({
    role: "MANUFACTURER",
    world_id_verified: false,
  });
  check(
    "unverified manufacturer cannot pass the mint gate",
    !unverifiedMint.ok && unverifiedMint.status === 403,
  );

  const verifiedMint = evaluateManufacturerAccess({
    role: "MANUFACTURER",
    world_id_verified: true,
  });
  check("verified manufacturer passes the mint gate", verifiedMint.ok);

  finish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

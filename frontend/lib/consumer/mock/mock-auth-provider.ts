import type { ConsumerAuthProvider } from "@/lib/consumer/providers";
import type { ConsumerIdentity } from "@/lib/consumer/types";

const STORAGE_KEY = "verichain-consumer-identity";

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readStoredIdentity(): ConsumerIdentity | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsumerIdentity) : null;
  } catch {
    return null;
  }
}

/**
 * Mock stand-in for Privy embedded-wallet auth. Persists to localStorage so a
 * refresh doesn't drop the session during the demo. Replace with a Privy-backed
 * `ConsumerAuthProvider` once the embedded wallet flow is wired up.
 */
export class MockConsumerAuthProvider implements ConsumerAuthProvider {
  async getIdentity() {
    return delay(readStoredIdentity(), 150);
  }

  async login(method: ConsumerIdentity["authMethod"]) {
    const identity: ConsumerIdentity = {
      profileId: "mock-consumer-profile",
      walletAddress: "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d",
      displayName: "Demo Shopper",
      authMethod: method,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    }

    return delay(identity, 500);
  }

  async logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    return delay(undefined, 150);
  }
}

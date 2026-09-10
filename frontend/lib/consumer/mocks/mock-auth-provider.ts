import { delay } from "@/lib/consumer/mocks/delay";
import type { ConsumerAuthProvider } from "@/lib/consumer/providers/types";
import type { ConsumerIdentity } from "@/lib/consumer/types";

/** In-memory mock consumer identity. Demo-only: resets on server restart. */
let currentIdentity: ConsumerIdentity | null = null;

export const mockConsumerAuthProvider: ConsumerAuthProvider = {
  async getIdentity() {
    return delay(currentIdentity, 150);
  },

  async login(method) {
    currentIdentity = {
      displayName: method === "WALLET" ? "0x8f2a…c19d" : "Demo Consumer",
      loginMethod: method,
      walletAddress:
        method === "WALLET"
          ? "0x8f2a1b6c9d4e7f3a2b5c8d1e6f9a4b7c2d5e8f19"
          : null,
    };
    return delay(currentIdentity, 500);
  },

  async logout() {
    currentIdentity = null;
    return delay(undefined, 150);
  },
};

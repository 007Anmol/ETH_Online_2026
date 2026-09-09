import type { Session } from "@/lib/types";

/** Phase 1 mock profile is not a real `profiles` row. */
const LOCAL_DEMO_PROFILE = "local-demo-profile";

export function nfcActorId(session: Session | null): string | null {
  if (!session?.profileId || session.profileId === LOCAL_DEMO_PROFILE) {
    return null;
  }
  return session.profileId;
}

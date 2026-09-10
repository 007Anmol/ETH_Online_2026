import type { Metadata } from "next";
import { ProfilePanel } from "@/components/consumer/profile/ProfilePanel";

export const metadata: Metadata = {
  title: "Profile — VeriChain",
  description: "Your VeriChain identity and verified product collection.",
};

export default function ConsumerProfilePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <ProfilePanel />
    </div>
  );
}

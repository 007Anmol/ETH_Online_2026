import type { Metadata } from "next";
import { ProfilePanel } from "@/components/consumer/profile/ProfilePanel";
import { BackgroundAmbient } from "@/components/consumer/BackgroundAmbient";

export const metadata: Metadata = {
  title: "Profile — VeriChain",
  description: "Your VeriChain identity and verified product collection.",
};

export default function ConsumerProfilePage() {
  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <BackgroundAmbient className="left-1/2 top-0 h-96 w-96 -translate-x-1/2" />
      <ProfilePanel />
    </div>
  );
}

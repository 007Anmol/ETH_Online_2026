import type { Metadata } from "next";
import { HeroSection } from "@/components/consumer/home/HeroSection";
import { TrustExplainer } from "@/components/consumer/home/TrustExplainer";
import { RecentVerificationDemo } from "@/components/consumer/home/RecentVerificationDemo";
import { OwnedProductsPreview } from "@/components/consumer/home/OwnedProductsPreview";

export const metadata: Metadata = {
  title: "VeriChain — Know what you're buying",
  description: "Scan any VeriChain-registered product to verify its identity, journey, and on-chain proof.",
};

export default function ConsumerHomePage() {
  return (
    <>
      <HeroSection />
      <TrustExplainer />
      <RecentVerificationDemo />
      <OwnedProductsPreview />
    </>
  );
}

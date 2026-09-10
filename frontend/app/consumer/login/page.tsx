import type { Metadata } from "next";
import { LoginPanel } from "@/components/consumer/login/LoginPanel";

export const metadata: Metadata = {
  title: "Sign in — VeriChain",
  description: "Sign in to keep your verified products and ownership history with you.",
};

export default function ConsumerLoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <LoginPanel />
    </div>
  );
}

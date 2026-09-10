"use client";

import { ErrorState } from "@/components/consumer/states/ErrorState";

export default function ProductError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-16">
      <ErrorState
        title="Couldn't load this product"
        description="Something went wrong while loading this product's record."
        onRetry={reset}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { SUGGESTED_DEMO_IDS } from "@/lib/consumer/demo-suggestions";

type DemoIdPickerProps = {
  disabled: boolean;
  onSubmit: (productId: string) => void;
};

export function DemoIdPicker({ disabled, onSubmit }: DemoIdPickerProps) {
  const [value, setValue] = useState("");

  function submit(id: string) {
    if (!id.trim() || disabled) return;
    onSubmit(id);
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(value);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor="scan-product-id" className="sr-only">
          Product ID
        </label>
        <input
          id="scan-product-id"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="Enter a product ID, e.g. VC-001024"
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--foreground)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="h-11 shrink-0 rounded-full bg-[var(--foreground)] px-5 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Verify
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {SUGGESTED_DEMO_IDS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => {
              setValue(id);
              submit(id);
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-xs text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

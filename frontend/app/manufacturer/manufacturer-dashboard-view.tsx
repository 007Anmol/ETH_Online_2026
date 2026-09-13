"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Fingerprint, Plus, Tag } from "lucide-react";

type ManufacturerDashboardViewProps = {
  graphError: string | null;
  batchValue: number | string;
  productValue: number | string;
  boundValue: number | string;
  pending: number;
};

export function ManufacturerDashboardView({
  graphError,
  batchValue,
  productValue,
  boundValue,
  pending,
}: ManufacturerDashboardViewProps) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-end justify-between gap-6 border-b border-[var(--border)] pb-8"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Manufacturer dashboard
          </p>
          <h1 className="mt-3 text-4xl font-medium tracking-[-0.06em] lg:text-5xl">
            Overview
          </h1>
        </div>
        {!graphError ? (
          <span className="hidden items-center gap-2 text-xs text-[var(--muted)] sm:flex">
            <Check size={14} /> Indexed on The Graph
          </span>
        ) : null}
      </motion.div>

      {graphError ? (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          Dashboard counts need The Graph. {graphError}
        </motion.p>
      ) : null}

      <motion.section
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
        }}
        className="mt-8 grid gap-4 md:grid-cols-3"
      >
        <Metric label="Batches" value={batchValue} href="/manufacturer/batches" />
        <Metric
          label="Products minted"
          value={productValue}
          href="/manufacturer/products"
          accent="blue"
        />
        <Metric
          label="Tags bound"
          value={boundValue}
          href="/manufacturer/products?status=TAG_BOUND"
          accent="green"
          sub={graphError ? undefined : `${pending} awaiting NFC bind`}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mt-14 border-t border-[var(--border)] pt-8"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Operations
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
              Quick actions
            </h2>
          </div>
          <span className="hidden text-xs text-[var(--muted)] sm:block">
            Manage product identity
          </span>
        </div>

        <div className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          <Action
            href="/manufacturer/batches/create"
            label="Create a batch"
            detail="Mint new product digital twins"
            primary
          />
          <Action
            href="/manufacturer/batches"
            label="View all batches"
            detail="Review manufacturing history"
          />
          <Action
            href="/manufacturer/products?status=TAG_PENDING"
            label={`Pending NFC binds${graphError ? "" : ` (${pending})`}`}
            detail="Connect physical tags to products"
            warning
          />
          <Action
            href="/manufacturer/nfc"
            label="Bind an NFC tag"
            detail="Attach one tag to one product"
          />
        </div>
      </motion.section>
    </main>
  );
}

function Metric({
  label,
  value,
  href,
  sub,
  accent = "plain",
}: {
  label: string;
  value: number | string;
  href: string;
  sub?: string;
  accent?: "plain" | "blue" | "green";
}) {
  const valueClass = {
    plain: "text-[var(--foreground)]",
    blue: "text-sky-600 dark:text-sky-400",
    green: "text-emerald-600 dark:text-emerald-400",
  }[accent];

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.45 }}
    >
      <Link
        href={href}
        className="group block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--foreground)]"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {label}
          </span>
          <ArrowUpRight
            size={15}
            className="text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
        <p className={`mt-7 text-4xl font-medium tracking-[-0.05em] ${valueClass}`}>
          {value}
        </p>
        {sub ? <p className="mt-2 text-xs text-[var(--muted)]">{sub}</p> : null}
      </Link>
    </motion.div>
  );
}

function Action({
  href,
  label,
  detail,
  primary = false,
  warning = false,
}: {
  href: string;
  label: string;
  detail: string;
  primary?: boolean;
  warning?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--surface-muted)]"
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
            primary
              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
              : warning
                ? "border-amber-500/30 text-amber-600 dark:text-amber-300"
                : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {primary ? <Plus size={15} /> : warning ? <Tag size={14} /> : <Fingerprint size={14} />}
        </span>
        <span>
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-1 block text-xs text-[var(--muted)]">{detail}</span>
        </span>
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

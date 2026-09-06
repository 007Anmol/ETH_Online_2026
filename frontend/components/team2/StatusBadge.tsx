"use client";

type Props = {
  status: string;
};

export default function StatusBadge({ status }: Props) {
  const styles: Record<string, string> = {
    VERIFIED: "bg-black text-white",
    DELIVERED: "bg-black text-white",
    COMPLETED: "bg-black text-white",
    FUNDED: "bg-gray-900 text-white",
    IN_TRANSIT: "bg-gray-100 text-gray-900",
    CHECKPOINT: "bg-gray-200 text-gray-900",
    PENDING: "bg-gray-100 text-gray-500",
    LOCKED: "bg-gray-100 text-gray-900",
    RELEASED: "bg-black text-white",
    ANOMALY: "bg-gray-900 text-white",
    FLAGGED: "bg-gray-900 text-white",
    FROZEN: "bg-gray-200 text-gray-700",
    HIGH: "bg-black text-white",
    MEDIUM: "bg-gray-200 text-gray-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
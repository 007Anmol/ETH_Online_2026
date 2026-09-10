const FALLBACK = "Not available";

export function formatDate(value: string | null): string {
  if (!value) return FALLBACK;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return FALLBACK;
  }
}

export function formatDateTime(value: string | null): string {
  if (!value) return FALLBACK;
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return FALLBACK;
  }
}

export function formatRelativeTime(value: string | null): string {
  if (!value) return FALLBACK;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return FALLBACK;

  const diffMs = Date.now() - then;
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function formatOrNotAvailable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return FALLBACK;
  return String(value);
}

export function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

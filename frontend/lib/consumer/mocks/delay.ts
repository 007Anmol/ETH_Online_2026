/**
 * Fixed, deterministic latency for mock providers — never random. A
 * hackathon demo must reproduce the same timing every run.
 */
export const MOCK_LATENCY_MS = 650;

export function delay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

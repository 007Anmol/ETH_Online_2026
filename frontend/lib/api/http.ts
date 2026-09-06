import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export async function readJson<T>(
  request: Request,
): Promise<{ ok: true; body: T } | { ok: false }> {
  try {
    return { ok: true, body: (await request.json()) as T };
  } catch {
    return { ok: false };
  }
}

export function notImplemented(owner: string, action: string) {
  return json(
    {
      error: "Not implemented",
      owner,
      action,
      phase: 1,
    },
    501,
  );
}

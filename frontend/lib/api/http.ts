import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
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

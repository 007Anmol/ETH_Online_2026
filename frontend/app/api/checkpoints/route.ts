import { NextResponse } from "next/server";
import type { TelemetryPoint } from "@/lib/risk";
import { SupabaseStore } from "../../../../services/agent/src/supabase";
import { processTelemetry } from "../../../../services/agent/src/agent";
import { createViemBlockchainGateway } from "../../../../services/agent/src/viemBlockchain";

type CheckpointRequest = {
  current: TelemetryPoint;
  previous?: TelemetryPoint;
  recent?: TelemetryPoint[];
  requestId?: string;
};

function isTelemetryPoint(value: unknown): value is TelemetryPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<TelemetryPoint>;

  return (
    typeof point.productId === "string" &&
    typeof point.checkpoint === "string" &&
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    typeof point.timestamp === "number"
  );
}

export async function POST(request: Request) {
  let body: CheckpointRequest;

  try {
    body = (await request.json()) as CheckpointRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isTelemetryPoint(body.current)) {
    return NextResponse.json({ error: "A valid current checkpoint is required" }, { status: 400 });
  }

  if (body.previous && !isTelemetryPoint(body.previous)) {
    return NextResponse.json({ error: "Invalid previous checkpoint" }, { status: 400 });
  }

  const requestId = body.requestId ?? crypto.randomUUID();

  try {
    const store = new SupabaseStore();
    const result = await processTelemetry(
      { requestId, current: body.current, previous: body.previous, recent: body.recent },
      store,
      createViemBlockchainGateway(),
    );
    return NextResponse.json({ checkpoint: body.current.checkpoint, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent processing failed";
    return NextResponse.json({ error: message }, { status: message.includes("already") ? 409 : 503 });
  }
}
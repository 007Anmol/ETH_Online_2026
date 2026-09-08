import { NextResponse } from "next/server";
import { evaluateTelemetry, type TelemetryPoint } from "@/lib/risk";
import { SupabaseStore } from "../../../../services/agent/src/supabase";

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

  const result = evaluateTelemetry(body.current, body.previous, body.recent);
  const requestId = body.requestId ?? crypto.randomUUID();

  try {
    const store = new SupabaseStore();
    if (await store.hasProcessed(requestId)) {
      return NextResponse.json({ error: "Checkpoint request already processed" }, { status: 409 });
    }
    await store.saveCheckpoint({ requestId, point: body.current, riskScore: result.riskScore });
    if (result.shouldFreeze) {
      await store.saveAnomaly({ requestId, result, status: "OPEN" });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Persistence failed" }, { status: 503 });
  }

  return NextResponse.json({
    requestId,
    checkpoint: body.current.checkpoint,
    ...result,
    action: result.riskScore >= 61 ? "RECORD_AND_FREEZE" : "RECORD_ONLY",
  });
}
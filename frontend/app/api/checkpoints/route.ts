import { NextResponse } from "next/server";
import { evaluateTelemetry, type TelemetryPoint } from "@/lib/risk";

type CheckpointRequest = {
  current: TelemetryPoint;
  previous?: TelemetryPoint;
  recent?: TelemetryPoint[];
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

  return NextResponse.json({
    productId: body.current.productId,
    checkpoint: body.current.checkpoint,
    ...result,
    action: result.riskScore >= 61 ? "RECORD_AND_FREEZE" : "RECORD_ONLY",
  });
}
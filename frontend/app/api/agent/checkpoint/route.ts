import { NextResponse } from "next/server";
import { authorizePaidRequest } from "@/lib/paidApi";
import { processTelemetry } from "../../../../../services/agent/src/agent";
import { SupabaseStore } from "../../../../../services/agent/src/supabase";
import { createViemBlockchainGateway } from "../../../../../services/agent/src/viemBlockchain";
import type { TelemetryBatch } from "../../../../../packages/shared/types/checkpoint";

export async function POST(request: Request) {
  try {
    const paid = await authorizePaidRequest(request, "AGENT_API");
    if (paid.response) return paid.response;
    const body = (await request.json()) as Partial<TelemetryBatch>;
    if (!body.requestId || body.requestId !== paid.payment.requestId || !body.current) {
      return NextResponse.json({ error: "requestId must match the payment request and current telemetry is required" }, { status: 400 });
    }

    const result = await processTelemetry(
      body as TelemetryBatch,
      new SupabaseStore(),
      createViemBlockchainGateway(),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent processing failed" }, { status: 503 });
  }
}
import { NextResponse } from "next/server";
import { resolveTelemetryAnomaly } from "../../../../../../../services/agent/src/agent";
import { SupabaseStore } from "../../../../../../../services/agent/src/supabase";
import { createViemBlockchainGateway } from "../../../../../../../services/agent/src/viemBlockchain";

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  const adminKey = process.env.AGENT_ADMIN_KEY;
  if (!adminKey || request.headers.get("x-agent-key") !== adminKey) {
    return NextResponse.json({ error: "Agent authorization required" }, { status: 401 });
  }

  try {
    const { requestId } = await context.params;
    const body = (await request.json()) as { productId?: string };
    if (!body.productId) {
      return NextResponse.json({ error: "Valid product UUID is required" }, { status: 400 });
    }
    const result = await resolveTelemetryAnomaly(
      body.productId,
      requestId,
      new SupabaseStore(),
      createViemBlockchainGateway(),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Anomaly resolution failed" }, { status: 503 });
  }
}
import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";

type GeminiResponse = {
  riskScore?: number;
  explanation?: string;
  findings?: string[];
};

export async function enrichRiskWithGemini(
  batch: TelemetryBatch,
  deterministic: AnomalyResult,
): Promise<AnomalyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deterministic;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        generationConfig: { responseMimeType: "application/json" },
        contents: [{
          parts: [{
            text: [
              "You are a supply-chain risk analyst.",
              "Return JSON only with riskScore (0-100), explanation (string), and findings (string array).",
              "Do not lower the deterministic risk score. Do not invent telemetry.",
              JSON.stringify({ telemetry: batch, deterministic }),
            ].join("\n"),
          }],
        }],
      }),
    },
  );

  if (!response.ok) throw new Error(`Gemini analysis failed (${response.status})`);
  const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no analysis");

  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as GeminiResponse;
  const riskScore = Math.max(
    deterministic.riskScore,
    Math.min(100, Math.round(Number(parsed.riskScore ?? deterministic.riskScore))),
  );

  return {
    ...deterministic,
    riskScore,
    level: riskScore >= 81 ? "CRITICAL" : riskScore >= 61 ? "HIGH" : riskScore >= 31 ? "MEDIUM" : "LOW",
    findings: Array.isArray(parsed.findings) ? parsed.findings.filter((item): item is string => typeof item === "string") : deterministic.findings,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : deterministic.explanation,
    shouldFreeze: deterministic.shouldFreeze || riskScore >= 61,
  };
}
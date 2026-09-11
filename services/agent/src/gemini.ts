import type { AnomalyResult } from "../../../packages/shared/types/anomaly";
import type { TelemetryBatch } from "../../../packages/shared/types/checkpoint";

type GeminiResponse = {
  riskScore?: number;
  explanation?: string;
  findings?: string[];
};

const DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

function modelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  return [...new Set([configured, ...DEFAULT_MODELS].filter((model): model is string => Boolean(model)))];
}

export async function enrichRiskWithGemini(
  batch: TelemetryBatch,
  deterministic: AnomalyResult,
): Promise<AnomalyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deterministic;

  const prompt = [
    "You are a supply-chain risk analyst.",
    "Return JSON only with riskScore (0-100), explanation (string), and findings (string array).",
    "Do not lower the deterministic risk score. Do not invent telemetry.",
    JSON.stringify({ telemetry: batch, deterministic }),
  ].join("\n");

  let lastError = "Gemini analysis failed";
  for (const model of modelCandidates()) {
    try {
      const parsed = await generateWithModel(apiKey, model, prompt);
      const riskScore = Math.max(
        deterministic.riskScore,
        Math.min(100, Math.round(Number(parsed.riskScore ?? deterministic.riskScore))),
      );
      return {
        ...deterministic,
        riskScore,
        level: riskScore >= 81 ? "CRITICAL" : riskScore >= 61 ? "HIGH" : riskScore >= 31 ? "MEDIUM" : "LOW",
        findings: Array.isArray(parsed.findings)
          ? parsed.findings.filter((item): item is string => typeof item === "string")
          : deterministic.findings,
        explanation: typeof parsed.explanation === "string" ? parsed.explanation : deterministic.explanation,
        shouldFreeze: deterministic.shouldFreeze || riskScore >= 61,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }

  console.warn(`[gemini] ${lastError}; using deterministic risk result`);
  return deterministic;
}

async function generateWithModel(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GeminiResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        generationConfig: { responseMimeType: "application/json" },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${model} failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini ${model} returned no analysis`);

  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as GeminiResponse;
}

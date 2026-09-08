import { describe, expect, it } from "vitest";
import { evaluateTelemetry } from "./riskEngine";

const point = {
  productId: "1",
  checkpoint: "Mumbai",
  latitude: 19.076,
  longitude: 72.8777,
  timestamp: 1_700_000_000,
};

describe("telemetry risk engine", () => {
  it("produces a deterministic low-risk result", () => {
    expect(evaluateTelemetry(point)).toEqual({
      productId: "1",
      riskScore: 0,
      level: "LOW",
      findings: [],
      explanation: "Telemetry is consistent with the configured route and transport limits.",
      shouldFreeze: false,
    });
  });

  it("freezes for impossible velocity", () => {
    const result = evaluateTelemetry(
      { ...point, checkpoint: "London", latitude: 51.5074, longitude: -0.1278, timestamp: point.timestamp + 60 },
      point,
    );
    expect(result.riskScore).toBe(50);
    expect(result.level).toBe("MEDIUM");
    expect(result.shouldFreeze).toBe(false);
  });

  it("combines route deviation and duplicate location into a high-risk result", () => {
    const result = evaluateTelemetry(
      { ...point, expectedRoute: ["Mumbai", "Dubai"], actualRoute: ["Mumbai", "New York"] },
      undefined,
      [{ ...point, timestamp: point.timestamp - 60 }],
    );
    expect(result.riskScore).toBe(50);
    expect(result.level).toBe("MEDIUM");
  });
});
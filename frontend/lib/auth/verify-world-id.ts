import "server-only";

type WorldVerificationResponse = {
  success?: boolean;
  nullifier?: string;
  error?: string;
  code?: string;
};

export async function verifyWorldIdProof(
  idkitResponse: unknown,
): Promise<WorldVerificationResponse> {
  const rpId = process.env.WORLD_ID_RP_ID;

  if (!rpId) {
    throw new Error("Missing WORLD_RP_ID");
  }

  const response = await fetch(
    `https://developer.world.org/api/v4/verify/${rpId}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(idkitResponse),
      cache: "no-store",
    },
  );

  const body = (await response.json()) as WorldVerificationResponse;

  if (!response.ok || body.success !== true) {
    throw new Error(body.error ?? body.code ?? "World ID proof rejected");
  }

  return body;
}
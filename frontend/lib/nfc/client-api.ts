import type { NfcTapPayload, VerifyProductResponse } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<{
  ok: boolean;
  data: T;
}> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { ok: response.ok, data };
}

export async function requestVerify(payload: NfcTapPayload) {
  return postJson<VerifyProductResponse & { error?: string }>(
    "/api/nfc/verify",
    payload,
  );
}

export async function requestSimulate(input: {
  tag_uid?: string;
  product_id?: string;
}) {
  return postJson<{
    payload?: NfcTapPayload;
    error?: string;
  }>("/api/nfc/simulate", input);
}

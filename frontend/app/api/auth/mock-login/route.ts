import { json, readJson } from "@/lib/api/http";
import { loginAsDemoConsumer, loginAsDemoManufacturer } from "@/lib/auth/mock-login";

type MockLoginBody = { as?: "manufacturer" | "consumer"; walletAddress?: string };

export async function POST(request: Request) {
  if (process.env.ALLOW_TEST_AUTH !== "true") {
    return json({ error: "Test authentication is disabled" }, 404);
  }

  const parsed = await readJson<MockLoginBody>(request);
  const body = parsed.ok ? parsed.body : {};

  try {
    if (body.as === "consumer") {
      if (!body.walletAddress) {
        return json({ error: "walletAddress is required for consumer mock login" }, 400);
      }
      const session = await loginAsDemoConsumer(body.walletAddress);
      return json({ session });
    }

    const session = await loginAsDemoManufacturer();
    return json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return json({ error: message }, 400);
  }
}

import { json } from "@/lib/api/http";
import { loginAsDemoManufacturer } from "@/lib/auth/mock-login";

export async function POST() {
  try {
    const session = await loginAsDemoManufacturer();
    return json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return json({ error: message }, 400);
  }
}

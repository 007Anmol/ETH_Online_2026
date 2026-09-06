import { json } from "@/lib/api/http";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return json({ session });
}

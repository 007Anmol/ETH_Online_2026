import { json } from "@/lib/api/http";
import { createWorldRpContext } from "@/lib/auth/world-id";

export async function POST() {
  try {
    const appId = process.env.NEXT_PUBLIC_WORLD_ID_APP_ID;
    const action = process.env.NEXT_PUBLIC_WORLD_ID_ACTION;

    if (!appId || !action) {
      return json(
        {
          error:
            "World ID is not configured. Set NEXT_PUBLIC_WORLD_ID_APP_ID and NEXT_PUBLIC_WORLD_ID_ACTION.",
        },
        500,
      );
    }

    const rpContext = await createWorldRpContext();

    return json({
      app_id: appId,
      action,
      rp_context: rpContext,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create World ID request";

    return json({ error: message }, 500);
  }
}
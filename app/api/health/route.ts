import { requireAccount } from "../../../lib/access.ts";
import {
  AssistantError,
  errorResponse,
} from "../../../lib/assistant-server.ts";
import { privateJson } from "../../../lib/http.ts";
export async function GET(request: Request) {
  try {
    const { db } = await requireAccount(request);
    const { error } = await db.from("quotes").select("id").limit(1);
    if (error) throw new AssistantError("Database is unavailable.", 503);
    return privateJson({
      status: "ok",
      database: "connected",
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

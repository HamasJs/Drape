import { requireAccount } from "../../../lib/access.ts";
import { errorResponse } from "../../../lib/assistant-server.ts";
import { privateJson } from "../../../lib/http.ts";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAccount(request);
    return privateJson({ configured: Boolean(process.env.GEMINI_API_KEY) });
  } catch (e) {
    return errorResponse(e);
  }
}

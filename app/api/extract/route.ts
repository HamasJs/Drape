import { requestLog } from "../../../lib/request-log.ts";
import { extractRequirements } from "../../../lib/extract-service.ts";
import { requireAccount, authorizeAI } from "../../../lib/access.ts";
import { limitedJson } from "../../../lib/http.ts";
import { MAX_DESCRIPTION } from "../../../lib/extraction.ts";
import {
  AssistantError,
  errorResponse,
  guardRequest,
  apiKey,
} from "../../../lib/assistant-server.ts";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(request: Request) {
  const log = requestLog("extract");
  try {
    guardRequest(request);
    if (Number(request.headers.get("content-length")) > 40000)
      throw new AssistantError("Description is too long.", 413);
    log.stage("authentication");
    const account = await requireAccount(request);
    log.stage("input");
    const body = (await limitedJson(request, 40000)) as { text?: unknown };
    if (
      typeof body?.text !== "string" ||
      !body.text.trim() ||
      body.text.length > MAX_DESCRIPTION
    )
      throw new AssistantError(
        `Enter a description of 1–${MAX_DESCRIPTION} characters.`,
      );
    apiKey();
    log.stage("quota");
    await authorizeAI(request, account);
    log.stage("gemini");
    const extraction = await extractRequirements(body.text);
    log.complete(200);
    return Response.json({ extraction });
  } catch (error) {
    log.failure(error);
    return errorResponse(error);
  }
}

import { authConfigured } from "./supabase/config.ts";
import { AssistantError } from "./assistant-server.ts";
export async function requireAccount(request: Request) {
  if (!authConfigured())
    throw new AssistantError(
      "Accounts are not configured. Ask the owner to complete Supabase setup.",
      503,
    );
  const { requestAuth } = await import("./supabase/request.ts");
  const db = requestAuth(request);
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    throw new AssistantError("Please sign in to continue.", 401);
  if (!data.user.email_confirmed_at)
    throw new AssistantError("Verify your email before using the studio.", 403);
  return { db, user: data.user };
}
export async function authorizeAI(
  request: Request,
  verified?: Awaited<ReturnType<typeof requireAccount>>,
) {
  const account = verified || (await requireAccount(request));
  const { data, error } = await account.db.rpc("consume_ai_quota");
  if (error) {
    console.error("AI quota unavailable", { code: error.code });
    throw new AssistantError(
      "Usage limits are unavailable. Please try again later.",
      503,
    );
  }
  if (!data)
    throw new AssistantError(
      "AI limit reached (10 requests per minute, 100 per day). Try again later. Manual quotes still work.",
      429,
    );
  return account;
}

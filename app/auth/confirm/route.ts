import { NextResponse } from "next/server";
import { serverAuth } from "../../../lib/supabase/server";
import { authConfigured } from "../../../lib/supabase/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectOrigin = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : url.origin;
  const token = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("next") === "/reset-password" || type === "recovery"
      ? "/reset-password"
      : "/studio";
  if (authConfigured()) {
    const auth = await serverAuth();
    if (
      token &&
      (type === "email" || type === "recovery" || type === "signup")
    ) {
      const { error } = await auth.auth.verifyOtp({ token_hash: token, type });
      if (!error) return NextResponse.redirect(new URL(next, redirectOrigin));
    } else if (code) {
      const { error } = await auth.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, redirectOrigin));
    }
  }
  return NextResponse.redirect(new URL("/auth/error", redirectOrigin));
}

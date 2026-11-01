import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { publicAuthConfig } from "./config.ts";
export function requestAuth(request: Request) {
  const { url, key } = publicAuthConfig();
  return createServerClient(url, key, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get("cookie") || "").map((c) => ({
          name: c.name,
          value: c.value || "",
        })),
      setAll() {
        /* Middleware refreshes cookies before protected route handlers. */
      },
    },
  });
}

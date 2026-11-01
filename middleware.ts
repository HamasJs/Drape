import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, publicAuthConfig } from "./lib/supabase/config";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (["/", "/demo"].includes(request.nextUrl.pathname) || /\.(png|mp4)$/.test(request.nextUrl.pathname)) return response;
  if (!authConfigured()) return response;
  const { url, key } = publicAuthConfig();
  const client = createServerClient(url, key, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Verify with the auth service; never trust getSession() alone.
  try {
    await client.auth.getUser();
  } catch {
    /* Protected pages and endpoints fail closed independently. */
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|woff2)$).*)",
  ],
};

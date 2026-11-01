"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicAuthConfig } from "./config";
export function browserAuth() {
  const { url, key } = publicAuthConfig();
  return createBrowserClient(url, key, {
    cookieOptions: {
      secure: window.location.protocol === "https:",
      sameSite: "lax",
      path: "/",
    },
  });
}

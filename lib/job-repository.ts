import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseError } from "./database-error.ts";
export async function readJobs(db: SupabaseClient) {
  const rows: { payload: unknown }[] = [];
  // Supabase commonly caps individual responses at 1,000 rows.
  // Explicit ranges prevent silently omitting jobs from exports/workspaces.
  for (let offset = 0; offset < 5000; offset += 200) {
    const { data, error } = await db
      .from("quotes")
      .select("payload")
      .order("updated_at", { ascending: false })
      .order("id")
      .range(offset, offset + 199);
    if (error)
      throw databaseError(
        error,
        "Saved jobs could not be loaded. Please try again.",
      );
    rows.push(...data);
    if (data.length < 200) break;
  }
  return rows.map((row) => row.payload);
}

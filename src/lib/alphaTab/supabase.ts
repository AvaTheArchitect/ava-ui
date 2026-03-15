import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Warn at runtime rather than throwing at import time.
// An import-time throw crashes Next.js prerender even on client-only pages.
if (!url || !key) {
  console.warn(
    "⚠️ Supabase env vars missing — data fetching will fail. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.",
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
);

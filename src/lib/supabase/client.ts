import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anon, {
    cookieOptions: {
      path: "/",
      // Don't set domain so the cookie is for the current host (themomops.com) and sent with all same-origin requests
    },
  });
}

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = (requestUrl.searchParams.get("next") ?? "/").trim();
  const next = rawNext.startsWith("/") ? rawNext : `/${rawNext}`;
  const errorCode = requestUrl.searchParams.get("error_code");
  const error = requestUrl.searchParams.get("error");

  // Supabase redirects here with error params when e.g. link expired or invalid.
  // Only treat as otp_expired when Supabase explicitly sends that code; other errors (e.g. "invalid
  // request") can be transient or different issues.
  if (error || errorCode) {
    const loginError = errorCode === "otp_expired" ? "otp_expired" : "auth_failed";
    const redirectUrl = new URL("/login", requestUrl.origin);
    redirectUrl.searchParams.set("error", loginError);
    if (next && next !== "/") redirectUrl.searchParams.set("next", next);
    return NextResponse.redirect(redirectUrl);
  }

  // No code: Supabase may have sent tokens in the URL hash (magic link / recovery). Hash is only
  // visible client-side, so serve a page that reads the hash, completes auth, and redirects to next.
  if (!code) {
    const nextPath = (requestUrl.searchParams.get("next") ?? "/").trim();
    const safeNext = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    const allowedNext = "/reset-password";
    const isResetPassword = nextPath === allowedNext || nextPath === `${allowedNext}/`;
    const recoveryNext = isResetPassword ? allowedNext : safeNext;
    // Client page will read hash, set session, then redirect to recoveryNext
    const recoveryUrl = `/auth/recovery?next=${encodeURIComponent(recoveryNext)}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing you in…</title></head><body><p>Signing you in…</p><script>window.location.replace("${recoveryUrl}" + window.location.hash);</script></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.warn("[auth/callback] exchangeCodeForSession:", exchangeError.message);
    // Recovery flow: code exchange often fails when the link is opened in a different browser (no
    // code_verifier). Supabase may still have sent tokens in the URL hash; serve a page that lets
    // the client use the hash.
    const isResetPassword = next === "/reset-password" || next === "/reset-password/";
    if (isResetPassword) {
      const recoveryUrl = "/auth/recovery?next=" + encodeURIComponent("/reset-password");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body><p>Redirecting…</p><script>window.location.replace("${recoveryUrl}" + window.location.hash);</script></body></html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return NextResponse.redirect(new URL("/login?error=auth_failed", requestUrl.origin));
  }

  // Redirect to next only if it's a safe path: no protocol-relative (//), no backslash, no scheme (e.g. javascript:)
  let rawPath = next.startsWith("/") ? next : `/${next}`;
  if (rawPath === "/admin" || rawPath === "/admin/") rawPath = "/admin/tasks";
  const isHome = rawPath === "/" || rawPath === "";
  const hasUnsafe = /\/\/|\\\\|^\s*[a-z][a-z0-9+.-]*:/i.test(rawPath);
  const targetPath = isHome || hasUnsafe ? "/login" : rawPath;
  const redirectUrl = new URL(targetPath, requestUrl.origin);
  if (redirectUrl.origin !== requestUrl.origin) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }
  return NextResponse.redirect(redirectUrl);
}

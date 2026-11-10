import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
import {
  AUTH_RETURN_COOKIE,
  safeReturnPath,
  loginErrorPath,
  siteOrigin,
} from "@/lib/auth/policy";

export async function GET(request: Request): Promise<Response> {
  const origin = siteOrigin();
  if (!origin)
    return new Response("로그인 주소 설정이 필요합니다.", { status: 503 });
  const store = await cookies();
  const next = safeReturnPath(store.get(AUTH_RETURN_COOKIE)?.value);
  let destination = loginErrorPath("callback", next);
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") === "access_denied")
      destination = loginErrorPath("cancelled", next);
    if (url.searchParams.get("error") === "login_expired")
      destination = loginErrorPath("expired", next);
    if (code && !url.searchParams.has("error")) {
      const client = await createAuthClient(true);
      if (client) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (!error) destination = next;
      }
    }
  } catch {
    // 공급자 오류 원문에는 인증 정보가 포함될 수 있어 화면과 로그에 노출하지 않습니다.
  }
  store.delete(AUTH_RETURN_COOKIE);
  const response = NextResponse.redirect(new URL(destination, origin), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

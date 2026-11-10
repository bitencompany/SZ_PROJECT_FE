import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
import { authConfig, authCookieOptions } from "@/lib/auth/config";
import {
  AUTH_RETURN_COOKIE,
  isSameOriginPost,
  loginErrorPath,
  safeReturnPath,
} from "@/lib/auth/policy";

export async function POST(request: Request): Promise<Response> {
  const config = authConfig();
  if (!config)
    return Response.json(
      { error: "카카오 로그인을 준비 중이에요." },
      { status: 503 },
    );
  if (!isSameOriginPost(request, config.origin))
    return Response.json(
      { error: "로그인 페이지에서 다시 시작해 주세요." },
      { status: 403 },
    );
  let next = "/";
  try {
    const raw = await request.text();
    if (raw.length > 1024) return new Response(null, { status: 413 });
    next = safeReturnPath(new URLSearchParams(raw).get("next"));
    const client = await createAuthClient(true);
    const { data, error } = await client!.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${config.origin}/auth/callback`,
        // Supabase 기본 account_email을 제거합니다. 프로필 권한을 명시하면
        // 이미 거절한 사용자에게도 추가 동의를 강제하므로 빈 scope를 전달합니다.
        queryParams: { scope: "" },
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw new Error("OAuth unavailable");
    (await cookies()).set(AUTH_RETURN_COOKIE, next, {
      ...authCookieOptions,
      maxAge: 600,
    });
    const response = NextResponse.redirect(data.url, 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL(loginErrorPath("start", next), config.origin),
      303,
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

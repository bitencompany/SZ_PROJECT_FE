import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "@/lib/auth/config";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const config = authConfig();
  if (!config) return response;
  try {
    const client = createServerClient(config.url, config.key, {
      cookieOptions: authCookieOptions,
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          response.headers.set("Cache-Control", "private, no-store");
        },
      },
    });
    await client.auth.getClaims();
  } catch {
    // 인증 서버 장애 시 권한을 추정하지 않습니다. 각 페이지에서 다시 사용자 검증을 합니다.
  }
  return response;
}

export const config = { matcher: ["/", "/login", "/checkout", "/my/:path*"] };

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthClient } from "./server";
import { BackendError } from "../backend";

export async function verifySession(
  client: SupabaseClient | null,
): Promise<{ userId: string; accessToken: string }> {
  if (!client)
    throw new BackendError(
      "로그인 연결을 준비 중이에요.",
      503,
      "NOT_CONFIGURED",
    );
  try {
    const verified = await client.auth.getUser();
    if (verified.error) {
      const missing =
        verified.error.name === "AuthSessionMissingError" ||
        verified.error.status === 401 ||
        verified.error.status === 403;
      throw new BackendError(
        missing ? "다시 로그인해 주세요." : "로그인 상태를 확인하지 못했어요.",
        missing ? 401 : 503,
        missing ? "UNAUTHORIZED" : "AUTH_UNAVAILABLE",
      );
    }
    if (!verified.data.user || verified.data.user.is_anonymous)
      throw new BackendError("다시 로그인해 주세요.", 401, "UNAUTHORIZED");
    // getSession() 자체를 인증 근거로 사용하지 않습니다. 동일 클라이언트에서 getUser() 검증 후 토큰만 꺼냅니다.
    const { data, error } = await client.auth.getSession();
    if (
      error ||
      !data.session ||
      data.session.user.id !== verified.data.user.id ||
      !data.session.access_token
    )
      throw new BackendError("다시 로그인해 주세요.", 401, "UNAUTHORIZED");
    return {
      userId: verified.data.user.id,
      accessToken: data.session.access_token,
    };
  } catch (error) {
    if (error instanceof BackendError) throw error;
    throw new BackendError(
      "로그인 상태를 확인하지 못했어요.",
      503,
      "AUTH_UNAVAILABLE",
    );
  }
}
export async function authenticatedSession(writable = false) {
  return verifySession(await createAuthClient(writable));
}

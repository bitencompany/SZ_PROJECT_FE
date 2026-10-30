import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authConfig, authCookieOptions } from "./config";

export async function createAuthClient(
  writable = false,
): Promise<SupabaseClient | null> {
  const config = authConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: authCookieOptions,
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        // Server Component의 갱신은 proxy가 담당하고, Route Handler만 직접 기록합니다.
        if (writable)
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
      },
    },
  });
}

export type AuthState =
  | { status: "unconfigured" | "unavailable" | "guest"; user: null }
  | { status: "authenticated"; user: User };

export async function currentUser(): Promise<AuthState> {
  try {
    const client = await createAuthClient();
    if (!client) return { status: "unconfigured", user: null };
    const { data, error } = await client.auth.getUser();
    if (
      error &&
      error.name !== "AuthSessionMissingError" &&
      error.status !== 401 &&
      error.status !== 403
    )
      return { status: "unavailable", user: null };
    return data.user
      ? { status: "authenticated", user: data.user }
      : { status: "guest", user: null };
  } catch {
    return { status: "unavailable", user: null };
  }
}

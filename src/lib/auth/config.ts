import "server-only";
import { siteOrigin } from "./policy";

export function authConfig(): {
  url: string;
  key: string;
  origin: string;
} | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const origin = siteOrigin();
  if (!url || !key || !origin) return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
    return { url, key, origin };
  } catch {
    return null;
  }
}

// 브라우저 SDK를 사용하지 않으므로 세션과 PKCE 쿠키를 HttpOnly로 유지합니다.
export const authCookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

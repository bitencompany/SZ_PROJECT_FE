import "server-only";
import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BackendError } from "./backend";
import { readSignedState, signState } from "./signed-state";
export const VISITOR_COOKIE = "ireum-preview-visitor";
const schema = z.object({ id: z.uuid(), expires: z.number() });
export function trustedPreviewIp(
  headers: Headers,
  config: {
    source?: string;
    vercel?: string;
    environment?: string;
    appUrl?: string;
    backendUrl?: string;
  } = {
    source: process.env.PREVIEW_IP_SOURCE,
    vercel: process.env.VERCEL,
    environment: process.env.NODE_ENV,
    appUrl: process.env.APP_URL,
    backendUrl: process.env.BACKEND_API_URL,
  },
): string {
  // Explicit loopback development only; all local visitors share one IP budget.
  // Never trust browser-supplied forwarding headers to enable this mode.
  if (
    config.source === "local" &&
    config.environment === "development" &&
    !config.vercel
  ) {
    const loopback = (value: string | undefined): boolean => {
      try {
        const url = new URL(value ?? "");
        return (
          url.protocol === "http:" &&
          url.hostname === "127.0.0.1" &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    };
    if (loopback(config.appUrl) && loopback(config.backendUrl))
      return "127.0.0.1";
  }
  // Vercel을 거친 배포에서만 플랫폼 헤더를 사용합니다. 임의 X-Forwarded-For/클라이언트 IP는 사용하지 않습니다.
  const ip =
    config.source === "vercel" && config.vercel === "1"
      ? headers.get("x-vercel-forwarded-for")?.trim()
      : null;
  if (!ip || !isIP(ip))
    throw new BackendError(
      "사주 미리보기 연결을 준비 중이에요.",
      503,
      "PREVIEW_NOT_READY",
    );
  return ip;
}
export function previewVisitor(
  cookie: string | undefined,
  now = Date.now(),
): { id: string; cookie: string } {
  const parsed = schema.safeParse(
    readSignedState("preview-visitor-v1", cookie),
  );
  const value =
    parsed.success && parsed.data.expires > now
      ? parsed.data
      : { id: randomUUID(), expires: now + 86400000 };
  return { id: value.id, cookie: signState("preview-visitor-v1", value) };
}

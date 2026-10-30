import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { bffSecret } from "./backend";
export function signState(purpose: string, value: unknown): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${createHmac("sha256", bffSecret()).update(`${purpose}:${payload}`).digest("base64url")}`;
}
export function readSignedState(
  purpose: string,
  value: string | undefined,
): unknown {
  if (!value || value.length > 3000) return null;
  try {
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256", bffSecret())
      .update(`${purpose}:${parts[0]}`)
      .digest();
    const actual = Buffer.from(parts[1], "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null;
    return JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

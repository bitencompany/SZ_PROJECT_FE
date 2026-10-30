export const AUTH_RETURN_COOKIE = "ireum-auth-return";

export function safeReturnPath(value: unknown): string {
  return typeof value === "string" &&
    (value === "/" ||
      value === "/checkout" ||
      /^\/checkout\?request=[0-9a-f-]{36}$/.test(value) ||
      value === "/my/readings" ||
      /^\/my\/(readings|orders)\/[0-9a-f-]{36}$/.test(value))
    ? value
    : "/";
}

export function siteOrigin(): string | null {
  try {
    const url = new URL(process.env.APP_URL ?? "http://127.0.0.1:3000");
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.APP_URL || url.protocol !== "https:")
    )
      return null;
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isSameOriginPost(request: Request, origin: string): boolean {
  return request.method === "POST" && request.headers.get("origin") === origin;
}

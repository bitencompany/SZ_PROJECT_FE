export class ApiFailure extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export function apiMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const body = value as { error?: unknown; retryAfter?: unknown };
  const text = typeof body.error === "string" ? body.error : fallback;
  return typeof body.retryAfter === "number" && body.retryAfter > 0
    ? `${text} 최소 ${body.retryAfter}초 후 다시 시도해 주세요. 한도가 남아 있으면 더 기다려야 할 수 있어요.`
    : text;
}
export async function clientApi(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    signal: init.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(25000)])
      : AbortSignal.timeout(25000),
  });
  const body: unknown = await response.json();
  if (!response.ok)
    throw new ApiFailure(
      apiMessage(body, "요청을 처리하지 못했어요."),
      response.status,
    );
  return body;
}

import "server-only";
import { BackendError } from "./backend";
import { siteOrigin } from "./auth/policy";
export const privateHeaders = { "Cache-Control": "private, no-store" };
export function checkMutationOrigin(request: Request): void {
  const origin = siteOrigin();
  if (!origin || request.headers.get("origin") !== origin)
    throw new BackendError(
      "페이지를 새로고침한 뒤 다시 시도해 주세요.",
      403,
      "FORBIDDEN_ORIGIN",
    );
}
export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new BackendError(
      "JSON 형식으로 입력해 주세요.",
      415,
      "INVALID_CONTENT_TYPE",
    );
  const reader = request.body?.getReader();
  if (!reader)
    throw new BackendError("입력 내용을 확인해 주세요.", 400, "INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 4096) {
      await reader.cancel();
      throw new BackendError("입력 정보가 너무 큽니다.", 413, "BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BackendError("입력 내용을 확인해 주세요.", 400, "INVALID_JSON");
  }
}
export function errorResponse(error: unknown): Response {
  const known =
    error instanceof BackendError
      ? error
      : new BackendError(
          "응답을 확인하지 못했어요. 다시 시도해 주세요.",
          502,
          "INVALID_RESPONSE",
        );
  return Response.json(
    {
      error: known.message,
      code: known.code,
      ...(known.retryAfter !== undefined
        ? { retryAfter: known.retryAfter }
        : {}),
    },
    {
      status: known.status,
      headers: {
        ...privateHeaders,
        ...(known.retryAfter !== undefined
          ? { "Retry-After": String(known.retryAfter) }
          : {}),
      },
    },
  );
}

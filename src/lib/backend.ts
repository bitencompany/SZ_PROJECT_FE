import "server-only";

export class BackendError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "UPSTREAM_ERROR",
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}
export function bffSecret(): string {
  const secret = process.env.BFF_SHARED_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32)
    throw new BackendError(
      "서비스 연결을 준비 중이에요.",
      503,
      "NOT_CONFIGURED",
    );
  return secret;
}
export interface BackendOptions {
  method?: "GET" | "POST" | "DELETE";
  accessToken?: string;
  visitor?: { ip: string; id: string };
}
export async function backendRequest(
  path: string,
  body?: unknown,
  options: BackendOptions = {},
): Promise<unknown> {
  const origin = process.env.BACKEND_API_URL;
  if (!origin)
    throw new BackendError(
      "서비스 연결을 준비 중이에요.",
      503,
      "NOT_CONFIGURED",
    );
  const secret = bffSecret();
  try {
    const base = new URL(origin);
    const url = new URL(path, base);
    if (
      !path.startsWith("/api/") ||
      url.origin !== base.origin ||
      base.username ||
      base.password ||
      !["http:", "https:"].includes(url.protocol) ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    )
      throw new BackendError(
        "서비스 연결 설정을 확인해 주세요.",
        503,
        "NOT_CONFIGURED",
      );
    // 원 요청의 쿠키/Origin/Authorization/BFF 헤더를 복사하지 않습니다.
    const headers: Record<string, string> = { "X-BFF-Secret": secret };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (options.accessToken)
      headers.Authorization = `Bearer ${options.accessToken}`;
    if (options.visitor) {
      headers["X-Client-IP"] = options.visitor.ip;
      headers["X-Anonymous-ID"] = options.visitor.id;
    }
    const response = await fetch(url, {
      method: options.method ?? (body === undefined ? "GET" : "POST"),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    const value: unknown = await response.json();
    if (!response.ok) {
      const error =
        value && typeof value === "object" && "error" in value
          ? value.error
          : null;
      const code =
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string"
          ? error.code
          : "UPSTREAM_ERROR";
      const messages: Record<string, string> = {
        UNAUTHORIZED: "다시 로그인해 주세요.",
        NOT_FOUND: "요청한 내용을 찾을 수 없어요.",
        FORBIDDEN: "서비스 연결을 확인하지 못했어요.",
        PAYMENT_REQUIRED: "구매한 결과만 확인할 수 있어요.",
        INVALID_INPUT: "입력 정보를 확인해 주세요.",
        INVALID_DATE: "생년월일을 확인해 주세요.",
        HANJA_MISMATCH: "이름과 선택한 한자를 확인해 주세요.",
        INVALID_VISITOR: "사주 미리보기 연결을 준비 중이에요.",
        REQUEST_CONFLICT:
          "이미 보관된 요청과 입력이 달라요. 입력 화면에서 새 요청으로 시작해 주세요.",
        IDEMPOTENCY_CONFLICT:
          "이미 처리한 요청과 정보가 달라요. 기존 주문을 확인해 주세요.",
        ORDER_EXISTS: "이미 연결된 주문이 있어요. 기존 주문을 확인해 주세요.",
        ORDER_LINKED_REQUEST:
          "주문에 연결된 입력은 고객 지원을 통해 삭제해 주세요.",
        REQUEST_LIMIT:
          "보관함이 가득 찼어요. 사용하지 않는 입력을 삭제해 주세요.",
        RATE_LIMITED: "요청이 많아요. 잠시 후 직접 다시 시도해 주세요.",
        SAMPLE_PROFILE_REQUIRED:
          "현재 연결은 샘플만 지원해요. SAZU 샘플 입력으로 확인해 주세요.",
        CATALOG_NOT_READY: "검수된 한자 자료를 준비 중이에요.",
        PREVIEW_NOT_READY: "사주 미리보기를 준비 중이에요.",
        PAYMENT_NOT_READY: "상세 풀이 결제를 준비 중이에요.",
        GENERATION_NOT_READY: "상세 분석 생성을 준비 중이에요.",
        NOT_CONFIGURED: "서비스 연결을 준비 중이에요.",
        UNVERIFIED_CATALOG: "한자 자료 검수가 끝난 후 구매할 수 있어요.",
        SAMPLE_NOT_PAYABLE: "샘플 결과는 구매할 수 없어요.",
        PRODUCT_NOT_AVAILABLE: "상세 풀이 상품을 준비 중이에요.",
      };
      const retryHeader = response.headers.get("retry-after");
      const retryAfter =
        response.status === 429
          ? /^\d+$/.test(retryHeader ?? "")
            ? Math.min(Number(retryHeader), 86400)
            : 60
          : undefined;
      throw new BackendError(
        messages[code] ??
          "분석 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        response.status,
        code,
        retryAfter,
      );
    }
    return value;
  } catch (error: unknown) {
    if (error instanceof BackendError) throw error;
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    )
      throw new BackendError(
        "응답이 늦어지고 있어요. 입력은 유지되며 잠시 후 다시 시도할 수 있어요.",
        504,
        "UPSTREAM_TIMEOUT",
      );
    throw new BackendError(
      "분석 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      502,
    );
  }
}

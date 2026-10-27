import "server-only";
import type { BirthInput } from "./validation";
import type { SazuResult } from "./types";
import { parseSazuResponse, toSazuRequest } from "./sazu-contract";

export class SazuError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function fetchSazu(input: BirthInput): Promise<SazuResult> {
  const key: string | undefined = process.env.SAZU_API_KEY;
  if (!key)
    throw new SazuError(
      "사주 분석을 준비 중이에요. 지금은 이름 분석을 먼저 이용해 주세요.",
      503,
    );
  // 결제·사용자별 호출 제한 구현 전에는 배포 환경에서 유료 API가 공개 호출되지 않게 합니다.
  if (process.env.NODE_ENV === "production")
    throw new SazuError("사주 분석 서비스는 정식 오픈을 준비 중이에요.", 503);
  try {
    const response: Response = await fetch(
      "https://api.sazu.app/v2/sazu/manse",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key },
        body: JSON.stringify(toSazuRequest(input)),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    const body: unknown = await response.json();
    if (!response.ok) {
      const code: unknown =
        body &&
        typeof body === "object" &&
        "error" in body &&
        body.error &&
        typeof body.error === "object" &&
        "code" in body.error
          ? body.error.code
          : null;
      if (code === "SAMPLE_PROFILE_REQUIRED")
        throw new SazuError(
          "현재 연결은 샘플만 지원해요. SAZU 샘플 입력 버튼으로 확인해 주세요.",
          422,
        );
      if (response.status === 429)
        throw new SazuError(
          "분석 요청이 많아요. 잠시 후 다시 시도해 주세요.",
          429,
        );
      throw new SazuError(
        "사주 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
        502,
      );
    }
    return parseSazuResponse(body);
  } catch (error: unknown) {
    if (error instanceof SazuError) throw error;
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new SazuError(
        "분석 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.",
        504,
      );
    throw new SazuError(
      "사주 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
      502,
    );
  }
}

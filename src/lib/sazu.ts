import "server-only";
import type { BirthInput } from "./validation";
import type { SazuResult } from "./types";
import { parsePreviewResponse, toSazuRequest } from "./sazu-contract";
import { backendRequest, BackendError } from "./backend";
export async function fetchSazu(
  input: BirthInput,
  visitor: { ip: string; id: string },
): Promise<SazuResult> {
  try {
    return parsePreviewResponse(
      await backendRequest(
        "/api/sazu/preview",
        { birth: toSazuRequest(input), consent: true },
        { visitor },
      ),
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) throw error;
    throw new BackendError(
      "사주 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.",
      502,
      "INVALID_RESPONSE",
    );
  }
}

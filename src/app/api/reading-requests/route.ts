import { backendRequest, BackendError } from "@/lib/backend";
import { readingRequestSchema } from "@/lib/reading-request";
import { saveResponseSchema } from "@/lib/member-contract";
import { readJson } from "@/lib/bff-http";
import { memberEndpoint } from "@/lib/member-api";
import { updateRecentRequest } from "@/lib/recent-requests";
export async function POST(request: Request): Promise<Response> {
  return memberEndpoint(request, async ({ userId, accessToken }) => {
    const parsed = readingRequestSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new BackendError(
        "이름·출생 정보와 저장 동의를 확인해 주세요.",
        400,
        "INVALID_INPUT",
      );
    const result = saveResponseSchema.parse(
      await backendRequest("/api/reading-requests", parsed.data, {
        accessToken,
      }),
    );
    if (result.data.requestId !== parsed.data.requestId)
      throw new BackendError(
        "저장 응답을 확인하지 못했어요.",
        502,
        "INVALID_RESPONSE",
      );
    await updateRecentRequest(userId, result.data.requestId);
    return result;
  });
}

import { z } from "zod";
import { backendRequest, BackendError } from "@/lib/backend";
import { memberEndpoint } from "@/lib/member-api";
import { readingListSchema } from "@/lib/member-contract";
export async function GET(request: Request): Promise<Response> {
  return memberEndpoint(request, async ({ accessToken }) => {
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .safeParse(new URL(request.url).searchParams.get("page") ?? 0);
    if (!page.success)
      throw new BackendError(
        "페이지 번호를 확인해 주세요.",
        400,
        "INVALID_INPUT",
      );
    const result = readingListSchema.parse(
      await backendRequest(`/api/readings?page=${page.data}`, undefined, {
        accessToken,
      }),
    );
    if (result.nextPage !== null && result.nextPage <= page.data)
      throw new BackendError(
        "목록 응답을 확인하지 못했어요.",
        502,
        "INVALID_RESPONSE",
      );
    return result;
  });
}

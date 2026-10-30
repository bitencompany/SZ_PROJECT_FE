import { nameInputSchema } from "@/lib/validation";
import { analyzeNameInput } from "@/lib/name-service";
import { BackendError } from "@/lib/backend";
import { errorResponse } from "@/lib/bff-http";

export async function POST(request: Request): Promise<Response> {
  try {
    const body: string = await request.text();
    if (new TextEncoder().encode(body).length > 4096)
      return Response.json(
        { error: "입력 데이터가 너무 큽니다." },
        { status: 413 },
      );
    const parsed = nameInputSchema.safeParse(JSON.parse(body) as unknown);
    if (!parsed.success)
      return Response.json(
        { error: "이름, 성의 글자 수와 한자 선택을 확인해 주세요." },
        { status: 400 },
      );
    try {
      return Response.json(await analyzeNameInput(parsed.data), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: unknown) {
      if (error instanceof BackendError) return errorResponse(error);
      return Response.json(
        {
          error:
            error instanceof BackendError
              ? error.message
              : process.env.BACKEND_NAME_ENABLED === "true"
                ? "분석 응답을 확인하지 못했어요."
                : "이름에 맞는 한자를 모두 선택해 주세요.",
        },
        {
          status:
            error instanceof BackendError
              ? error.status
              : process.env.BACKEND_NAME_ENABLED === "true"
                ? 502
                : 400,
        },
      );
    }
  } catch {
    return Response.json(
      { error: "입력 정보를 읽지 못했어요. 다시 시도해 주세요." },
      { status: 400 },
    );
  }
}

import { birthSchema } from "@/lib/validation";
import { fetchSazu, SazuError } from "@/lib/sazu";

export async function POST(request: Request): Promise<Response> {
  try {
    const body: string = await request.text();
    if (body.length > 4096)
      return Response.json(
        { error: "입력 데이터가 너무 큽니다." },
        { status: 413 },
      );
    const parsed = birthSchema.safeParse(JSON.parse(body) as unknown);
    if (!parsed.success)
      return Response.json(
        { error: "생년월일·태어난 시간·정보 제공 동의를 확인해 주세요." },
        { status: 400 },
      );
    const result = await fetchSazu(parsed.data);
    return Response.json(
      { data: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof SazuError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json(
      { error: "입력 정보를 처리하지 못했어요. 다시 시도해 주세요." },
      { status: 400 },
    );
  }
}

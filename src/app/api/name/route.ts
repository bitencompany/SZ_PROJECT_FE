import { nameSchema } from "@/lib/validation";
import { analyzeName } from "@/lib/name-analysis";

export async function POST(request: Request): Promise<Response> {
  try {
    const body: string = await request.text();
    if (body.length > 4096)
      return Response.json(
        { error: "입력 데이터가 너무 큽니다." },
        { status: 413 },
      );
    const parsed = nameSchema.safeParse(JSON.parse(body) as unknown);
    if (!parsed.success)
      return Response.json(
        { error: "이름과 한자 세 글자를 확인해 주세요." },
        { status: 400 },
      );
    try {
      return Response.json(
        { data: analyzeName(parsed.data.name, parsed.data.hanjaIds) },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json(
        { error: "이름에 맞는 한자를 모두 선택해 주세요." },
        { status: 400 },
      );
    }
  } catch {
    return Response.json(
      { error: "입력 정보를 읽지 못했어요. 다시 시도해 주세요." },
      { status: 400 },
    );
  }
}

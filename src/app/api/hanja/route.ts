import { lookupHanja } from "@/lib/name-service";
import { errorResponse } from "@/lib/bff-http";

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const reading = params.get("reading") ?? "";
  const query = params.get("q") ?? "";
  const headers = { "Cache-Control": "no-store, private" };
  if (!/^[가-힣]$/.test(reading) || query.length > 40)
    return Response.json(
      { error: "한글 한 글자와 검색어를 확인해 주세요." },
      { status: 400, headers },
    );
  try {
    return Response.json(await lookupHanja(reading, query), { headers });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

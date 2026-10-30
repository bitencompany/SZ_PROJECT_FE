import { cookies } from "next/headers";
import { birthSchema } from "@/lib/validation";
import { fetchSazu } from "@/lib/sazu";
import { BackendError } from "@/lib/backend";
import {
  checkMutationOrigin,
  errorResponse,
  privateHeaders,
  readJson,
} from "@/lib/bff-http";
import {
  previewVisitor,
  trustedPreviewIp,
  VISITOR_COOKIE,
} from "@/lib/preview-visitor";
import { authCookieOptions } from "@/lib/auth/config";
export async function POST(request: Request): Promise<Response> {
  try {
    checkMutationOrigin(request);
    const parsed = birthSchema.strict().safeParse(await readJson(request));
    if (!parsed.success)
      throw new BackendError(
        "출생 정보와 제공 동의를 확인해 주세요.",
        400,
        "INVALID_INPUT",
      );
    const ip = trustedPreviewIp(request.headers);
    const store = await cookies();
    const visitor = previewVisitor(store.get(VISITOR_COOKIE)?.value);
    // 실패 응답에도 같은 익명 쿠키를 유지해 요청마다 새 ID로 한도를 우회하지 않게 합니다.
    store.set(VISITOR_COOKIE, visitor.cookie, {
      ...authCookieOptions,
      maxAge: 86400,
    });
    const result = await fetchSazu(parsed.data, { ip, id: visitor.id });
    return Response.json({ data: result }, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

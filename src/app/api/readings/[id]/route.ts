import { backendRequest } from "@/lib/backend";
import { memberEndpoint, uuid } from "@/lib/member-api";
import { readingDetailSchema } from "@/lib/member-contract";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return memberEndpoint(request, async ({ accessToken }) =>
    readingDetailSchema.parse(
      await backendRequest(
        `/api/readings/${uuid((await context.params).id)}`,
        undefined,
        { accessToken },
      ),
    ),
  );
}

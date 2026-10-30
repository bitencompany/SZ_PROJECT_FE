import { z } from "zod";
import { backendRequest } from "@/lib/backend";
import { memberEndpoint, uuid } from "@/lib/member-api";
import { savedRequestSchema } from "@/lib/member-contract";
import { updateRecentRequest } from "@/lib/recent-requests";
type Context = { params: Promise<{ id: string }> };
export async function GET(
  request: Request,
  context: Context,
): Promise<Response> {
  return memberEndpoint(request, async ({ accessToken }) => {
    const id = uuid((await context.params).id);
    return savedRequestSchema.parse(
      await backendRequest(`/api/reading-requests/${id}`, undefined, {
        accessToken,
      }),
    );
  });
}
export async function DELETE(
  request: Request,
  context: Context,
): Promise<Response> {
  return memberEndpoint(request, async ({ userId, accessToken }) => {
    const id = uuid((await context.params).id);
    const result = z
      .object({ data: z.object({ deleted: z.literal(true) }) })
      .parse(
        await backendRequest(`/api/reading-requests/${id}`, undefined, {
          method: "DELETE",
          accessToken,
        }),
      );
    await updateRecentRequest(userId, id, true);
    return result;
  });
}

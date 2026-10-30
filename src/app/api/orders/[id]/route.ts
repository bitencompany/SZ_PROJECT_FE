import { backendRequest } from "@/lib/backend";
import { memberEndpoint, uuid } from "@/lib/member-api";
import { orderSchema } from "@/lib/member-contract";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return memberEndpoint(request, async ({ accessToken }) =>
    orderSchema.parse(
      await backendRequest(
        `/api/orders/${uuid((await context.params).id)}`,
        undefined,
        { accessToken },
      ),
    ),
  );
}

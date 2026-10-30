import { z } from "zod";
import { backendRequest } from "@/lib/backend";
import { memberEndpoint, uuid } from "@/lib/member-api";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return memberEndpoint(request, async ({ accessToken }) =>
    z
      .object({ data: z.object({ orderId: z.uuid() }) })
      .parse(
        await backendRequest(
          `/api/orders/${uuid((await context.params).id)}/retry`,
          undefined,
          { method: "POST", accessToken },
        ),
      ),
  );
}

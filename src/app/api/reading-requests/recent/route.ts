import { backendRequest, BackendError } from "@/lib/backend";
import { memberEndpoint } from "@/lib/member-api";
import { savedRequestSchema } from "@/lib/member-contract";
import { recentRequestIds } from "@/lib/recent-requests";
export async function GET(request: Request): Promise<Response> {
  return memberEndpoint(request, async ({ userId, accessToken }) => {
    const ids = await recentRequestIds(userId);
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return savedRequestSchema.parse(
            await backendRequest(`/api/reading-requests/${id}`, undefined, {
              accessToken,
            }),
          ).data;
        } catch (error) {
          if (error instanceof BackendError && error.status === 404)
            return null;
          throw error;
        }
      }),
    );
    return { data: results.filter((item) => item !== null) };
  });
}

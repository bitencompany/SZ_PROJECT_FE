import "server-only";
import { z } from "zod";
import { authenticatedSession } from "./auth/session";
import { BackendError } from "./backend";
import { checkMutationOrigin, errorResponse, privateHeaders } from "./bff-http";
export function uuid(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success)
    throw new BackendError("요청한 내용을 찾을 수 없어요.", 404, "NOT_FOUND");
  return parsed.data;
}
export async function memberEndpoint(
  request: Request,
  action: (session: {
    userId: string;
    accessToken: string;
  }) => Promise<unknown>,
): Promise<Response> {
  try {
    if (request.method !== "GET") checkMutationOrigin(request);
    const session = await authenticatedSession(true);
    return Response.json(await action(session), { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

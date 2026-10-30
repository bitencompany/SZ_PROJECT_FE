import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { readSignedState, signState } from "./signed-state";
import { authCookieOptions } from "./auth/config";
const KEY = "ireum-recent-requests";
const schema = z.object({
  userId: z.uuid(),
  ids: z.array(z.uuid()).max(10),
  expires: z.number(),
});
export async function recentRequestIds(userId: string): Promise<string[]> {
  const parsed = schema.safeParse(
    readSignedState(KEY, (await cookies()).get(KEY)?.value),
  );
  return parsed.success &&
    parsed.data.userId === userId &&
    parsed.data.expires > Date.now()
    ? parsed.data.ids
    : [];
}
export async function updateRecentRequest(
  userId: string,
  id: string,
  remove = false,
): Promise<void> {
  const previous = (await recentRequestIds(userId)).filter(
    (item) => item !== id,
  );
  const ids = (remove ? previous : [id, ...previous]).slice(0, 10);
  (await cookies()).set(
    KEY,
    signState(KEY, { userId, ids, expires: Date.now() + 30 * 86400000 }),
    { ...authCookieOptions, maxAge: 30 * 86400 },
  );
}

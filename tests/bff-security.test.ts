import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifySession } from "../src/lib/auth/session";
import { BackendError } from "../src/lib/backend";
import { previewVisitor, trustedPreviewIp } from "../src/lib/preview-visitor";
import { signState, readSignedState } from "../src/lib/signed-state";
import { saveResponseSchema } from "../src/lib/member-contract";
const userId = "11111111-1111-4111-8111-111111111111";

test("서버 토큰은 getUser 검증 후에만 읽고 이메일 없는 사용자를 지원한다", async () => {
  const calls: string[] = [];
  const client = {
    auth: {
      async getUser() {
        calls.push("getUser");
        return { data: { user: { id: userId } }, error: null };
      },
      async getSession() {
        calls.push("getSession");
        return {
          data: { session: { access_token: "verified", user: { id: userId } } },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;
  assert.deepEqual(await verifySession(client), {
    userId,
    accessToken: "verified",
  });
  assert.deepEqual(calls, ["getUser", "getSession"]);
});

test("위조/만료 사용자·익명 사용자·다른 세션 주체의 토큰을 거절한다", async () => {
  for (const scenario of ["invalid", "anonymous", "mismatch"]) {
    let tokenRead = false;
    const client = {
      auth: {
        async getUser() {
          return {
            data: {
              user: { id: userId, is_anonymous: scenario === "anonymous" },
            },
            error: scenario === "invalid" ? { status: 401 } : null,
          };
        },
        async getSession() {
          tokenRead = true;
          return {
            data: {
              session: { access_token: "untrusted", user: { id: "other" } },
            },
            error: null,
          };
        },
      },
    } as unknown as SupabaseClient;
    await assert.rejects(
      verifySession(client),
      (error: unknown) => error instanceof BackendError && error.status === 401,
    );
    if (scenario !== "mismatch") assert.equal(tokenRead, false);
  }
});

test("신뢰 IP는 Vercel 환경의 단일 유효 플랫폼 IP만 허용한다", () => {
  const headers = new Headers({
    "x-client-ip": "192.0.2.1",
    "x-forwarded-for": "192.0.2.2",
    "x-vercel-forwarded-for": "192.0.2.3",
  });
  assert.equal(
    trustedPreviewIp(headers, { source: "vercel", vercel: "1" }),
    "192.0.2.3",
  );
  assert.throws(() =>
    trustedPreviewIp(headers, { source: "vercel", vercel: undefined }),
  );
  assert.throws(() =>
    trustedPreviewIp(headers, { source: undefined, vercel: "1" }),
  );
  for (const value of ["192.0.2.1, 192.0.2.2", "unknown", "192.0.2.1:80", ""]) {
    headers.set("x-vercel-forwarded-for", value);
    assert.throws(() =>
      trustedPreviewIp(headers, { source: "vercel", vercel: "1" }),
    );
  }
});

test("익명 ID 쿠키는 서버 서명 검증·만료·용도 구분을 적용한다", (t) => {
  const old = process.env.BFF_SHARED_SECRET;
  process.env.BFF_SHARED_SECRET = "synthetic-test-secret-not-real-00000000";
  t.after(() => {
    if (old === undefined) delete process.env.BFF_SHARED_SECRET;
    else process.env.BFF_SHARED_SECRET = old;
  });
  const first = previewVisitor(undefined, 1000);
  assert.equal(previewVisitor(first.cookie, 2000).id, first.id);
  assert.notEqual(previewVisitor(first.cookie, 86402000).id, first.id);
  assert.notEqual(previewVisitor(`${first.cookie}bad`, 2000).id, first.id);
  assert.notEqual(previewVisitor(userId, 2000).id, userId);
  assert.equal(
    readSignedState("other-purpose", signState("purpose", { userId })),
    null,
  );
});

test("현재 계약에서 paymentAvailable=true는 성공 응답으로 수락하지 않는다", () => {
  assert.equal(
    saveResponseSchema.safeParse({
      data: { requestId: userId, paymentAvailable: true },
    }).success,
    false,
  );
});

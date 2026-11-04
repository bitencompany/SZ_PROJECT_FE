import { test } from "node:test";
import assert from "node:assert/strict";
import { clientApi, ApiFailure } from "../src/lib/client-api";

test("한자 준비 중·횟수 제한·타임아웃 안내를 브라우저 호출까지 보존하고 자동 재시도하지 않는다", async (t) => {
  for (const [status, body] of [
    [
      503,
      { error: "검수된 한자 자료를 준비 중이에요.", code: "CATALOG_NOT_READY" },
    ],
    [429, { error: "요청이 많아요.", code: "RATE_LIMITED", retryAfter: 60 }],
    [504, { error: "응답이 늦어지고 있어요.", code: "UPSTREAM_TIMEOUT" }],
  ] as const) {
    const fetch = t.mock.method(globalThis, "fetch", async () =>
      Response.json(body, { status }),
    );
    await assert.rejects(
      clientApi("/api/hanja?reading=김"),
      (error: unknown) => {
        assert.ok(error instanceof ApiFailure);
        assert.equal(error.status, status);
        assert.ok(error.message.startsWith(body.error));
        if (status === 429) assert.match(error.message, /60초/);
        return true;
      },
    );
    assert.equal(fetch.mock.callCount(), 1);
    fetch.mock.restore();
  }
});

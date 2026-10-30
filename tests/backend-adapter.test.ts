import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { fetchSazu } from "../src/lib/sazu";
import { backendRequest, BackendError } from "../src/lib/backend";
import { lookupHanja } from "../src/lib/name-service";
import { errorResponse, readJson } from "../src/lib/bff-http";
import { POST as previewPost } from "../src/app/api/sazu/route";
function configure(t: TestContext, values: Record<string, string | undefined>) {
  const old = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}
const secret = "synthetic-test-secret-not-real-00000000";
const birth = {
  birthDate: "1998-05-19",
  birthTime: null,
  gender: "male" as const,
  birthCity: "서울" as const,
  consent: true as const,
};
const visitor = { ip: "192.0.2.1", id: "11111111-1111-4111-8111-111111111111" };

test("운영 미리보기는 신규 BE 경로·서버 BFF/익명 헤더를 사용하고 이름을 보내지 않는다", async (t) => {
  configure(t, {
    NODE_ENV: "production",
    BACKEND_API_URL: "https://backend.example",
    BFF_SHARED_SECRET: secret,
  });
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.href, "https://backend.example/api/sazu/preview");
    assert.deepEqual(init.headers, {
      "Content-Type": "application/json",
      "X-BFF-Secret": secret,
      "X-Client-IP": visitor.ip,
      "X-Anonymous-ID": visitor.id,
    });
    assert.equal(init.cache, "no-store");
    assert.equal(init.redirect, "error");
    const payload = JSON.parse(init.body as string);
    assert.deepEqual(Object.keys(payload).sort(), ["birth", "consent"]);
    assert.equal(payload.consent, true);
    assert.equal(payload.birth.birthHour, null);
    assert.equal(payload.birth.birthMinute, 0);
    assert.equal("name" in payload.birth, false);
    return Response.json({
      success: true,
      data: {
        source: "SAZU",
        sandbox: true,
        previewId: visitor.id,
        expiresAt: "2030-01-01T00:00:00.000Z",
        providerVersion: "test-v1",
        modules: {
          fourPillars: {
            year: { full: "甲子" },
            month: { full: "乙丑" },
            day: { full: "丙寅" },
            hour: null,
          },
        },
      },
    });
  });
  const result = await fetchSazu(birth, visitor);
  assert.equal(result.sample, true);
  assert.equal(result.pillars[3].value, null);
  assert.equal(result.previewId, visitor.id);
  assert.equal(result.providerVersion, "test-v1");
  assert.deepEqual(result.elements, []);
});

test("회원 호출은 선택한 서버 토큰만 전송하고 DELETE/재시도 POST를 구분한다", async (t) => {
  configure(t, {
    BACKEND_API_URL: "http://backend.example",
    BFF_SHARED_SECRET: secret,
  });
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (_url: URL, init: RequestInit) => {
    assert.deepEqual(init.headers, {
      "X-BFF-Secret": secret,
      Authorization: "Bearer verified-token",
    });
    assert.equal(init.body, undefined);
    methods.push(init.method!);
    return Response.json({ data: {} });
  });
  await backendRequest("/api/reading-requests/id", undefined, {
    method: "DELETE",
    accessToken: "verified-token",
  });
  await backendRequest("/api/orders/id/retry", undefined, {
    method: "POST",
    accessToken: "verified-token",
  });
  assert.deepEqual(methods, ["DELETE", "POST"]);
});

test("비밀 미설정과 외부 URL은 BE 호출 전에 차단한다", async (t) => {
  configure(t, {
    BACKEND_API_URL: "http://backend.example",
    BFF_SHARED_SECRET: undefined,
  });
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not call");
  });
  await assert.rejects(
    backendRequest("/api/readings"),
    (error: unknown) => error instanceof BackendError && error.status === 503,
  );
  process.env.BFF_SHARED_SECRET = secret;
  await assert.rejects(backendRequest("https://attacker.example/api/readings"));
  await assert.rejects(backendRequest("//attacker.example/api/readings"));
  assert.equal(fetch.mock.callCount(), 0);
});

test("한자 BE 오류를 예시로 대체하지 않고 429 Retry-After를 보존한다", async (t) => {
  configure(t, {
    BACKEND_API_URL: "http://backend.example",
    BFF_SHARED_SECRET: secret,
    BACKEND_NAME_ENABLED: "true",
  });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        success: false,
        error: { code: "RATE_LIMITED", message: "private body secret" },
      },
      { status: 429, headers: { "Retry-After": "60" } },
    ),
  );
  try {
    await lookupHanja("김");
    assert.fail("must reject");
  } catch (error) {
    assert.ok(error instanceof BackendError);
    assert.equal(error.status, 429);
    const response = errorResponse(error);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.equal(body.retryAfter, 60);
    assert.equal(body.error.includes("secret"), false);
  }
});

test("유료 미리보기는 타 출처·동의 누락·신뢰 IP 미설정이면 외부 호출을 하지 않는다", async (t) => {
  configure(t, {
    APP_URL: "http://frontend.example",
    PREVIEW_IP_SOURCE: undefined,
    VERCEL: undefined,
  });
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not call");
  });
  const request = (origin: string, payload: unknown) =>
    new Request("http://frontend.example/api/sazu", {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/json",
        "X-Client-IP": "192.0.2.9",
        "X-Anonymous-ID": visitor.id,
      },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (await previewPost(request("https://attacker.example", birth))).status,
    403,
  );
  assert.equal(
    (
      await previewPost(
        request("http://frontend.example", { ...birth, consent: false }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await previewPost(request("http://frontend.example", birth))).status,
    503,
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test("요청 크기는 문자열 글자 수가 아닌 실제 UTF-8 바이트로 제한한다", async () => {
  await assert.rejects(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "가".repeat(1400) }),
      }),
    ),
    (error: unknown) => error instanceof BackendError && error.status === 413,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSameOriginPost,
  safeReturnPath,
  loginErrorPath,
} from "../src/lib/auth/policy";
import { DRAFT_TTL, parseDraft, createDraft } from "../src/lib/reading-draft";
import { readingRequestSchema } from "../src/lib/reading-request";

test("OAuth 복귀 주소는 서비스 내부의 허용된 화면만 사용한다", () => {
  for (const input of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/auth/logout",
    "/checkout?next=https://evil.example",
    null,
  ])
    assert.equal(safeReturnPath(input), "/");
  assert.equal(safeReturnPath("/checkout"), "/checkout");
  assert.equal(safeReturnPath("/my/readings"), "/my/readings");
});

test("로그인·로그아웃·저장은 같은 출처 POST만 허용한다", () => {
  const origin = "https://example.com";
  assert.equal(
    isSameOriginPost(
      new Request(origin, { method: "POST", headers: { origin } }),
      origin,
    ),
    true,
  );
  for (const headers of [
    {},
    { origin: "https://evil.example" },
    { origin: "null" },
  ] as Record<string, string>[])
    assert.equal(
      isSameOriginPost(
        new Request(origin, { method: "POST", headers }),
        origin,
      ),
      false,
    );
  assert.equal(
    isSameOriginPost(new Request(origin, { headers: { origin } }), origin),
    false,
  );
});

test("임시 입력은 30분 후 만료되며 훼손·미래 시각·동의/결제 상태를 복원하지 않는다", () => {
  const now = 1800000000000;
  const draft = {
    version: 1,
    id: "e9a4ef95-834e-4007-959b-84918d9a9a24",
    savedAt: now,
    name: "김서준",
    ids: ["김-金", "서-書", "준-俊"],
    birthDate: "1998-05-19",
    birthTime: "10:00",
    unknownTime: false,
    gender: "male",
    birthCity: "서울",
    step: 2,
    paid: true,
    consent: true,
  };
  const result = parseDraft(JSON.stringify(draft), now);
  assert.equal(result?.name, "김서준");
  assert.equal("paid" in result!, false);
  assert.equal("consent" in result!, false);
  assert.equal(parseDraft(JSON.stringify(draft), now + DRAFT_TTL + 1), null);
  assert.equal(parseDraft(JSON.stringify(draft), now + DRAFT_TTL), null);
  assert.equal(parseDraft(JSON.stringify(draft), now - 1), null);
  assert.equal(parseDraft("{", now), null);
});

test("분석 요청은 사용자 ID·가격·결제 여부를 거부하고 저장 동의를 요구한다", () => {
  const input = {
    requestId: "e9a4ef95-834e-4007-959b-84918d9a9a24",
    name: "김서준",
    hanjaIds: ["김-金", "서-書", "준-俊"],
    birth: null,
    consentToSave: true,
  };
  assert.equal(readingRequestSchema.safeParse(input).success, true);
  for (const extra of [
    { userId: "someone" },
    { amount: 1 },
    { paid: true },
    { consentToSave: false },
  ])
    assert.equal(
      readingRequestSchema.safeParse({ ...input, ...extra }).success,
      false,
    );
});

test("로그인 시작 실패·취소·콜백 오류 후에도 안전한 복귀 화면을 유지한다", () => {
  const next = "/checkout?request=e9a4ef95-834e-4007-959b-84918d9a9a24";
  for (const error of ["start", "callback", "cancelled", "expired"] as const) {
    const url = new URL(
      loginErrorPath(error, next),
      "https://frontend.example",
    );
    assert.equal(url.pathname, "/login");
    assert.equal(url.searchParams.get("next"), next);
    assert.equal(url.searchParams.get("error"), error);
    assert.equal(
      new URL(
        loginErrorPath(error, "//attacker.example"),
        url,
      ).searchParams.get("next"),
      "/",
    );
  }
});

test("같은 입력 재분석·로그인 재시도는 요청 ID와 유효한 previewId를 보존한다", () => {
  const now = 1800000000000;
  const input = {
    name: "김서준",
    nameMode: "hanja" as const,
    surnameLength: 1 as const,
    ids: ["김-金", "서-書", "준-俊"],
    birthDate: "1998-05-19",
    birthTime: "10:00",
    unknownTime: false,
    gender: "male" as const,
    birthCity: "서울",
    step: 1 as const,
  };
  const preview = {
    id: "11111111-1111-4111-8111-111111111111",
    expiresAt: new Date(now + 60000).toISOString(),
    providerVersion: "test-v1",
  };
  const first = createDraft(input, null, preview, now);
  const restored = parseDraft(JSON.stringify(first), now + 1000)!;
  const retried = createDraft(
    { ...input, step: 2 },
    restored,
    undefined,
    now + 1000,
  );
  assert.equal(retried.id, first.id);
  assert.deepEqual(retried.preview, preview);
  const expiredPreview = createDraft(input, retried, undefined, now + 60000);
  assert.equal(expiredPreview.id, first.id);
  assert.equal(expiredPreview.preview, undefined);
  for (const change of [
    { name: "김서현" },
    { ids: ["김-金", "서-序", "준-俊"] },
    { birthDate: "1998-05-20" },
    { birthTime: "11:00" },
    { unknownTime: true },
    { gender: "female" as const },
    { birthCity: "부산" },
  ]) {
    const changed = createDraft(
      { ...input, ...change },
      retried,
      undefined,
      now + 2000,
    );
    assert.notEqual(changed.id, first.id);
    assert.equal(changed.preview, undefined);
  }
  assert.notEqual(
    createDraft(input, first, undefined, now + DRAFT_TTL).id,
    first.id,
  );
});

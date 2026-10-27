import { test } from "node:test";
import assert from "node:assert/strict";
import { birthSchema } from "../src/lib/validation";
import { parseSazuResponse, toSazuRequest } from "../src/lib/sazu-contract";

const input = {
  birthDate: "1998-05-19",
  birthTime: "10:00",
  gender: "male",
  birthCity: "서울",
  consent: true,
};
test("생년월일을 SAZU 공식 camelCase 계약으로 변환하고 이름은 보내지 않는다", (): void => {
  assert.deepEqual(toSazuRequest(birthSchema.parse(input)), {
    birthYear: 1998,
    birthMonth: 5,
    birthDay: 19,
    birthHour: 10,
    birthMinute: 0,
    isFemale: false,
    isLunar: false,
    birthCity: "서울",
  });
  assert.equal(
    toSazuRequest(birthSchema.parse({ ...input, birthTime: null })).birthHour,
    null,
  );
});
test("실제 날짜·윤년·미래·시각·동의를 검증한다", (): void => {
  for (const birthDate of [
    "2023-02-29",
    "2024-02-30",
    "2024-13-01",
    "2024-04-31",
    "1800-01-01",
    "2999-01-01",
  ])
    assert.equal(birthSchema.safeParse({ ...input, birthDate }).success, false);
  assert.equal(
    birthSchema.safeParse({ ...input, birthDate: "2024-02-29" }).success,
    true,
  );
  assert.equal(
    birthSchema.safeParse({ ...input, birthTime: "24:00" }).success,
    false,
  );
  assert.equal(
    birthSchema.safeParse({ ...input, birthTime: "" }).success,
    false,
  );
  assert.equal(
    birthSchema.safeParse({ ...input, consent: false }).success,
    false,
  );
});
// 외부 API 실호출 결과가 아닌 계약 검증용 fixture입니다.
const response = {
  success: true,
  data: {
    modules: {
      fourPillars: {
        year: { full: "甲子" },
        month: { full: "乙丑" },
        day: { full: "丙寅" },
        hour: null,
      },
      elements: { wood: { name: "목", total: { count: 2 } } },
    },
  },
  meta: { sample: true },
};
test("SAZU 샘플 플래그와 시주 미상을 보존하고 허용 필드만 반환한다", (): void => {
  const parsed = parseSazuResponse(response);
  assert.equal(parsed.sample, true);
  assert.equal(parsed.pillars[3].value, null);
  assert.deepEqual(parsed.elements, [{ name: "목", count: 2 }]);
  assert.deepEqual(Object.keys(parsed).sort(), [
    "elements",
    "pillars",
    "sample",
  ]);
});
test("잘못된 API 응답을 정상 분석으로 표시하지 않는다", (): void => {
  assert.throws(() => parseSazuResponse({ success: false }));
  assert.throws(() =>
    parseSazuResponse({ success: true, data: { modules: {} } }),
  );
});

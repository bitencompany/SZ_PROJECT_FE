import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/name/route";
import { nameInputSchema, supportsStoredName } from "../src/lib/validation";
import { nameResponseSchema } from "../src/lib/name-contract";
import {
  draftSchema,
  parseDraft,
  sameDraftInput,
} from "../src/lib/reading-draft";
import { readingRequestSchema } from "../src/lib/reading-request";

async function preview(body: unknown) {
  return POST(
    new Request("http://localhost/api/name", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

test("한글 이름은 한자 조회 없이 모든 글자의 소리만 분석한다", async () => {
  const old = process.env.BACKEND_NAME_ENABLED;
  const originalFetch = globalThis.fetch;
  process.env.BACKEND_NAME_ENABLED = "true";
  globalThis.fetch = async () => {
    throw new Error("Unexpected upstream request");
  };
  try {
    for (const name of [
      "김봄",
      "김하늘",
      "남궁하늘",
      "김가나다라마바사아자차카타파하가나다라마",
    ]) {
      const response = await preview({
        name,
        nameMode: "hangul",
        surnameLength: name.startsWith("남궁") ? 2 : 1,
        hanjaIds: [],
      });
      assert.equal(response.status, 200);
      const { data } = nameResponseSchema.parse(await response.json());
      assert.equal(data.sounds.length, name.length);
      assert.equal(data.relations.length, name.length - 1);
      assert.deepEqual(
        data.hanja,
        [...name].map(() => null),
      );
      assert.deepEqual(data.grids, []);
      assert.ok(data.analysisNotice);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (old === undefined) delete process.env.BACKEND_NAME_ENABLED;
    else process.env.BACKEND_NAME_ENABLED = old;
  }
});

test("긴 이름·두 글자 성씨에 세 글자 전용 수리 계산을 적용하지 않는다", async () => {
  for (const input of [
    {
      name: "김서준서",
      surnameLength: 1,
      hanjaIds: ["김-金", "서-書", "준-俊", "서-書"],
    },
    { name: "김서준", surnameLength: 2, hanjaIds: ["김-金", "서-書", "준-俊"] },
    { name: "김서", surnameLength: 1, hanjaIds: ["김-金", "서-書"] },
  ]) {
    const response = await preview(input);
    assert.equal(response.status, 200);
    const { data } = nameResponseSchema.parse(await response.json());
    assert.equal(data.hanja.length, input.name.length);
    assert.equal(data.sounds.length, input.name.length);
    assert.deepEqual(data.grids, []);
    assert.equal(supportsStoredName(nameInputSchema.parse(input)), false);
  }
  const response = await preview({
    name: "김서준",
    hanjaIds: ["김-金", "서-書", "준-俊"],
  });
  assert.deepEqual(
    (await response.json()).data.grids.map(
      (grid: { total: number }) => grid.total,
    ),
    [19, 18, 17, 27],
  );
});

test("이름 길이·성 경계·한자 수 불일치는 거부하고 기존 BE 저장 계약을 확장한 척하지 않는다", () => {
  for (const input of [
    { name: "김", surnameLength: 1, hanjaIds: [] },
    { name: "가".repeat(21), surnameLength: 1, hanjaIds: [] },
    { name: "김봄", surnameLength: 2, hanjaIds: [] },
    { name: "김 봄", surnameLength: 1, hanjaIds: [] },
    { name: "김하늘", surnameLength: 1, hanjaIds: ["김-金"] },
  ])
    assert.equal(
      nameInputSchema.safeParse({ ...input, nameMode: "hangul" }).success,
      false,
    );
  assert.equal(
    nameInputSchema.safeParse({
      name: "김서준서",
      hanjaIds: ["김-金", "서-書", "준-俊"],
    }).success,
    false,
  );
  assert.equal(
    readingRequestSchema.safeParse({
      requestId: "e9a4ef95-834e-4007-959b-84918d9a9a24",
      name: "김하늘",
      hanjaIds: [],
      birth: null,
      consentToSave: true,
      nameMode: "hangul",
    }).success,
    false,
  );
});

test("로그인 전 임시 입력은 이름 형식과 성 경계를 보존하고 변경 시 다른 입력으로 본다", () => {
  const draft = draftSchema.parse({
    version: 1,
    id: "e9a4ef95-834e-4007-959b-84918d9a9a24",
    savedAt: Date.now(),
    name: "남궁하늘",
    nameMode: "hangul",
    surnameLength: 2,
    ids: [],
    birthDate: "",
    birthTime: "",
    unknownTime: true,
    gender: "female",
    birthCity: "서울",
    step: 2,
  });
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft);
  assert.equal(sameDraftInput(draft, { ...draft }), true);
  assert.equal(sameDraftInput(draft, { ...draft, surnameLength: 1 }), false);
  assert.equal(sameDraftInput(draft, { ...draft, nameMode: "hanja" }), false);
});

test("한자 성 + 한글 이름은 한자 없는 위치를 유지하고 수리를 계산하지 않는다", async () => {
  const response = await preview({
    name: "김하늘",
    surnameLength: 1,
    nameMode: "mixed",
    hanjaIds: ["김-金", null, null],
  });
  assert.equal(response.status, 200);
  const { data } = nameResponseSchema.parse(await response.json());
  assert.equal(data.hanja[0]?.character, "金");
  assert.deepEqual(data.hanja.slice(1), [null, null]);
  assert.deepEqual(data.grids, []);
  assert.equal(data.sounds.map((sound) => sound.syllable).join(""), "김하늘");
  assert.equal(
    supportsStoredName(
      nameInputSchema.parse({
        name: "김하늘",
        nameMode: "mixed",
        hanjaIds: ["김-金", null, null],
      }),
    ),
    false,
  );

  const middle = await preview({
    name: "김하준",
    surnameLength: 1,
    nameMode: "mixed",
    hanjaIds: ["김-金", null, "준-俊"],
  });
  const mixed = nameResponseSchema.parse(await middle.json()).data;
  assert.equal(mixed.hanja[2]?.character, "俊");
  assert.equal(mixed.hanja[1], null);
  assert.equal(
    (
      await preview({
        name: "김하준",
        nameMode: "mixed",
        hanjaIds: ["김-金", null, "서-書"],
      })
    ).status,
    400,
  );
});

test("명시적 한자 없음과 미선택은 구분하고 모드 위조·위치 누락을 거부한다", () => {
  for (const input of [
    { nameMode: "hanja", hanjaIds: ["김-金", null, null] },
    { nameMode: "hangul", hanjaIds: ["김-金", null, null] },
    { nameMode: "mixed", hanjaIds: ["김-金", "", null] },
    { nameMode: "mixed", hanjaIds: ["김-金", null] },
    { nameMode: "mixed", hanjaIds: [null, null, null] },
  ])
    assert.equal(
      nameInputSchema.safeParse({ name: "김하늘", surnameLength: 1, ...input })
        .success,
      false,
    );
  assert.equal(
    nameInputSchema.safeParse({
      name: "김하늘",
      nameMode: "hangul",
      hanjaIds: [null, null, null],
    }).success,
    true,
  );
});

test("한글 혼합 결과를 전체 한자 수리 결과로 위장할 수 없다", async () => {
  const legacy = nameResponseSchema.parse(
    await (
      await preview({ name: "김서준", hanjaIds: ["김-金", "서-書", "준-俊"] })
    ).json(),
  );
  assert.equal(
    nameResponseSchema.safeParse({
      ...legacy,
      data: {
        ...legacy.data,
        hanja: [legacy.data.hanja[0], null, legacy.data.hanja[2]],
      },
    }).success,
    false,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { resizeNameSelection, selectionMode } from "../src/lib/name-input";
import {
  draftSchema,
  parseDraft,
  sameDraftInput,
} from "../src/lib/reading-draft";

test("글자 편집 시 다른 성/이름의 선택을 유지하고 바뀐 글자만 다시 선택한다", () => {
  const surnameIds = ["김-金"];
  const givenIds = [null, null];
  const updated = [
    ...resizeNameSelection("김", "남궁", surnameIds),
    ...givenIds,
  ];
  assert.deepEqual(updated, ["", "", null, null]);
  assert.deepEqual(
    [...surnameIds, ...resizeNameSelection("하늘", "하준", givenIds)],
    ["김-金", null, ""],
  );
  assert.deepEqual(resizeNameSelection("하늘", "하늘빛", givenIds), [
    null,
    null,
    "",
  ]);
  assert.deepEqual(resizeNameSelection("남궁", "남", ["남-id", null]), [
    "남-id",
  ]);
  assert.equal(selectionMode(["김-金", null, null]), "mixed");
  assert.equal(selectionMode([null, null]), "hangul");
  assert.equal(selectionMode(["김-金", "", ""]), "hanja");
});

test("혼합 이름 임시 입력 복원 시 성 경계와 한자 없음 선택을 보존한다", () => {
  const draft = draftSchema.parse({
    version: 1,
    id: "e9a4ef95-834e-4007-959b-84918d9a9a24",
    savedAt: Date.now(),
    name: "김하늘",
    surnameLength: 1,
    ids: ["김-金", null, null],
    birthDate: "",
    birthTime: "",
    unknownTime: true,
    gender: "female",
    birthCity: "서울",
    step: 2,
  });
  assert.equal(draft.nameMode, "mixed");
  assert.deepEqual(parseDraft(JSON.stringify(draft)), draft);
  assert.equal(
    sameDraftInput(draft, { ...draft, ids: ["김-金", "", null] }),
    false,
  );
  const previous = parseDraft(
    JSON.stringify({ ...draft, nameMode: "hangul", ids: [] }),
  );
  assert.deepEqual(previous?.ids, [null, null, null]);
});

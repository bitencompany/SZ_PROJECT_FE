import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hanjaList } from "../src/data/hanja";
import {
  analyzeName,
  normalizeSuri,
  soundElement,
} from "../src/lib/name-analysis";

test("81수리 자료를 원문 그대로 보존하고 1~81 항목이 모두 존재한다", (): void => {
  const original = JSON.parse(readFileSync("81.md", "utf8"));
  const stored = JSON.parse(readFileSync("src/data/suri_81.json", "utf8"));
  assert.deepEqual(stored, original);
  assert.equal(Object.keys(stored).length, 81);
  for (let number: number = 1; number <= 81; number++)
    assert.ok(stored[number].description);
});
test("81을 유지하고 81 초과 획수만 80씩 차감한다", (): void => {
  assert.deepEqual(
    [1, 80, 81, 82, 160, 161, 162, 241].map(normalizeSuri),
    [1, 80, 81, 2, 80, 81, 2, 81],
  );
  for (const invalid of [0, -1, 1.5, NaN, Infinity])
    assert.throws((): number => normalizeSuri(invalid));
});
test("김서준 8·10·9획의 원형이정은 19·18·17·27이다", (): void => {
  const result = analyzeName("김서준", ["김-金", "서-書", "준-俊"]);
  assert.deepEqual(
    result.grids.map((grid) => grid.total),
    [19, 18, 17, 27],
  );
  assert.deepEqual(
    result.grids.map((grid) => grid.fortune),
    ["凶", "吉", "吉", "凶"],
  );
  assert.deepEqual(
    result.sounds.map((sound) => sound.element),
    ["목", "금", "금"],
  );
  assert.deepEqual(result.relations, ["역방향 상극", "같은 오행"]);
});
test("선택 한자 음 불일치·없는 한자·지원하지 않는 이름은 거부한다", (): void => {
  assert.throws(() => analyzeName("김서준", ["김-金", "민-敏", "준-俊"]));
  assert.throws(() => analyzeName("김서준", ["김-金", "서-假", "준-俊"]));
  assert.throws(() => analyzeName("남궁민수", ["김-金", "서-書", "준-俊"]));
  assert.throws(() => analyzeName("김서준", ["김-金"]));
});
test("김태준은 泰 실제 필획 10으로 계산하며 미확인 값은 원획으로 대체하지 않는다", () => {
  assert.deepEqual(analyzeName("김태준", ["김-金", "태-泰", "준-俊"]).grids.map((g) => g.total), [19, 18, 17, 27]);
  const tae = hanjaList.find((item) => item.character === "泰")!;
  const saved = tae.dictionaryStrokes;
  try {
    tae.dictionaryStrokes = null;
    assert.throws(() => analyzeName("김태준", ["김-金", "태-泰", "준-俊"]), /실제 획수/);
  } finally {
    tae.dictionaryStrokes = saved;
  }
});
test("초성 매핑과 미정 된소리 처리를 구분한다", (): void => {
  assert.deepEqual(["가", "나", "하", "사", "마"].map(soundElement), [
    "목",
    "화",
    "토",
    "금",
    "수",
  ]);
  assert.equal(soundElement("까"), null);
  assert.equal(soundElement("a"), null);
});

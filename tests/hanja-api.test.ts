import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/hanja/route";

test("한글 음과 검색어로 한자를 조회하고 예시 데이터 출처를 표시한다", async () => {
  const response = await GET(
    new Request("http://localhost/api/hanja?reading=서&q=書"),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.catalog.status, "preview");
  assert.deepEqual(
    body.data.map((item: { character: string; strokes: number }) => [
      item.character,
      item.strokes,
    ]),
    [["書", 10]],
  );
  assert.equal(
    (await GET(new Request("http://localhost/api/hanja?reading=김서준")))
      .status,
    400,
  );
  assert.equal(
    (await GET(new Request("http://localhost/api/hanja?reading=a"))).status,
    400,
  );
});

test("泰는 원획 기준 9와 사전 총획 10을 분리하고 대조 출처를 제공한다", async () => {
  const response = await GET(
    new Request("http://localhost/api/hanja?reading=태"),
  );
  const { data } = await response.json();
  const tae = data.find(
    (item: { character: string }) => item.character === "泰",
  );
  assert.equal(tae.strokes, 9);
  assert.equal(tae.dictionaryStrokes, 10);
  assert.equal(tae.strokeReview, "reference-checked");
  assert.equal(tae.strokeSources.length, 2);
});

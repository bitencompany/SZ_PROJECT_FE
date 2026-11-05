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

test("泰는 실제 필획 10과 한국어 훈음 출처를 제공한다", async () => {
  const response = await GET(
    new Request("http://localhost/api/hanja?reading=태"),
  );
  const { data } = await response.json();
  const tae = data.find(
    (item: { character: string }) => item.character === "泰",
  );
  assert.equal(tae.strokes, 10);
  assert.equal(tae.dictionaryStrokes, 10);
  assert.equal(tae.strokeBasis, "written");
  assert.equal(tae.meaningStatus, "sourced");
  assert.ok(tae.meaningSource.includes("libhangul"));
  assert.equal(tae.strokeSources.length, 1);
});

test("훈음 전체와 공백을 포함한 검색어도 조회된다", async () => {
  for (const q of ["글 서", "글서", "書", " 서 "]) {
    const response = await GET(new Request(`http://localhost/api/hanja?${new URLSearchParams({reading:"서",q})}`));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(result.data.some((item: {character:string}) => item.character === "書"));
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/name/route";

function request(body: string): Request {
  return new Request("http://localhost/api/name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("서버는 클라이언트가 조작한 획수 대신 자체 한자 DB로 계산한다", async (): Promise<void> => {
  const response: Response = await POST(
    request(
      JSON.stringify({
        name: "김서준",
        hanjaIds: ["김-金", "서-書", "준-俊"],
        strokes: [1, 1, 1],
      }),
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.deepEqual(
    body.data.grids.map((grid: { total: number }): number => grid.total),
    [19, 18, 17, 27],
  );
});

test("잘못된 JSON, 누락된 정보, 음이 다른 한자를 한국어 오류로 반환한다", async (): Promise<void> => {
  for (const body of [
    "{",
    "null",
    "{}",
    JSON.stringify({ name: "김서준", hanjaIds: ["김-金", "민-敏", "준-俊"] }),
  ]) {
    const response: Response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /[가-힣]/);
  }
});

test("큰 요청은 분석 전에 거부한다", async (): Promise<void> => {
  assert.equal((await POST(request("x".repeat(4097)))).status, 413);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pillarSymbol,
  symbol,
  tenGodGroup,
  groupRelations,
} from "../src/lib/sazu-explanation";
import { parsePreviewResponse } from "../src/lib/sazu-contract";

test("천간과 지지의 동음 글자를 구분하고 한자·음양·오행을 표시한다", () => {
  assert.equal(symbol("신", "sky")?.hanja, "辛");
  assert.equal(symbol("신", "earth")?.hanja, "申");
  assert.equal(symbol("巳", "earth")?.ko, "사");
  assert.equal(symbol("병", "sky")?.polarity, "양");
  assert.equal(symbol("계", "sky")?.polarity, "음");
  assert.equal(
    pillarSymbol({ label: "일주", value: "丙寅" }, "earth")?.hanja,
    "寅",
  );
  assert.equal(
    pillarSymbol({ label: "시주", value: null, sky: "계" }, "sky"),
    undefined,
  );
  assert.equal(
    pillarSymbol({ label: "시주", value: "invalid" }, "sky"),
    undefined,
  );
  assert.equal(tenGodGroup("비견"), "비겁");
  assert.equal(tenGodGroup("겁재"), "비겁");
  assert.equal(tenGodGroup("정인"), "인성");
});

test("같은 글자의 같은 관계를 묶어도 모든 발생 위치와 서로 다른 관계는 보존한다", () => {
  const groups = groupRelations([
    {
      type: "형",
      source: "인",
      target: "사",
      sourcePosition: "년주",
      targetPosition: "월주",
    },
    {
      type: "형",
      source: "사",
      target: "인",
      sourcePosition: "월주",
      targetPosition: "일주",
    },
    {
      type: "해",
      source: "인",
      target: "사",
      sourcePosition: "년주",
      targetPosition: "월주",
    },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].positions.length, 2);
});

test("확장 미리보기는 각 글자의 십성·지장간과 추가 모듈·원자료를 FE까지 전달한다", () => {
  const pillar = {
    full: "병인",
    sky: "병",
    earth: "인",
    skyElement: "화",
    earthElement: "목",
    sippiSeong: "비견",
    earthSippiSeong: "편인",
    twelveStage: "장생",
    jiJangGan: { main: { stem: "갑", days: 16 } },
  };
  const result = parsePreviewResponse({
    success: true,
    data: {
      source: "SAZU",
      sandbox: true,
      previewId: "11111111-1111-4111-8111-111111111111",
      expiresAt: "2030-01-01T00:00:00Z",
      providerVersion: "test-v2",
      modules: {
        fourPillars: { year: pillar, month: pillar, day: pillar, hour: null },
        sinStrength: { strength: "신강" },
        wongukInteraction: { relations: [] },
        yongsin: { yongsin: { ko: "토" } },
      },
      providerData: {
        topics: ["manse", "life"],
        modules: { evaluation: { futureField: "preserved" } },
        glossary: { 비견: "동료 관계" },
      },
    },
  });
  assert.equal(result.pillars[2].earthSippiSeong, "편인");
  assert.equal(result.pillars[2].jiJangGan?.main?.stem, "갑");
  assert.equal(result.details?.yongsin?.yongsin.ko, "토");
  assert.equal(result.strength?.strength, "신강");
  assert.equal(result.providerData?.glossary.비견, "동료 관계");
});

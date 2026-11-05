import test from "node:test";
import assert from "node:assert/strict";
import { hanjaLabel, matchesHanja } from "../src/lib/hanja-search";
import { hanjaSchema } from "../src/lib/name-contract";

test("본관 검색어는 띄어쓰기와 씨 접미사에 관계없이 한자를 찾는다", () => {
  const item = {
    id: "gang", character: "姜", meaning: "성", reading: "강",
    searchAliases: ["진주 강씨"], strokes: 9, dictionaryStrokes: 9,
    element: null, isBulyong: null, strokeReview: "reference-checked", strokeSources: [],
  };
  const parsed = hanjaSchema.parse(item);
  for (const query of ["진주 강", "진주강", "진주 강씨", "진주강씨", " 진주  강 ", "성 강", "姜"])
    assert.equal(matchesHanja(parsed, query), true, query);
  assert.equal(matchesHanja(parsed, "평산 강"), false);
});

test("본관 별칭이 없는 기존 한자도 뜻과 음으로 검색된다", () => {
  const item = { character: "康", meaning: "편안할", reading: "강" };
  assert.equal(matchesHanja(item, "편안할 강"), true);
  assert.equal(matchesHanja(item, "진주 강"), false);
});

test("보조 뜻도 해당 독음과 함께 검색되고 뜻 미확보를 훈음처럼 합치지 않는다", () => {
  const item = { character: "泰", reading: "태", meaning: "클", meanings: ["클", "통할"] };
  assert.equal(matchesHanja(item, "통할태"), true);
  assert.equal(matchesHanja(item, "통할 은"), false);
  assert.equal(hanjaLabel({ reading: "태", meaning: "뜻 확인 중", meaningStatus: "unavailable" }), "태 · 뜻 확인 중");
});

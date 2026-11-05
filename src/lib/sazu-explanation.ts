import type { Element, SazuResult } from "./types";

export type SajuSymbol = {
  ko: string;
  hanja: string;
  element: Element;
  polarity: string;
  image: string;
  explanation: string;
};
const stems: [string, string, Element, string, string, string][] = [
  [
    "갑",
    "甲",
    "목",
    "양",
    "곧게 자라는 나무",
    "나무가 위로 자라는 모습에 빗대어 시작과 확장을 설명해요.",
  ],
  [
    "을",
    "乙",
    "목",
    "음",
    "유연하게 뻗는 풀",
    "풀과 덩굴이 환경에 맞춰 자라는 모습에 빗대어 적응과 연결을 설명해요.",
  ],
  [
    "병",
    "丙",
    "화",
    "양",
    "넓게 비추는 햇빛",
    "햇빛이 주변을 밝히는 모습에 빗대어 표현과 드러냄을 설명해요.",
  ],
  [
    "정",
    "丁",
    "화",
    "음",
    "한곳을 밝히는 등불",
    "등불이 가까운 곳을 세심하게 밝히듯 집중과 섬세함을 설명해요.",
  ],
  [
    "무",
    "戊",
    "토",
    "양",
    "넓게 받치는 산",
    "산과 큰 땅이 바탕을 이루는 모습에 빗대어 지지와 중심을 설명해요.",
  ],
  [
    "기",
    "己",
    "토",
    "음",
    "가꾸고 기르는 밭",
    "밭에서 생명을 기르듯 조율과 돌봄을 설명해요.",
  ],
  [
    "경",
    "庚",
    "금",
    "양",
    "단단한 쇠",
    "단단한 금속에 빗대어 기준을 세우고 구분하는 성질을 설명해요.",
  ],
  [
    "신",
    "辛",
    "금",
    "음",
    "정교하게 다듬은 보석",
    "세밀하게 다듬는 모습에 빗대어 정밀함과 완성도를 설명해요.",
  ],
  [
    "임",
    "壬",
    "수",
    "양",
    "크게 흐르는 물",
    "강과 바다의 흐름에 빗대어 넓은 이동과 유연함을 설명해요.",
  ],
  [
    "계",
    "癸",
    "수",
    "음",
    "스며드는 비와 이슬",
    "물이 조금씩 스며드는 모습에 빗대어 관찰과 축적을 설명해요.",
  ],
];
const branches: [string, string, Element, string, string][] = [
  ["자", "子", "수", "양", "겨울의 한가운데"],
  ["축", "丑", "토", "음", "겨울을 갈무리하는 때"],
  ["인", "寅", "목", "양", "봄이 시작되는 때"],
  ["묘", "卯", "목", "음", "봄이 무르익는 때"],
  ["진", "辰", "토", "양", "봄을 갈무리하는 때"],
  ["사", "巳", "화", "음", "여름이 시작되는 때"],
  ["오", "午", "화", "양", "여름의 한가운데"],
  ["미", "未", "토", "음", "여름을 갈무리하는 때"],
  ["신", "申", "금", "양", "가을이 시작되는 때"],
  ["유", "酉", "금", "음", "가을이 무르익는 때"],
  ["술", "戌", "토", "양", "가을을 갈무리하는 때"],
  ["해", "亥", "수", "음", "겨울이 시작되는 때"],
];
export function symbol(
  value: string | undefined,
  kind: "sky" | "earth",
): SajuSymbol | undefined {
  if (!value) return;
  const row = (kind === "sky" ? stems : branches).find(
    (row) => row[0] === value || row[1] === value,
  );
  if (!row) return;
  const [ko, hanja, element, polarity, image, explanation] = row;
  return {
    ko,
    hanja,
    element,
    polarity,
    image,
    explanation:
      explanation ??
      `${image}를 나타내는 지지예요. 계절과 시간의 바탕을 상징하며, 안에 담긴 천간은 지장간에서 확인할 수 있어요.`,
  };
}
export function pillarSymbol(
  pillar: SazuResult["pillars"][number],
  kind: "sky" | "earth",
) {
  if (pillar.value === null) return undefined;
  const explicit = pillar[kind];
  if (explicit) return symbol(explicit, kind);
  const pair = [...pillar.value];
  // Only split a known two-character ganji, never guess a missing hour.
  if (pair.length !== 2 || !symbol(pair[0], "sky") || !symbol(pair[1], "earth"))
    return undefined;
  return symbol(pair[kind === "sky" ? 0 : 1], kind);
}
export const elementMeaning: Record<Element, string> = {
  목: "자라남과 확장",
  화: "표현과 열기",
  토: "중심과 조율",
  금: "기준과 정리",
  수: "흐름과 축적",
};
export const tenGodMeaning: Record<string, string> = {
  비견: "나와 같은 기운 · 자립과 동료 관계",
  겁재: "나와 닮은 다른 기운 · 협력과 경쟁",
  식신: "내가 만들어 내는 기운 · 표현과 꾸준한 생산",
  상관: "내가 드러내는 기운 · 새로운 표현과 기존 틀에 대한 질문",
  편재: "넓게 다루는 자원 · 기회와 변동",
  정재: "차곡차곡 관리하는 자원 · 꾸준함과 실무",
  편관: "나를 단련하는 기준 · 압박과 돌파",
  정관: "나를 정돈하는 기준 · 질서와 책임",
  편인: "다른 방식의 도움 · 독특한 배움과 관점",
  정인: "안정적으로 받는 도움 · 배움과 보호",
};
export const stageMeaning: Record<string, string> = {
  장생: "새로 시작하고 배우는 단계",
  목욕: "경험하며 시행착오를 겪는 단계",
  관대: "밖으로 나설 준비를 하는 단계",
  건록: "제 역할을 맡고 기반을 다지는 단계",
  제왕: "기운이 가장 활발하게 드러나는 단계",
  쇠: "확장보다 관리에 무게를 두는 단계",
  병: "속도를 낮추고 돌아보는 단계",
  사: "마무리하고 정리하는 단계",
  묘: "안으로 모으고 보관하는 단계",
  절: "흐름이 전환되는 단계",
  태: "새로운 가능성을 품는 단계",
  양: "다음을 위해 안에서 자라는 단계",
};
export function relationMeaning(type: string): string {
  if (type.includes("합"))
    return "서로 묶여 작용하는 조합이에요. 힘을 함께 쓰거나 서로의 작용을 붙드는 관계로 읽어요. 합이 있다고 무조건 좋은 관계는 아니에요.";
  if (type.includes("충"))
    return "서로 마주 부딪히는 조합이에요. 다른 방향의 힘과 변화 가능성을 읽는 표현이며, 실제 갈등이나 사고를 예고하는 뜻은 아니에요.";
  if (type.includes("형"))
    return "서로 조정이 필요한 마찰로 읽는 조합이에요. 반복되는 방식이나 기준 차이를 돌아보는 비유로 이해해 주세요.";
  if (type.includes("해"))
    return "겉으로 크게 부딪히지 않아도 작용이 엇갈리는 조합이에요. 작은 기대 차이나 소통 방식을 돌아보는 비유예요.";
  if (type.includes("파"))
    return "기존의 연결이 느슨해지거나 흐름이 끊기는 조합으로 읽어요. 실제 손실이나 실패를 확정하는 말은 아니에요.";
  return "SAZU가 표시한 글자 사이의 관계예요. 이 관계만으로 성격이나 사건을 단정하지 않아요.";
}
export function groupRelations(
  relations: NonNullable<
    NonNullable<SazuResult["details"]>["wongukInteraction"]
  >["relations"],
) {
  const groups = new Map<
    string,
    { type: string; pair: string[]; positions: string[] }
  >();
  for (const relation of relations) {
    const pair = [relation.source, relation.target].sort();
    const key = JSON.stringify([relation.type, pair]);
    const group = groups.get(key) ?? {
      type: relation.type,
      pair,
      positions: [],
    };
    group.positions.push(
      `${relation.sourcePosition} ${relation.source} ↔ ${relation.targetPosition} ${relation.target}${relation.isAdjacent === true ? " (이웃)" : ""}`,
    );
    groups.set(key, group);
  }
  return [...groups.values()];
}
export function tenGodGroup(value: string | undefined): string {
  if (!value) return "미제공";
  if (["비견", "겁재"].includes(value)) return "비겁";
  if (["식신", "상관"].includes(value)) return "식상";
  if (["편재", "정재"].includes(value)) return "재성";
  if (["편관", "정관"].includes(value)) return "관성";
  if (["편인", "정인"].includes(value)) return "인성";
  return "분류 미확인";
}
export const markerMeaning: Record<string, string> = {
  건록: "자립과 역할을 맡는 모습으로 읽는 표식이에요.",
  홍염살: "드러나는 매력과 관심을 받는 모습을 상징해요.",
  학당귀인: "배움과 탐구에 연결해 읽는 표식이에요.",
  문곡귀인: "글과 예술적 표현에 연결해 읽는 표식이에요.",
  천주귀인: "먹고사는 기반과 돌봄에 연결해 읽는 표식이에요.",
  탕화살:
    "전통적으로 불과 열을 상징하는 이름이에요. 실제 사고나 질병을 뜻하는 진단은 아니에요.",
  고신살:
    "홀로 보내는 시간과 독립성을 돌아보는 표식이에요. 실제 관계의 단절을 정해 두는 말은 아니에요.",
  지살: "이동과 활동 반경의 변화에 연결해 읽어요.",
  망신살:
    "사람들 앞에 드러나는 모습을 상징해요. 이름 그대로 망신을 당한다는 뜻으로 단정하지 않아요.",
};

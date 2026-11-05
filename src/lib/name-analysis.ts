import fortunes from "@/data/suri_81.json";
import { hanjaList } from "@/data/hanja";
import type { Element, Fortune, Hanja, NameGrid, NameResult } from "./types";

export function normalizeSuri(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error("획수는 양의 정수여야 합니다.");
  // 명세에 따라 81은 유지하고 초과하는 값에서만 80씩 뺍니다.
  return value <= 81 ? value : ((value - 2) % 80) + 2;
}
export function soundElement(syllable: string): Element | null {
  if (!/^[가-힣]$/.test(syllable)) return null;
  const initial: number = Math.floor((syllable.charCodeAt(0) - 0xac00) / 588);
  // 문서에 없는 된소리는 임의로 분류하지 않습니다.
  const groups: Record<string, Element> = {
    "0": "목",
    "15": "목",
    "2": "화",
    "3": "화",
    "5": "화",
    "16": "화",
    "11": "토",
    "18": "토",
    "9": "금",
    "12": "금",
    "14": "금",
    "6": "수",
    "7": "수",
    "17": "수",
  };
  return groups[initial] ?? null;
}
export function relationship(a: Element | null, b: Element | null): string {
  if (!a || !b) return "분류 확인 필요";
  if (a === b) return "같은 오행";
  const generating: Record<Element, Element> = {
    목: "화",
    화: "토",
    토: "금",
    금: "수",
    수: "목",
  };
  const overcoming: Record<Element, Element> = {
    목: "토",
    토: "수",
    수: "화",
    화: "금",
    금: "목",
  };
  return generating[a] === b
    ? "상생"
    : overcoming[a] === b
      ? "상극"
      : generating[b] === a
        ? "역방향 상생"
        : "역방향 상극";
}
export function analyzeName(name: string, ids: string[]): NameResult {
  if (!/^[가-힣]{3}$/.test(name) || ids.length !== 3)
    throw new Error("성 1자와 이름 2자를 입력해 주세요.");
  const selected: Hanja[] = ids.map((id: string, index: number): Hanja => {
    const entry: Hanja | undefined = hanjaList.find(
      (item: Hanja): boolean => item.id === id && item.reading === name[index],
    );
    if (!entry) throw new Error("이름에 맞는 한자를 모두 선택해 주세요.");
    return entry;
  });
  const [a, b, c]: number[] = selected.map(
    (item: Hanja): number => {
      if (item.dictionaryStrokes === null)
        throw new Error("실제 획수가 확인되지 않은 한자가 있어 수리를 계산할 수 없어요.");
      return item.dictionaryStrokes;
    },
  );
  const values: [string, string, number][] = [
    ["원격", "초년운", b + c],
    ["형격", "청년운", a + b],
    ["이격", "중년운", a + c],
    ["정격", "총운", a + b + c],
  ];
  const grids: NameGrid[] = values.map(
    ([label, period, total]: [string, string, number]): NameGrid => {
      const number: number = normalizeSuri(total);
      return {
        label,
        period,
        total,
        number,
        ...(fortunes as Record<string, Fortune>)[String(number)],
      };
    },
  );
  const sounds: NameResult["sounds"] = [...name].map((syllable: string) => ({
    syllable,
    element: soundElement(syllable),
  }));
  return {
    name,
    hanja: selected,
    grids,
    sounds,
    relations: [
      relationship(sounds[0].element, sounds[1].element),
      relationship(sounds[1].element, sounds[2].element),
    ],
  };
}

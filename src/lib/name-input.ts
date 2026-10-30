// 빈 문자열은 미선택, null은 사용자가 명시적으로 선택한 '한자 없음'입니다.
export type HanjaSelection = string | null;
export type NameMode = "hanja" | "hangul" | "mixed";

export function selectionMode(ids: HanjaSelection[]): NameMode {
  const withoutHanja = ids.filter((id) => id === null).length;
  return withoutHanja === 0
    ? "hanja"
    : withoutHanja === ids.length
      ? "hangul"
      : "mixed";
}

export function resizeNameSelection(
  previous: string,
  next: string,
  ids: HanjaSelection[],
): HanjaSelection[] {
  return [...next].map((syllable, index) =>
    syllable === previous[index] && ids[index] !== undefined ? ids[index] : "",
  );
}

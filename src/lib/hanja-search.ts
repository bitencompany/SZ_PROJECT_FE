import type { Hanja } from "./types";

export function matchesHanja(item: Pick<Hanja, "character" | "meaning" | "reading" | "searchAliases" | "meanings">, query: string) {
  const compact = (value: string) => value.replace(/\s/gu, "");
  return [`${item.character}${item.meaning}${item.reading}`, ...(item.meanings ?? []).map((meaning) => `${meaning}${item.reading}`), ...(item.searchAliases ?? [])]
    .some((value) => compact(value).includes(compact(query)));
}

export function hanjaLabel(item: Pick<Hanja, "meaning" | "reading" | "meaningStatus">): string {
  return item.meaningStatus === "unavailable" ? `${item.reading} · 뜻 확인 중` : `${item.meaning} ${item.reading}`;
}

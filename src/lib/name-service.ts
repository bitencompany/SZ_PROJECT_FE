import "server-only";
import { hanjaList } from "@/data/hanja";
import { analyzeName, soundElement, relationship } from "./name-analysis";
import { backendRequest } from "./backend";
import { matchesHanja } from "./hanja-search";
import { supportsStoredName, type NameInput } from "./validation";
import {
  hanjaResponseSchema,
  legacyNameResponseSchema,
  previewCatalog,
} from "./name-contract";

export async function lookupHanja(reading: string, query = "") {
  if (process.env.BACKEND_NAME_ENABLED === "true") {
    const result = hanjaResponseSchema.parse(
      await backendRequest(
        `/api/hanja?${new URLSearchParams({ reading, q: query })}`,
      ),
    );
    if (result.data.some((item) => item.reading !== reading))
      throw new Error("Hanja reading mismatch");
    return result;
  }
  return {
    data: hanjaList.filter(
      (item) =>
        item.reading === reading &&
        matchesHanja(item, query),
    ),
    catalog: previewCatalog,
  };
}

export async function analyzeNameRequest(name: string, hanjaIds: string[]) {
  if (process.env.BACKEND_NAME_ENABLED === "true") {
    const result = legacyNameResponseSchema.parse(
      await backendRequest("/api/name", { name, hanjaIds }),
    );
    if (
      result.data.name !== name ||
      result.data.hanja.some(
        (item, index) =>
          item.id !== hanjaIds[index] || item.reading !== name[index],
      )
    )
      throw new Error("Name response mismatch");
    return result;
  }
  return { data: analyzeName(name, hanjaIds), catalog: previewCatalog };
}

// 성의 길이와 이름 글자 수별 수리 규칙이 검증되기 전에는 기존 세 글자 공식을 확장하지 않습니다.
export async function analyzeNameInput(input: NameInput) {
  if (supportsStoredName(input))
    return analyzeNameRequest(
      input.name,
      input.hanjaIds.map((id) => {
        if (id === null) throw new Error("Name mode mismatch");
        return id;
      }),
    );
  const selections = input.hanjaIds.length
    ? input.hanjaIds
    : [...input.name].map(() => null);
  const readings = [
    ...new Set(
      [...input.name].filter((_, index) => selections[index] !== null),
    ),
  ];
  const catalogs = await Promise.all(
    readings.map((syllable) => lookupHanja(syllable)),
  );
  const entries = catalogs.flatMap((catalog) => catalog.data);
  const hanja = selections.map((id, index) => {
    if (id === null) return null;
    const item = entries.find(
      (entry) => entry.id === id && entry.reading === input.name[index],
    );
    if (!item) throw new Error("Name hanja mismatch");
    return item;
  });
  const sounds = [...input.name].map((syllable) => ({
    syllable,
    element: soundElement(syllable),
  }));
  return {
    data: {
      name: input.name,
      hanja,
      grids: [],
      sounds,
      relations: sounds
        .slice(1)
        .map((sound, index) =>
          relationship(sounds[index].element, sound.element),
        ),
      analysisNotice:
        input.nameMode !== "hanja"
          ? "한자가 없는 글자는 한자 뜻·획수를 부여하지 않으며, 이름 전체의 수리 풀이는 제공하지 않아요. 발음오행과 출생 정보로 사주를 살펴볼 수 있어요."
          : "이 이름 형식의 수리 계산 기준은 검증 중이에요. 선택한 한자와 발음오행을 먼저 보여드려요.",
    },
    catalog: catalogs.length
      ? {
          status: catalogs.every(
            (catalog) => catalog.catalog.status === "verified",
          )
            ? ("verified" as const)
            : ("preview" as const),
          version: [
            ...new Set(catalogs.map((catalog) => catalog.catalog.version)),
          ]
            .join("+")
            .slice(0, 100),
        }
      : previewCatalog,
  };
}

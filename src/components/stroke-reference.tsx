import type { ReactNode } from "react";
import type { Hanja } from "@/lib/types";

export function StrokeReference({
  items,
}: {
  items: (Hanja | null | undefined)[];
}): ReactNode {
  const selected = items.filter((item): item is Hanja => !!item);
  if (!selected.length) return null;
  return (
    <details className="stroke-reference">
      <summary>획수 기준과 확인 출처</summary>
      <p>
        사전의 총획과 성명학에서 적용하는 원획은 다를 수 있어요. 현재 계산은
        아래 원획 기준을 사용하며, 미검수 값은 실제 작명 판단에 사용하지 마세요.
      </p>
      {selected.map((item, index) => (
        <div key={`${item.id}-${index}`}>
          <strong>
            {item.character}({item.meaning} {item.reading})
          </strong>
          <p>
            사전 총획{" "}
            {item.dictionaryStrokes === null
              ? "미확인"
              : `${item.dictionaryStrokes}획`}{" "}
            · 성명학 원획 {item.strokes}획
            {item.strokeReview === "unreviewed"
              ? " (예시값·출처 미검수)"
              : " (아래 자료 대조)"}
          </p>
          {item.strokeSources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.title} ↗
            </a>
          ))}
        </div>
      ))}
    </details>
  );
}

import type { ReactNode } from "react";
import type { Hanja } from "@/lib/types";
import { hanjaLabel } from "@/lib/hanja-search";

export function StrokeReference({
  items,
}: {
  items: (Hanja | null | undefined)[];
}): ReactNode {
  const selected = items.filter((item): item is Hanja => !!item);
  if (!selected.length) return null;
  return (
    <details className="stroke-reference">
      <summary>한자 뜻·획수와 확인 출처</summary>
      <p>
        글자를 실제로 쓰는 획수(필획)로 표시하고 계산해요.
        부수를 본래 글자로 환산하지 않으며, 획수가 확인되지 않으면 수리를 계산하지 않아요.
      </p>
      {selected.map((item, index) => (
        <div key={`${item.id}-${index}`}>
          <strong>
            {item.character}({hanjaLabel(item)})
          </strong>
          {item.meanings && item.meanings.length > 1 && (
            <p>사전에 함께 수록된 뜻: {item.meanings.slice(1).map((meaning) => `${meaning} ${item.reading}`).join(" · ")}</p>
          )}
          {item.meaningStatus === "unavailable" && <p>이 독음의 한국어 뜻을 아직 확보하지 못했어요.</p>}
          {item.meaningSource && <a href={item.meaningSource} target="_blank" rel="noopener noreferrer">한국어 훈음 출처 (libhangul) ↗</a>}
          {item.readingSource && <a href={item.readingSource} target="_blank" rel="noopener noreferrer">한자·독음 목록 출처 (법원 목록 수집본) ↗</a>}
          <p>
            실제 획수{" "}
            {item.dictionaryStrokes === null
              ? "미확인"
              : `${item.dictionaryStrokes}획`}
          </p>
          <p>
            자원오행 {item.element ?? "미확인"} · 불용문자{" "}
            {item.isBulyong === null
              ? "미확인"
              : item.isBulyong
                ? "해당"
                : "해당 없음"}
          </p>
          {!item.strokeSources.some((source) => source.basis === "dictionary") && <p>확인 출처 미등록</p>}
          {item.strokeSources.filter((source) => source.basis === "dictionary").map((source) => (
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

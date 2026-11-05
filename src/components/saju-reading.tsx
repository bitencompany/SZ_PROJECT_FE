"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import type { SazuResult, Element } from "@/lib/types";
import {
  pillarSymbol,
  symbol,
  elementMeaning,
  tenGodMeaning,
  tenGodGroup,
  stageMeaning,
  relationMeaning,
  groupRelations,
  markerMeaning,
} from "@/lib/sazu-explanation";

const positionMeaning: Record<string, string> = {
  년주: "태어난 해",
  월주: "태어난 달",
  일주: "태어난 날",
  시주: "태어난 시각",
};
const elementOrder: Element[] = ["목", "화", "토", "금", "수"];
function Term({ name, description }: { name?: string; description?: string }) {
  return name ? (
    <span className="saju-term" title={description}>
      {name}
    </span>
  ) : (
    <span className="saju-muted">미제공</span>
  );
}
function Section({
  title,
  intro,
  children,
  open = false,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="saju-section" open={open}>
      <summary>
        {title}
        <span aria-hidden>＋</span>
      </summary>
      <p className="saju-intro">{intro}</p>
      {children}
    </details>
  );
}
export function SajuReading({ result }: { result: SazuResult }) {
  const [selection, setSelection] = useState({
    label: "일주",
    kind: "sky" as "sky" | "earth",
  });
  const details = result.details;
  const pillars = [...result.pillars].reverse();
  const selectedPillar = result.pillars.find(
    (p) => p.label === selection.label,
  );
  const selected =
    selectedPillar && pillarSymbol(selectedPillar, selection.kind);
  const day = result.pillars.find((p) => p.label === "일주");
  const dayStem = day && pillarSymbol(day, "sky");
  const relations =
    details?.wongukInteraction &&
    groupRelations(details.wongukInteraction.relations);
  const sum = result.elements.reduce((total, value) => total + value.count, 0);
  const unknownHour =
    result.pillars.find((p) => p.label === "시주")?.value === null;
  const allTerms = [
    ...new Set(
      result.pillars
        .flatMap((p) => [p.sippiSeong, p.earthSippiSeong])
        .filter((v): v is string => !!v),
    ),
  ];
  const groupDefinitions: Record<string, string> = {
    비겁: "나와 같은 오행 · 나와 동료",
    식상: "내가 생하는 오행 · 표현과 생산",
    재성: "내가 극하는 오행 · 다루는 자원",
    관성: "나를 극하는 오행 · 기준과 책임",
    인성: "나를 생하는 오행 · 도움과 배움",
  };
  const yongsin = details?.yongsin;
  return (
    <div className="saju-reading">
      {result.sample && (
        <p className="sample-notice">
          무료 샘플 명식 · 실제 입력에 대한 개인 분석이 아닙니다. 아래 성질과
          조합도 같은 고정 샘플의 설명이에요.
        </p>
      )}
      <div className="saju-heading">
        <span>四柱八字</span>
        <h4>네 기둥, 여덟 글자로 읽는 사주</h4>
        <p>
          각 기둥의 위는 <b>천간</b>, 아래는 <b>지지</b>예요. 글자를 누르면
          성질을 쉽게 풀어드려요.
        </p>
      </div>
      <div
        className="saju-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="사주팔자 명식표"
      >
        <table className="saju-chart">
          <caption className="sr-only">
            시주·일주·월주·년주 순서의 천간과 지지, 십성과 지장간
          </caption>
          <thead>
            <tr>
              <th scope="col">구분</th>
              {pillars.map((p) => (
                <th
                  key={p.label}
                  scope="col"
                  className={p.label === "일주" ? "saju-day" : ""}
                >
                  {p.label}
                  <small>{positionMeaning[p.label]}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">천간 십성</th>
              {pillars.map((p) => (
                <td key={p.label}>
                  {p.label === "일주" ? (
                    <>
                      <b>일간</b>
                      <small>나의 기준</small>
                    </>
                  ) : (
                    <>
                      <Term
                        name={p.sippiSeong}
                        description={
                          p.sippiSeong && tenGodMeaning[p.sippiSeong]
                        }
                      />
                      <small>{tenGodGroup(p.sippiSeong)}</small>
                    </>
                  )}
                </td>
              ))}
            </tr>
            {(["sky", "earth"] as const).map((kind) => (
              <tr key={kind}>
                <th scope="row">
                  {kind === "sky" ? "천간" : "지지"}
                  <small>{kind === "sky" ? "위 글자" : "아래 글자"}</small>
                </th>
                {pillars.map((p) => {
                  const value = pillarSymbol(p, kind);
                  return (
                    <td key={p.label} className="saju-glyph-cell">
                      {value ? (
                        <button
                          type="button"
                          className={`saju-glyph saju-${value.element}`}
                          aria-pressed={
                            selection.label === p.label &&
                            selection.kind === kind
                          }
                          aria-label={`${p.label} ${kind === "sky" ? "천간" : "지지"} ${value.hanja} ${value.ko} ${value.polarity}${value.element} 설명`}
                          onClick={() => setSelection({ label: p.label, kind })}
                        >
                          <strong>{value.hanja}</strong>
                          <span>{value.ko}</span>
                          <small>
                            {value.polarity === "양" ? "陽" : "陰"}{" "}
                            {value.polarity} · {value.element}
                          </small>
                        </button>
                      ) : (
                        <div className="saju-missing">
                          {p.value === null ? "미상" : "미제공"}
                          <small>
                            {p.value === null
                              ? "시간을 몰라요"
                              : "글자 확인 불가"}
                          </small>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row">지지 십성</th>
              {pillars.map((p) => (
                <td key={p.label}>
                  <Term
                    name={p.earthSippiSeong}
                    description={
                      p.earthSippiSeong && tenGodMeaning[p.earthSippiSeong]
                    }
                  />
                  <small>{tenGodGroup(p.earthSippiSeong)}</small>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">지장간</th>
              {pillars.map((p) => (
                <td key={p.label}>
                  {p.jiJangGan
                    ? (["residue", "middle", "main"] as const).map((k) => {
                        const v = p.jiJangGan?.[k];
                        const s = symbol(v?.stem, "sky");
                        return v ? (
                          <span
                            key={k}
                            className="saju-hidden-stem"
                            title={
                              k === "main"
                                ? "정기 · 중심 기운"
                                : k === "middle"
                                  ? "중기"
                                  : "여기"
                            }
                          >
                            {s?.hanja ?? v.stem}
                            <small>
                              {s?.ko ?? v.stem}
                              {k === "main" ? "·본기" : ""}
                            </small>
                          </span>
                        ) : null;
                      })
                    : "미제공"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">12운성</th>
              {pillars.map((p) => (
                <td key={p.label}>
                  <Term
                    name={p.twelveStage}
                    description={p.twelveStage && stageMeaning[p.twelveStage]}
                  />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">납음</th>
              {pillars.map((p) => (
                <td key={p.label}>{p.naeeum ?? "미제공"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {unknownHour && (
        <p className="saju-note">
          출생 시각을 몰라 시주 두 글자를 비웠어요. 전체 팔자가 필요한
          조합·신강약·오행 분포·대운은 제공하지 않아요.
        </p>
      )}
      <div className="saju-symbol-detail" aria-live="polite">
        {selected ? (
          <>
            <span className="saju-eyebrow">
              {selection.label}의 {selection.kind === "sky" ? "천간" : "지지"}
            </span>
            <h4>
              {selected.hanja} {selected.ko} · {selected.image}
            </h4>
            <p>{selected.explanation}</p>
            <p>
              <b>
                {selected.polarity}({selected.polarity === "양" ? "陽" : "陰"})
              </b>
              은{" "}
              {selected.polarity === "양"
                ? "밖으로 펼치고 드러내는"
                : "안으로 모으고 세밀하게 다듬는"}{" "}
              쪽의 상징이에요. 좋고 나쁨을 나누는 기준은 아니에요.
            </p>
          </>
        ) : (
          <p>확인할 수 있는 글자를 눌러 설명을 살펴보세요.</p>
        )}
      </div>
      <Section
        title="01. 나를 읽는 기준, 일간"
        intro="태어난 날의 위 글자를 일간이라고 해요. 다른 일곱 글자와의 관계를 읽는 기준점이에요."
        open
      >
        {dayStem ? (
          <div className="saju-daymaster">
            <span className={`saju-daymaster-symbol saju-${dayStem.element}`}>
              {dayStem.hanja}
            </span>
            <div>
              <h4>
                {dayStem.ko}
                {dayStem.element} · {dayStem.image}
              </h4>
              <p>
                {dayStem.explanation} 이 비유 하나로 사람의 성격을 정하지는
                않아요.
              </p>
            </div>
          </div>
        ) : (
          <p>일간의 상세 정보가 제공되지 않았어요.</p>
        )}
        {details?.sinStrength ? (
          <div className="saju-reading-card">
            <h5>주변에서 받는 힘 · {details.sinStrength.strength}</h5>
            <p>
              {details.sinStrength.strength.includes("신강")
                ? "기준인 일간이 주변에서 지지를 받는 쪽으로 분류됐어요. 자기 방향을 유지하는 힘이라는 비유로 읽되, 상대와 속도를 맞추는 점도 함께 생각해 볼 수 있어요."
                : details.sinStrength.strength.includes("신약")
                  ? "기준인 일간을 받쳐 주는 힘이 상대적으로 적은 쪽으로 분류됐어요. 능력이 약하다는 뜻이 아니라 주변의 도움과 환경을 함께 읽는 기준이에요."
                  : "일간과 주변 글자들의 관계에 대한 공급자의 분류예요. 성격의 우열이나 건강 상태를 나타내지는 않아요."}
            </p>
            {details.sinStrength.score !== undefined && (
              <small>
                SAZU 신강약 지수 {details.sinStrength.score} · 능력·운의 점수가
                아니에요.
              </small>
            )}
          </div>
        ) : (
          <p className="saju-muted">신강약 판단 미제공</p>
        )}
      </Section>
      <Section
        title="02. 다섯 가지 성질, 오행"
        intro="목·화·토·금·수는 글자의 성질을 묶는 다섯 분류예요. 아래는 SAZU가 집계한 개수예요."
        open
      >
        {result.elements.length ? (
          <div className="saju-element-bars">
            {elementOrder.map((name) => {
              const item = result.elements.find((e) => e.name === name);
              const width = item && sum > 0 ? (item.count / sum) * 100 : 0;
              return (
                <div key={name} className="saju-element-row">
                  <span>
                    <b>{name}</b>
                    <small>{elementMeaning[name]}</small>
                  </span>
                  <div className="saju-bar-track">
                    <div
                      className={`saju-bar saju-${name}`}
                      style={{ width: `${width}%` } as CSSProperties}
                    />
                  </div>
                  <strong>{item ? `${item.count}개` : "미제공"}</strong>
                </div>
              );
            })}
          </div>
        ) : (
          <p>오행 분포가 제공되지 않았어요.</p>
        )}
        <p className="saju-note">
          개수가 0이어도 그 성질이 삶에 없다는 뜻은 아니에요. 계절·지장간·조합을
          함께 봐야 하며 개수만으로 용신을 고르지 않아요.
        </p>
      </Section>
      <Section
        title="03. 나와 다른 글자의 관계, 십성"
        intro="십성은 일간과 각 글자의 오행·음양 관계에 붙인 이름이에요. 비견과 겁재를 함께 부르는 큰 분류가 ‘비겁’이에요."
        open
      >
        <div className="saju-group-tags">
          {Object.entries(groupDefinitions).map(([name, def]) => (
            <span key={name} title={def}>
              <b>{name}</b>
              <small>{def.split(" · ")[1]}</small>
            </span>
          ))}
        </div>
        {allTerms.length ? (
          <dl className="saju-definitions">
            {allTerms.map((name) => (
              <div key={name}>
                <dt>
                  {name} <small>{tenGodGroup(name)}</small>
                </dt>
                <dd>
                  {tenGodMeaning[name] ??
                    "공급자가 표시한 관계명으로, 쉬운 설명을 준비 중이에요."}
                  <small>
                    표시 위치:{" "}
                    {result.pillars
                      .flatMap((p) => [
                        p.sippiSeong === name && p.label !== "일주"
                          ? `${p.label} 천간`
                          : null,
                        p.earthSippiSeong === name ? `${p.label} 지지` : null,
                      ])
                      .filter(Boolean)
                      .join(" · ") || "일간과 같은 분류"}
                  </small>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>십성 정보가 제공되지 않았어요.</p>
        )}
      </Section>
      <Section
        title="04. 글자가 만났을 때, 합·충·형·파·해"
        intro="글자 하나의 성질에 더해, 두 글자가 만나는 방식을 살펴봐요. 아래 조합과 위치는 SAZU가 판정한 결과예요."
        open
      >
        {relations ? (
          relations.length ? (
            relations.map((r, i) => (
              <article className="saju-reading-card" key={i}>
                <div className="saju-relation-heading">
                  <h5>
                    {r.pair.join(" · ")} <span>{r.type}</span>
                  </h5>
                  <small>{r.positions.length}개 위치</small>
                </div>
                <p>{relationMeaning(r.type)}</p>
                <details className="saju-evidence">
                  <summary>어느 자리에서 만났나요?</summary>
                  <ul>
                    {r.positions.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </details>
              </article>
            ))
          ) : (
            <p>제공된 응답에는 표시된 조합이 없어요.</p>
          )
        ) : (
          <p>
            조합 분석이 제공되지 않았어요. 글자만 보고 임의로 판정하지 않아요.
          </p>
        )}
      </Section>
      <Section
        title="05. 지장간·12운성·납음 읽기"
        intro="지장간은 지지 안의 천간, 12운성은 일간의 흐름을 열두 단계에 빗댄 이름, 납음은 간지 두 글자에 붙이는 별도 분류예요."
      >
        {result.pillars.map((p) => (
          <article className="saju-reading-card" key={p.label}>
            <h5>
              {p.label} · {p.value ?? "미상"}
            </h5>
            <p>
              {p.twelveStage
                ? `${p.twelveStage}: ${stageMeaning[p.twelveStage] ?? "설명을 준비 중이에요."}`
                : "12운성 미제공"}
            </p>
            {p.jiJangGan && (
              <p>
                지장간:{" "}
                {(["residue", "middle", "main"] as const)
                  .flatMap((k) => {
                    const v = p.jiJangGan?.[k];
                    const s = symbol(v?.stem, "sky");
                    return v
                      ? [
                          `${s?.hanja ?? v.stem}(${v.stem}${s ? s.element : ""})${k === "main" ? " · 본기" : ""}`,
                        ]
                      : [];
                  })
                  .join(" / ")}
              </p>
            )}
            <small>납음: {p.naeeum ?? "미제공"}</small>
          </article>
        ))}
        <p className="saju-note">
          ‘병’과 ‘사’는 단계 이름으로 실제 질병이나 죽음을 뜻하지 않아요.
          지장간은 위 팔자에 글자를 더해 열한 자·열두 자로 세는 것이 아니에요.
        </p>
      </Section>
      <Section
        title="06. 사주의 구조와 균형, 격국·용신"
        intro="격국은 사주의 구조를 묶는 이름이고, 용신은 그 구조에서 균형을 위해 읽는 기운이에요."
      >
        {details?.gyeokguk ? (
          <article className="saju-reading-card">
            <h5>격국 · {details.gyeokguk.name}</h5>
            <p>
              월의 기운과 일간 등 원국의 관계로 분류한 구조명이에요. 직업이나
              삶의 수준을 정해 놓은 등급은 아니에요.
            </p>
            <small>공급자 근거: {details.gyeokguk.reasoning ?? "미제공"}</small>
          </article>
        ) : (
          <p>격국 미제공</p>
        )}
        {yongsin ? (
          <>
            <div className="saju-group-tags">
              {(
                [
                  ["용신", yongsin.yongsin],
                  ["희신", yongsin.huisin],
                  ["기신", yongsin.gisin],
                  ["구신", yongsin.gusin],
                  ["한신", yongsin.hansin],
                ] as const
              ).map(([name, v]) => (
                <span key={name}>
                  <small>{name}</small>
                  <b>{v?.ko ?? "미제공"}</b>
                </span>
              ))}
            </div>
            <p>
              용신은 균형의 기준, 희신은 이를 돕는 기운이에요. 기신·구신은
              균형에 부담을 주는 쪽, 한신은 상대적으로 중립인 쪽으로 분류해요.
            </p>
            <p className="saju-note">
              이 표는 SAZU의 판정이며 오행 개수로 재계산하지 않았어요. 특정
              이름·직업·방향을 선택하라는 처방으로 사용하지 않아요.
            </p>
            <details className="saju-evidence">
              <summary>판정 방식과 근거</summary>
              <p>
                {yongsin.method === "eokbu"
                  ? "억부 · 일간의 강약을 기준으로 균형을 읽는 방식"
                  : (yongsin.method ?? "방식 미제공")}
              </p>
              <p>{yongsin.reasoning ?? "세부 근거 미제공"}</p>
              {yongsin.johu && (
                <p>조후용신(차고 더운 기운의 조절): {yongsin.johu.ko}</p>
              )}
            </details>
          </>
        ) : (
          <p>용신 판단 미제공</p>
        )}
      </Section>
      <Section
        title="07. 원국에 붙는 표식, 신살·귀인"
        intro="특정한 글자 배치에 붙이는 전통적인 이름이에요. 이름 하나만으로 길흉이나 실제 사건을 단정하지 않아요."
      >
        {details?.sinsal ? (
          (["angels", "devils", "twelve"] as const).map((category) => (
            <div key={category}>
              <h5>
                {category === "angels"
                  ? "귀인과 보조 표식"
                  : category === "devils"
                    ? "주의 표식"
                    : "12신살"}
              </h5>
              {details.sinsal?.[category]?.length ? (
                details.sinsal[category].map((v, i) => (
                  <article className="saju-reading-card" key={i}>
                    <h5>
                      {v.name} <small>{v.pillars.join(" · ")}</small>
                    </h5>
                    <p>
                      {markerMeaning[v.name] ??
                        "SAZU가 확인한 전통 표식이에요. 이 표식의 쉬운 설명은 검토 중이에요."}
                    </p>
                  </article>
                ))
              ) : (
                <p className="saju-muted">표시된 항목 없음</p>
              )}
            </div>
          ))
        ) : (
          <p>신살 정보 미제공</p>
        )}
      </Section>
      <Section
        title="08. 열 해씩 보는 흐름, 대운"
        intro="대운은 열 해 단위로 바뀌는 간지 흐름이에요. 미래의 사건을 확정하는 시간표는 아니에요."
      >
        {details?.decadeFortune ? (
          <>
            <p>
              <b>{details.decadeFortune.direction}</b> · 시작{" "}
              {details.decadeFortune.startAge ??
                details.decadeFortune.list[0]?.startAge ??
                "미제공"}
              세 <small>(SAZU 나이 기준)</small>
            </p>
            <div className="saju-decade-list">
              {details.decadeFortune.list.map((v, i) => (
                <article key={i}>
                  <small>{v.startAge}세부터</small>
                  <strong>
                    {[...v.full]
                      .map(
                        (char, index) =>
                          symbol(char, index === 0 ? "sky" : "earth")?.hanja ??
                          char,
                      )
                      .join("")}
                  </strong>
                  <span>{v.full}</span>
                  <small>{v.sipseong?.gan ?? "십성 미제공"}</small>
                  {v.twelveFortune?.name && (
                    <small>{v.twelveFortune.name}</small>
                  )}
                </article>
              ))}
            </div>
            <p className="saju-note">
              시작일 {details.decadeFortune.startDateTime ?? "미제공"} · 기준
              절기 {details.decadeFortune.basisTermsName ?? "미제공"}. 현재
              대운을 나이만으로 임의 강조하지 않았어요.
            </p>
          </>
        ) : (
          <p>대운 정보가 제공되지 않았어요.</p>
        )}
      </Section>
      <Section
        title="09. 공급자가 짚은 성향과 근거"
        intro="원국의 여러 항목을 함께 본 전통적 해석이에요. 실제 성격 검사 결과가 아니라 자신을 돌아보는 참고 자료로 읽어 주세요."
      >
        {details?.evaluation?.personality ? (
          <>
            <div className="saju-keywords">
              {details.evaluation.personality.keywords?.map((k) => (
                <span key={k}>{k}</span>
              ))}
            </div>
            {details.evaluation.personality.strengths?.map((v, i) => (
              <article className="saju-reading-card" key={i}>
                <h5>{v.trait}</h5>
                <small>SAZU 해석 근거: {v.basis}</small>
                <p>
                  이 성질이 나에게도 맞는지 경험과 함께 비교해 보세요. 정해진
                  능력이나 미래를 뜻하지 않아요.
                </p>
              </article>
            ))}
            {details.evaluation.personality.cautions?.map((v, i) => (
              <article className="saju-reading-card" key={`caution-${i}`}>
                <h5>함께 돌아볼 점 · {v.basis}</h5>
                <p>
                  {v.basis.includes("신강")
                    ? "자기 기준을 유지하는 힘과 함께, 상대의 의견을 듣고 조율하는 여유도 돌아볼 수 있어요."
                    : v.basis.includes("탕화")
                      ? "열정이 커질 때 잠깐 속도를 낮추고 감정을 정리하는 모습을 생각해 볼 수 있어요."
                      : "이 표식 하나로 결론을 내리기보다, 다른 글자와 실제 경험을 함께 살펴보세요."}
                </p>
              </article>
            ))}
          </>
        ) : (
          <p>성향 종합 정보 미제공</p>
        )}
      </Section>
      <p className="saju-footer">
        계산·조합 판정: SAZU · 용어 풀이: 이름결
        <br />
        전통 명리의 상징을 설명하는 참고 콘텐츠입니다.
      </p>
    </div>
  );
}

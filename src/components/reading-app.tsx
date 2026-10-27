"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { hanjaList } from "@/data/hanja";
import type { Hanja, NameResult, SazuResult } from "@/lib/types";
import { birthSchema } from "@/lib/validation";

class ReadingError extends Error {}

export function ReadingApp(): ReactNode {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>("");
  const [ids, setIds] = useState<string[]>(["", "", ""]);
  const [active, setActive] = useState<number | null>(null);
  const [query, setQuery] = useState<string>("");
  const dialog = useRef<HTMLDialogElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [birthDate, setBirthDate] = useState<string>("");
  const [birthTime, setBirthTime] = useState<string>("");
  const [unknownTime, setUnknownTime] = useState<boolean>(false);
  const [gender, setGender] = useState<"female" | "male">("female");
  const [birthCity, setBirthCity] = useState<string>("서울");
  const [consent, setConsent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [sazuError, setSazuError] = useState<string>("");
  const [result, setResult] = useState<NameResult | null>(null);
  const [sazu, setSazu] = useState<SazuResult | null>(null);
  const [sazuLoading, setSazuLoading] = useState<boolean>(false);
  const selected: (Hanja | undefined)[] = ids.map((id: string) =>
    hanjaList.find((item: Hanja): boolean => item.id === id),
  );
  const candidates: Hanja[] =
    active === null
      ? []
      : hanjaList.filter(
          (item: Hanja): boolean =>
            item.reading === name[active] &&
            `${item.character}${item.meaning}`.includes(query),
        );
  const complete: boolean =
    /^[가-힣]{3}$/.test(name) &&
    selected.every(
      (item: Hanja | undefined, index: number): boolean =>
        !!item && item.reading === name[index],
    );

  useEffect((): void => {
    if (active !== null && !dialog.current?.open) dialog.current?.showModal();
    if (active === null && dialog.current?.open) dialog.current?.close();
  }, [active]);
  useEffect((): void => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  function updateName(value: string): void {
    setName(value);
    setIds((previous: string[]): string[] =>
      previous.map((id: string, index: number): string =>
        value[index] === name[index] ? id : "",
      ),
    );
    setError("");
  }
  function sampleName(): void {
    setName("김서준");
    setIds(["김-金", "서-書", "준-俊"]);
    setError("");
  }
  function sampleBirth(): void {
    setBirthDate("1998-05-19");
    setBirthTime("10:00");
    setUnknownTime(false);
    setGender("male");
    setBirthCity("서울");
    setError("");
  }
  async function analyze(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    if (!complete) {
      setError("한글 이름과 한자 세 글자를 모두 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setSazu(null);
    setSazuError("");
    try {
      const response: Response = await fetch("/api/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hanjaIds: ids }),
        signal: AbortSignal.timeout(15000),
      });
      const body: { data?: NameResult; error?: string } = await response.json();
      if (!response.ok || !body.data)
        throw new ReadingError(body.error ?? "분석 결과를 불러오지 못했어요.");
      setResult(body.data);
    } catch (cause: unknown) {
      setError(
        cause instanceof ReadingError
          ? cause.message
          : "연결이 원활하지 않아요. 다시 시도해 주세요.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function analyzeSazu(): Promise<void> {
    const parsed = birthSchema.safeParse({
      birthDate,
      birthTime: unknownTime ? null : birthTime,
      gender,
      birthCity,
      consent,
    });
    if (!parsed.success) {
      setSazuError(
        "출생 정보와 정보 제공 동의가 필요해요. ‘입력 수정’에서 확인해 주세요.",
      );
      return;
    }
    setSazuLoading(true);
    setSazuError("");
    try {
      const response: Response = await fetch("/api/sazu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: AbortSignal.timeout(20000),
      });
      const body: { data?: SazuResult; error?: string } = await response.json();
      if (!response.ok || !body.data)
        throw new ReadingError(body.error ?? "사주 결과를 불러오지 못했어요.");
      setSazu(body.data);
    } catch (cause: unknown) {
      setSazuError(
        cause instanceof ReadingError
          ? cause.message
          : "연결이 원활하지 않아요. 다시 시도해 주세요.",
      );
    } finally {
      setSazuLoading(false);
    }
  }

  return (
    <>
      <header className="header">
        <a className="brand" href="/" aria-label="이름결 홈">
          <span className="brand-mark">결</span>이름결
          <span className="brand-english">IREUMGYEOL</span>
        </a>
        <a className="header-link" href="#about">
          이름결이 전하는 이야기 <span aria-hidden>↗</span>
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> 나를 알아가는 작은 시작
            </p>
            <h1>
              태어난 순간의 기운,
              <br />
              이름에 담긴 <em>나의 결.</em>
            </h1>
            <p className="hero-description">
              매일 불리지만, 미처 몰랐던 내 이름의 이야기.
              <br />
              사주와 성명학으로 나를 조금 더 깊이 만나보세요.
            </p>
            <div className="hero-tags">
              <span>生 사주팔자</span>
              <i /> <span>名 이름 풀이</span>
              <i /> <span>結 나다운 이해</span>
            </div>
          </div>
          <div className="orbit-art" aria-hidden="true">
            <div className="orbit-ring outer" />
            <div className="orbit-ring inner" />
            <span className="art-note">태어난 순간과 이름이 만나는 곳</span>
            <span className="element wood">木</span>
            <span className="element fire">火</span>
            <span className="element earth">土</span>
            <span className="element metal">金</span>
            <span className="element water">水</span>
            <div className="art-center">
              結<small>당신만의 고유한 결</small>
            </div>
            <span className="art-star">✳</span>
          </div>
        </section>
        <section className="workspace" aria-label="이름과 사주 분석">
          <aside className="guide">
            <span className="section-index">01 — YOUR STORY</span>
            <h2>
              당신의 이야기를
              <br />
              들려주세요.
            </h2>
            <p>
              이름 한 글자, 태어난 한 순간.
              <br />
              작은 정보에서 이야기가 시작됩니다.
            </p>
            <ol>
              <li className={!result && step === 1 ? "current" : ""}>
                <b>01</b>
                <div>
                  이름에 담긴 뜻<small>한글 이름과 한자 선택</small>
                </div>
              </li>
              <li className={!result && step === 2 ? "current" : ""}>
                <b>02</b>
                <div>
                  태어난 순간<small>생년월일과 출생 정보 · 선택</small>
                </div>
              </li>
              <li className={result ? "current" : ""}>
                <b>03</b>
                <div>
                  나만의 이름결<small>이름 풀이와 사주 원국</small>
                </div>
              </li>
            </ol>
            <div className="guide-note">
              <span>✳</span>
              <p>
                운명을 단정하기보다,
                <br />
                나를 이해하는 하나의 시선으로.
              </p>
            </div>
          </aside>
          <div className="reading-card">
            {!result ? (
              <>
                <div className="card-top">
                  <span className="pill">
                    {step === 1 ? "이름 풀이" : "출생 정보"}
                  </span>
                  <span className="step-count">
                    STEP 0{step} <span>/ 02</span>
                  </span>
                </div>
                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>): void => {
                    event.preventDefault();
                    if (step === 1) {
                      if (complete) {
                        setStep(2);
                        setError("");
                      } else
                        setError(
                          "한글 이름과 한자 세 글자를 모두 선택해 주세요.",
                        );
                    } else void analyze();
                  }}
                >
                  {step === 1 ? (
                    <>
                      <h2>어떤 이름으로 불리시나요?</h2>
                      <p className="card-description">
                        이름에 쓰인 정확한 한자를 선택해 주세요.
                      </p>
                      <div className="label-row">
                        <label htmlFor="korean-name">한글 이름</label>
                        <button
                          className="text-button"
                          type="button"
                          onClick={sampleName}
                        >
                          예시로 채우기 ↗
                        </button>
                      </div>
                      <input
                        id="korean-name"
                        className="name-input"
                        autoComplete="off"
                        placeholder="예: 김서준"
                        maxLength={3}
                        value={name}
                        onChange={(event): void =>
                          updateName(event.target.value)
                        }
                        aria-describedby="name-help"
                      />
                      <p id="name-help" className="field-help">
                        첫 버전은 성 1글자 + 이름 2글자를 지원해요.
                      </p>
                      <div className="label-row hanja-label">
                        <span>이름의 한자</span>
                        <span className="muted">
                          각 글자를 눌러 선택해 주세요
                        </span>
                      </div>
                      <div className="hanja-slots">
                        {[0, 1, 2].map((index: number): ReactNode => (
                          <button
                            className={`hanja-slot ${selected[index] ? "chosen" : ""}`}
                            key={index}
                            type="button"
                            disabled={!/^[가-힣]$/.test(name[index] ?? "")}
                            onClick={(): void => {
                              setQuery("");
                              setActive(index);
                            }}
                            aria-label={`${index === 0 ? "성" : `이름 ${index}`} ${name[index] ?? ""} 한자 선택`}
                          >
                            <span className="slot-position">
                              {index === 0 ? "성" : `이름 ${index}`}
                            </span>
                            <strong>
                              {selected[index]?.character ?? name[index] ?? "—"}
                            </strong>
                            <span className="slot-meaning">
                              {selected[index]
                                ? `${selected[index]?.meaning} ${name[index]}`
                                : "한자 선택 +"}
                            </span>
                            {selected[index] && (
                              <small>
                                원획 {selected[index]?.strokes}획 <span>✓</span>
                              </small>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="inline-note">
                        <span>ⓘ</span>
                        <p>
                          현재는 일부 한자만 제공하는 체험 버전이에요.
                          <br />
                          목록에 없는 한자는 전체 한자 DB 도입 후 지원합니다.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>당신이 시작된 순간을 알려주세요.</h2>
                      <p className="card-description">
                        사주를 함께 보고 싶다면 입력해 주세요. 이름만 분석해도
                        좋아요.
                      </p>
                      <div className="label-row">
                        <label htmlFor="birth-date">
                          생년월일 <span className="muted">양력</span>
                        </label>
                        <button
                          type="button"
                          className="text-button"
                          onClick={sampleBirth}
                        >
                          SAZU 샘플 입력 ↗
                        </button>
                      </div>
                      <input
                        id="birth-date"
                        type="date"
                        min="1900-01-01"
                        value={birthDate}
                        onChange={(event): void =>
                          setBirthDate(event.target.value)
                        }
                      />
                      <p className="field-help">
                        현재 양력·국내 출생을 지원해요. 음력·윤달은 추후
                        지원합니다.
                      </p>
                      <div className="form-columns">
                        <div>
                          <div className="label-row">
                            <label htmlFor="birth-time">태어난 시간</label>
                          </div>
                          <input
                            id="birth-time"
                            type="time"
                            value={birthTime}
                            disabled={unknownTime}
                            onChange={(event): void =>
                              setBirthTime(event.target.value)
                            }
                          />
                          <label className="checkbox-row">
                            <input
                              type="checkbox"
                              checked={unknownTime}
                              onChange={(event): void =>
                                setUnknownTime(event.target.checked)
                              }
                            />
                            시간을 몰라요
                          </label>
                        </div>
                        <div>
                          <div className="label-row">
                            <label htmlFor="birth-city">태어난 도시</label>
                          </div>
                          <select
                            id="birth-city"
                            value={birthCity}
                            onChange={(event): void =>
                              setBirthCity(event.target.value)
                            }
                          >
                            {[
                              "서울",
                              "부산",
                              "대구",
                              "인천",
                              "광주",
                              "대전",
                              "울산",
                              "제주",
                            ].map((city: string) => (
                              <option key={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <fieldset>
                        <legend>성별</legend>
                        <div className="gender-options">
                          {(
                            [
                              ["female", "여성"],
                              ["male", "남성"],
                            ] as const
                          ).map(([value, label]) => (
                            <label
                              className={gender === value ? "selected" : ""}
                              key={value}
                            >
                              <input
                                type="radio"
                                name="gender"
                                value={value}
                                checked={gender === value}
                                onChange={(): void => setGender(value)}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="checkbox-row consent">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(event): void =>
                            setConsent(event.target.checked)
                          }
                        />
                        <span>
                          사주 조회를 위해 생년월일시·성별·출생 도시를 SAZU에
                          제공하는 데 동의해요.{" "}
                          <small>
                            결과 화면에서 ‘사주 불러오기’를 누르면 전송돼요.
                            이름은 전송하지 않아요.
                          </small>
                        </span>
                      </label>
                    </>
                  )}
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={loading || (step === 1 && !complete)}
                  >
                    {loading
                      ? "이름의 이야기를 살펴보고 있어요…"
                      : step === 1
                        ? "다음, 태어난 순간 알아보기"
                        : "나의 이름결 확인하기"}
                    <span aria-hidden>→</span>
                  </button>
                  <div className="card-bottom">
                    {step === 1 ? (
                      <button
                        className="text-button"
                        type="button"
                        disabled={!complete || loading}
                        onClick={(): void => {
                          void analyze();
                        }}
                      >
                        이름만 먼저 분석할게요
                      </button>
                    ) : (
                      <button
                        className="text-button"
                        type="button"
                        disabled={loading}
                        onClick={(): void => {
                          setStep(1);
                          setError("");
                        }}
                      >
                        ← 이름 선택으로 돌아가기
                      </button>
                    )}
                    <span>무료 체험 · 결제 없음</span>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="card-top">
                  <span className="pill">나만의 이름결</span>
                  <button
                    type="button"
                    className="text-button"
                    disabled={sazuLoading}
                    onClick={(): void => {
                      setResult(null);
                      setSazu(null);
                      setSazuError("");
                    }}
                  >
                    입력 수정 ↗
                  </button>
                </div>
                <h2 ref={resultHeading} tabIndex={-1}>
                  {result.name}님, 이름 속 이야기를 만나보세요.
                </h2>
                <p className="card-description">
                  예시 한자 데이터로 계산한 성명학 체험 결과예요.
                </p>
                <div className="result-name">
                  {result.hanja.map((item: Hanja): ReactNode => (
                    <div key={item.id}>
                      <strong>{item.character}</strong>
                      <span>
                        {item.meaning} {item.reading}
                      </span>
                      <small>원획 {item.strokes}획</small>
                    </div>
                  ))}
                </div>
                <div className="result-title">
                  <h3>원형이정, 네 가지 이름의 흐름</h3>
                  <span>81수리 기준</span>
                </div>
                <div className="grid-results">
                  {result.grids.map((grid): ReactNode => (
                    <article key={grid.label}>
                      <div>
                        <span>
                          {grid.label} <small>{grid.period}</small>
                        </span>
                        <b
                          className={`fortune ${grid.fortune === "吉" ? "good" : ""}`}
                        >
                          {grid.fortune === "吉"
                            ? "길"
                            : grid.fortune === "凶"
                              ? "흉"
                              : "반길반흉"}
                        </b>
                      </div>
                      <h4>
                        {grid.total}
                        <small>획 · {grid.title}</small>
                      </h4>
                      <p>{grid.description}</p>
                      {grid.total !== grid.number && (
                        <small>81수리 환산: {grid.number}</small>
                      )}
                    </article>
                  ))}
                </div>
                <div className="sound-result">
                  <h3>소리로 살펴보는 발음오행</h3>
                  <div>
                    {result.sounds.map((sound, index: number): ReactNode => (
                      <div className="sound-item" key={index}>
                        <span>
                          {sound.syllable} <b>{sound.element ?? "미분류"}</b>
                        </span>
                        {index < 2 && (
                          <small>→ {result.relations[index]}</small>
                        )}
                      </div>
                    ))}
                  </div>
                  <p>성에서 이름 순서로 읽는 초성의 흐름입니다.</p>
                </div>
                <div className="sazu-result">
                  <div className="result-title">
                    <h3>태어난 순간의 사주</h3>
                    <span>SAZU</span>
                  </div>
                  {sazu ? (
                    <>
                      {sazu.sample && (
                        <p className="sample-notice">
                          SAZU 고정 샘플 결과입니다. 개인의 실제 분석 결과가
                          아닙니다.
                        </p>
                      )}
                      <div className="pillars">
                        {sazu.pillars.map((pillar): ReactNode => (
                          <div key={pillar.label}>
                            <small>{pillar.label}</small>
                            <strong>{pillar.value ?? "미상"}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="elements-result">
                        {sazu.elements.map((item, index: number): ReactNode => (
                          <span key={index}>
                            {item.name} <b>{item.count}</b>
                          </span>
                        ))}
                      </div>
                      <p className="field-help">
                        오행 개수만으로 용신이나 이름의 좋고 나쁨을 단정하지
                        않습니다.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        입력한 출생 정보로 사주 원국과 오행 분포를 함께
                        살펴보세요.
                      </p>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={sazuLoading}
                        onClick={(): void => {
                          void analyzeSazu();
                        }}
                      >
                        {sazuLoading
                          ? "사주를 불러오고 있어요…"
                          : "사주 불러오기"}
                        <span>↗</span>
                      </button>
                    </>
                  )}
                  {sazuError && (
                    <p className="error-message" role="alert">
                      {sazuError}
                    </p>
                  )}
                </div>
                <p className="result-footnote">
                  전통 성명학 자료를 바탕으로 한 참고용 풀이입니다.
                  자원오행·불용문자 판정과 AI 종합 해설은 데이터 검수 후 제공할
                  예정이에요.
                </p>
              </>
            )}
          </div>
        </section>
        <section className="about" id="about">
          <div>
            <span className="section-index">A LITTLE MORE ABOUT YOU</span>
            <h2>
              어려운 풀이보다,
              <br />
              나에게 가까운 이야기.
            </h2>
          </div>
          <article>
            <span>01 / 生</span>
            <h3>태어난 순간을 읽고</h3>
            <p>
              SAZU의 만세력을 연결해
              <br />
              사주 원국과 오행을 살펴봅니다.
            </p>
          </article>
          <article>
            <span>02 / 名</span>
            <h3>이름의 뜻을 살펴</h3>
            <p>
              정확한 한자와 원획수를 바탕으로
              <br />
              이름에 담긴 흐름을 알아봅니다.
            </p>
          </article>
          <article>
            <span>03 / 結</span>
            <h3>나를 이해하는 시간</h3>
            <p>
              좋고 나쁨에 머무르지 않고
              <br />
              나를 돌아보는 계기를 만듭니다.
            </p>
          </article>
        </section>
      </main>
      <footer>
        <a className="brand" href="/">
          이름결
        </a>
        <p>당신을 알아가는 또 하나의 방법.</p>
        <span>© {new Date().getFullYear()} 이름결 · 개발 미리보기</span>
      </footer>
      <dialog
        ref={dialog}
        onCancel={(): void => setActive(null)}
        onClose={(): void => setActive(null)}
        onClick={(event): void => {
          if (event.target === dialog.current) setActive(null);
        }}
        aria-labelledby="hanja-title"
      >
        <div className="dialog-content">
          <div className="card-top">
            <span className="pill">이름의 한자</span>
            <button
              className="close-button"
              type="button"
              aria-label="한자 선택 닫기"
              onClick={(): void => setActive(null)}
            >
              ×
            </button>
          </div>
          <h2 id="hanja-title">
            ‘{active === null ? "" : name[active]}’에 담긴 뜻을 골라주세요.
          </h2>
          <p className="card-description">예시 한자 목록 · 원획수 기준</p>
          <input
            aria-label="한자 또는 뜻 검색"
            placeholder="한자 또는 뜻으로 검색"
            value={query}
            onChange={(event): void => setQuery(event.target.value)}
            autoFocus
          />
          <div className="hanja-options">
            {candidates.map((item: Hanja): ReactNode => (
              <button
                key={item.id}
                type="button"
                onClick={(): void => {
                  if (active !== null)
                    setIds((previous: string[]): string[] =>
                      previous.map((id: string, index: number): string =>
                        index === active ? item.id : id,
                      ),
                    );
                  setActive(null);
                }}
              >
                <strong>{item.character}</strong>
                <span>
                  {item.meaning} {item.reading}
                  <small>원획 {item.strokes}획</small>
                </span>
                <span aria-hidden>＋</span>
              </button>
            ))}
          </div>
          {candidates.length === 0 && (
            <p className="empty-state">
              해당 한자가 아직 목록에 없어요.
              <br />
              검색어를 바꾸거나 예시 이름으로 체험해 주세요.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

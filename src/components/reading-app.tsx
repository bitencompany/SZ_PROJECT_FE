"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { hanjaResponseSchema, nameResponseSchema } from "@/lib/name-contract";
import {
  clearDraft,
  readDraft,
  writeDraft,
  createDraft,
} from "@/lib/reading-draft";
import {
  selectionMode,
  resizeNameSelection,
  type HanjaSelection,
} from "@/lib/name-input";
import { apiMessage, clientApi, ApiFailure } from "@/lib/client-api";
import { SajuReading } from "./saju-reading";
import { hanjaLabel, matchesHanja } from "@/lib/hanja-search";
import { StrokeReference } from "./stroke-reference";
import type { Hanja, NameResult, SazuResult } from "@/lib/types";
import {
  birthSchema,
  nameInputSchema,
  supportsStoredName,
} from "@/lib/validation";

class ReadingError extends Error {}

export function ReadingApp({
  signedIn = false,
  backendNameEnabled = false,
}: {
  signedIn?: boolean;
  backendNameEnabled?: boolean;
}): ReactNode {
  const [hanjaList, setHanjaList] = useState<Hanja[]>([]);
  const [hanjaLoading, setHanjaLoading] = useState<boolean>(false);
  const [hanjaError, setHanjaError] = useState<string>("");
  const [catalogStatus, setCatalogStatus] = useState<"preview" | "verified">(
    "preview",
  );
  const [resultCatalog, setResultCatalog] = useState<"preview" | "verified">(
    "preview",
  );
  const [catalogVersion, setCatalogVersion] = useState("");
  const [resultCatalogVersion, setResultCatalogVersion] = useState("");
  const [restored, setRestored] = useState<boolean>(false);
  const [lookupRetry, setLookupRetry] = useState<number>(0);
  const [step, setStep] = useState<number>(1);
  const [surname, setSurname] = useState("");
  const [givenName, setGivenName] = useState("");
  const name = surname + givenName;
  const surnameLength = surname.length;
  const [ids, setIds] = useState<HanjaSelection[]>([]);
  const nameMode = selectionMode(ids);
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
  const inputSignature = JSON.stringify([
    name,
    nameMode,
    surnameLength,
    ids,
    birthDate,
    birthTime,
    unknownTime,
    gender,
    birthCity,
  ]);
  const liveInput = useRef(inputSignature);
  liveInput.current = inputSignature;
  useEffect(() => {
    setSazu(null);
    setResult(null);
    setSazuError("");
  }, [inputSignature]);
  const selected: (Hanja | undefined)[] = ids.map((id) =>
    hanjaList.find((item: Hanja): boolean => item.id === id),
  );
  const candidates: Hanja[] =
    active === null
      ? []
      : hanjaList.filter(
          (item: Hanja): boolean =>
            item.reading === name[active] &&
            matchesHanja(item, query),
        );
  const complete: boolean =
    nameInputSchema.safeParse({ name, nameMode, surnameLength, hanjaIds: ids })
      .success &&
    selected.every(
      (item, index) =>
        ids[index] === null || (!!item && item.reading === name[index]),
    );

  useEffect(() => {
    const draft = readDraft();
    if (!draft) return;
    setSurname(draft.name.slice(0, draft.surnameLength));
    setGivenName(draft.name.slice(draft.surnameLength));
    setIds(draft.ids);
    setBirthDate(draft.birthDate);
    setBirthTime(draft.birthTime);
    setUnknownTime(draft.unknownTime);
    setGender(draft.gender);
    setBirthCity(draft.birthCity);
    setStep(draft.step);
    setRestored(true);
    // 정보 제공 동의는 복원하지 않고, 외부 API 재조회 전에 다시 받습니다.
  }, []);

  const lookupReadingsKey = JSON.stringify([
    ...new Set(
      [...name].filter(
        (value, index) =>
          (ids[index] !== null || active === index) && /^[가-힣]$/.test(value),
      ),
    ),
  ]);
  useEffect(() => {
    const readings: string[] = JSON.parse(lookupReadingsKey);
    if (!readings.length) {
      setHanjaList([]);
      setHanjaLoading(false);
      setHanjaError("");
      return;
    }
    const controller = new AbortController();
    setHanjaLoading(true);
    setHanjaError("");
    setHanjaList([]);
    const timer = setTimeout(() => {
      void Promise.all(
        readings.map(async (reading) => {
          const response = await clientApi(
            `/api/hanja?${new URLSearchParams({ reading })}`,
            { signal: controller.signal },
          );
          return hanjaResponseSchema.parse(response);
        }),
      )
        .then((responses) => {
          if (controller.signal.aborted) return;
          setHanjaList(responses.flatMap((response) => response.data));
          setCatalogVersion(
            [
              ...new Set(responses.map((response) => response.catalog.version)),
            ].join(", "),
          );
          setCatalogStatus(
            responses.every(
              (response) => response.catalog.status === "verified",
            )
              ? "verified"
              : "preview",
          );
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setHanjaError(
              cause instanceof ApiFailure
                ? cause.message
                : "한자 목록을 불러오지 못했어요. 다시 시도해 주세요.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setHanjaLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lookupReadingsKey, lookupRetry]);

  function saveInput(draftStep: 1 | 2 = result || step === 2 ? 2 : 1): boolean {
    const input = {
      name,
      nameMode,
      surnameLength: surnameLength === 2 ? (2 as const) : (1 as const),
      ids,
      birthDate,
      birthTime,
      unknownTime,
      gender,
      birthCity,
      step: draftStep,
    };
    const preview =
      sazu &&
      !sazu.sample &&
      sazu.previewId &&
      sazu.expiresAt &&
      sazu.providerVersion
        ? {
            id: sazu.previewId,
            expiresAt: sazu.expiresAt,
            providerVersion: sazu.providerVersion,
          }
        : undefined;
    return writeDraft(createDraft(input, readDraft(), preview));
  }

  function continueToDetail(): void {
    if (sazu?.sample) return;
    if (!saveInput()) {
      setError(
        "입력 내용을 보관하지 못했어요. 브라우저의 사이트 저장소를 허용한 뒤 다시 시도해 주세요.",
      );
      return;
    }
    window.location.assign(signedIn ? "/checkout" : "/login?next=%2Fcheckout");
  }

  useEffect((): void => {
    if (active !== null && !dialog.current?.open) dialog.current?.showModal();
    if (active === null && dialog.current?.open) dialog.current?.close();
  }, [active]);
  useEffect((): void => {
    if (result) resultHeading.current?.focus();
  }, [result]);

  function updateName(part: "surname" | "givenName", value: string): void {
    // 성의 길이가 달라져도 이름 쪽 한자/한자 없음 선택은 해당 글자에 남깁니다.
    const surnameIds = ids.slice(0, surnameLength);
    const givenIds = ids.slice(surnameLength);
    if (part === "surname") {
      setSurname(value);
      setIds([...resizeNameSelection(surname, value, surnameIds), ...givenIds]);
    } else {
      setGivenName(value);
      setIds([
        ...surnameIds,
        ...resizeNameSelection(givenName, value, givenIds),
      ]);
    }
    setActive(null);
    setError("");
  }
  function sampleName(): void {
    setSurname(backendNameEnabled ? "이" : "김");
    setGivenName(backendNameEnabled ? "서윤" : "서준");
    setIds(
      backendNameEnabled
        ? ["jmd-674e-c774", "jmd-66f8-c11c", "jmd-6f64-c724"]
        : ["김-金", "서-書", "준-俊"],
    );
    setActive(null);
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
    const requestedInput = inputSignature;
    if (!complete) {
      setError(
        "성과 이름을 입력한 뒤 각 글자의 한자를 선택하거나 ‘한자가 아니에요’를 체크해 주세요.",
      );
      return;
    }
    const hasBirth = step === 2 && !!(birthDate || birthTime);
    if (
      hasBirth &&
      !birthSchema.safeParse({
        birthDate,
        birthTime: unknownTime ? null : birthTime,
        gender,
        birthCity,
        consent,
      }).success
    ) {
      setError(
        "출생 정보와 정보 제공 동의를 확인해 주세요. 시간 미상이면 ‘시간을 몰라요’를 선택해 주세요.",
      );
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
        body: JSON.stringify({ name, nameMode, surnameLength, hanjaIds: ids }),
        signal: AbortSignal.timeout(25000),
      });
      const body: { data?: NameResult; error?: string } = await response.json();
      if (!response.ok || !body.data)
        throw new ReadingError(
          apiMessage(body, "분석 결과를 불러오지 못했어요."),
        );
      if (requestedInput !== liveInput.current) return;
      const validated = nameResponseSchema.parse(body);
      saveInput(2);
      setResult(validated.data);
      setResultCatalog(validated.catalog.status);
      setResultCatalogVersion(validated.catalog.version);
      if (hasBirth) await analyzeSazu();
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
    const requestedInput = inputSignature;
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
        signal: AbortSignal.timeout(25000),
      });
      const body: { data?: SazuResult; error?: string } = await response.json();
      if (!response.ok || !body.data)
        throw new ReadingError(
          apiMessage(body, "사주 결과를 불러오지 못했어요."),
        );
      if (requestedInput !== liveInput.current) return;
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
        <nav className="account-nav" aria-label="회원 메뉴">
          <a
            className="header-link"
            href={signedIn ? "/my/readings" : "/login?next=%2Fmy%2Freadings"}
            onClick={() => {
              saveInput();
            }}
          >
            내 풀이함 ↗
          </a>
          {signedIn && (
            <form action="/auth/logout" method="post" onSubmit={clearDraft}>
              <button className="text-button">로그아웃</button>
            </form>
          )}
        </nav>
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
        <section
          className="workspace"
          id="reading"
          aria-label="이름과 사주 분석"
        >
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
            {restored && (
              <p className="account-notice" role="status">
                작성하던 내용을 불러왔어요. 사주를 다시 조회할 때 정보 제공에
                동의해 주세요.
              </p>
            )}
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
                          "성과 이름을 입력한 뒤 각 글자의 한자를 선택하거나 ‘한자가 아니에요’를 체크해 주세요.",
                        );
                    } else void analyze();
                  }}
                >
                  {step === 1 ? (
                    <>
                      <h2>어떤 이름으로 불리시나요?</h2>
                      <p className="card-description">
                        성과 이름을 나누어 적고, 각 글자의 한자를 확인해 주세요.
                      </p>
                      <div className="label-row">
                        <span>한글 성과 이름</span>
                        <button
                          className="text-button"
                          type="button"
                          onClick={sampleName}
                        >
                          예시로 채우기 ↗
                        </button>
                      </div>
                      <div className="name-fields">
                        <div>
                          <label htmlFor="surname">성</label>
                          <input
                            id="surname"
                            className="name-input"
                            autoComplete="off"
                            placeholder="예: 김, 남궁"
                            maxLength={2}
                            value={surname}
                            onChange={(event) =>
                              updateName("surname", event.target.value)
                            }
                            aria-describedby="name-help"
                          />
                        </div>
                        <div>
                          <label htmlFor="given-name">이름</label>
                          <input
                            id="given-name"
                            className="name-input"
                            autoComplete="off"
                            placeholder="예: 하늘"
                            maxLength={19}
                            value={givenName}
                            onChange={(event) =>
                              updateName("givenName", event.target.value)
                            }
                            aria-describedby="name-help"
                          />
                        </div>
                      </div>
                      <p id="name-help" className="field-help">
                        성 1~2글자 · 성과 이름을 합해 한글 2~20글자까지 입력할
                        수 있어요.
                      </p>
                      <div className="label-row hanja-label">
                        <span>이름의 한자</span>
                        <span className="muted">
                          각 글자를 눌러 선택해 주세요
                        </span>
                      </div>
                      <p className="field-help">
                        한자가 없는 글자는 아래 ‘한자가 아니에요’를 체크해
                        주세요. 성만 한자여도 괜찮아요.
                      </p>
                      {hanjaLoading && (
                        <p className="field-help" role="status">
                          한자 목록을 불러오고 있어요…
                        </p>
                      )}
                      {hanjaError && (
                        <p className="error-message" role="alert">
                          {hanjaError}{" "}
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => setLookupRetry((value) => value + 1)}
                          >
                            다시 불러오기
                          </button>
                        </p>
                      )}
                      <div className="hanja-slots">
                        {[...name].map((_, index: number): ReactNode => (
                          <div
                            className="hanja-choice"
                            key={`${index < surnameLength ? "surname" : "given"}-${index < surnameLength ? index : index - surnameLength}`}
                          >
                            <button
                              className={`hanja-slot ${selected[index] || ids[index] === null ? "chosen" : ""}`}
                              type="button"
                              disabled={!/^[가-힣]$/.test(name[index] ?? "")}
                              onClick={(): void => {
                                setQuery("");
                                setActive(index);
                              }}
                              aria-label={`${index < surnameLength ? `성 ${index + 1}` : `이름 ${index - surnameLength + 1}`} ${name[index] ?? ""} 한자 선택`}
                            >
                              <span className="slot-position">
                                {index < surnameLength
                                  ? `성 ${index + 1}`
                                  : `이름 ${index - surnameLength + 1}`}
                              </span>
                              <strong>
                                {selected[index]?.character ??
                                  name[index] ??
                                  "—"}
                              </strong>
                              <span className="slot-meaning">
                                {selected[index]
                                  ? hanjaLabel(selected[index]!)
                                  : ids[index] === null
                                    ? "한자 없음"
                                    : "한자 선택 +"}
                              </span>
                              {selected[index] && (
                                <small>
                                  {selected[index]?.dictionaryStrokes === null
                                    ? "획수 미확인"
                                    : `${selected[index]?.dictionaryStrokes}획`} <span>✓</span>
                                </small>
                              )}
                            </button>
                            <label className="checkbox-row no-hanja-check">
                              <input
                                type="checkbox"
                                checked={ids[index] === null}
                                disabled={!/^[가-힣]$/.test(name[index] ?? "")}
                                aria-label={`${index < surnameLength ? `성 ${index + 1}` : `이름 ${index - surnameLength + 1}`} ${name[index]} 한자가 아니에요`}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setIds((previous) =>
                                    previous.map((id, position) =>
                                      position === index
                                        ? checked
                                          ? null
                                          : ""
                                        : id,
                                    ),
                                  );
                                  setError("");
                                }}
                              />
                              <span>한자가 아니에요</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      <StrokeReference items={selected} />
                      <div className="inline-note">
                        <span>ⓘ</span>
                        <p>
                          {catalogStatus === "preview"
                            ? "한자·독음과 사전 뜻을 대조 중인 체험 버전이에요. 뜻이 확보되지 않은 글자는 ‘뜻 확인 중’으로 표시해요."
                            : "이름에 실제로 쓰는 한자를 직접 선택해 주세요. 같은 음이라도 한자에 따라 뜻과 획수가 달라요."}
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
                            ‘무료 미리보기 확인하기’를 누르면 이름 분석에 이어
                            전송돼요. 이름은 전송하지 않아요.
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
                        : "무료 미리보기 확인하기"}
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
                    disabled={sazuLoading || loading}
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
                  {nameMode === "hangul"
                    ? "한자 없는 이름의 발음오행 미리보기예요."
                    : resultCatalog === "preview"
                      ? "미검수 한자 자료로 계산한 참고용 미리보기예요. 실제 작명 판단에 사용하지 마세요."
                      : "선택한 이름과 한자로 계산한 무료 미리보기예요."}
                </p>
                {result.hanja.length > 0 && (
                  <div className="result-name">
                    {result.hanja.map(
                      (item: Hanja | null, index: number): ReactNode => (
                        <div key={`${index}-${item?.id ?? "hangul"}`}>
                          <strong>
                            {item?.character ?? result.name[index]}
                          </strong>
                          <span>
                            {item
                              ? hanjaLabel(item)
                              : "한자 없음"}
                          </span>
                          {item && (
                            <small>
                              {item.dictionaryStrokes === null ? "획수 미확인" : `${item.dictionaryStrokes}획`}
                            </small>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
                {result.hanja.some(Boolean) && (
                  <p className="field-help">
                    자료 버전: {resultCatalogVersion} ·{" "}
                    {resultCatalog === "preview"
                      ? "검수 전 참고 자료"
                      : "검수 자료"}
                  </p>
                )}
                <StrokeReference items={result.hanja} />
                {result.analysisNotice && (
                  <p className="account-notice">{result.analysisNotice}</p>
                )}
                {result.grids.length > 0 && (
                  <>
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

                          {grid.total !== grid.number && (
                            <small>81수리 환산: {grid.number}</small>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}
                <div className="sound-result">
                  <h3>소리로 살펴보는 발음오행</h3>
                  <div>
                    {result.sounds.map((sound, index: number): ReactNode => (
                      <div className="sound-item" key={index}>
                        <span>
                          {sound.syllable} <b>{sound.element ?? "미분류"}</b>
                        </span>
                        {index < result.sounds.length - 1 && (
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
                    <SajuReading result={sazu} />
                  ) : (
                    <>
                      <p>
                        입력한 출생 정보로 사주 원국과 오행 분포를 함께
                        살펴보세요.
                      </p>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={sazuLoading || loading}
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
                <section
                  className="detail-offer"
                  aria-labelledby="detail-title"
                >
                  <span className="section-index">
                    YOUR STORY, A LITTLE DEEPER
                  </span>
                  <h3 id="detail-title">
                    이름과 사주를 함께 읽으면,
                    <br />
                    어떤 이야기가 펼쳐질까요?
                  </h3>
                  <p>
                    지금 확인한 이름과 태어난 순간을 바탕으로, 나에게 맞는 상세
                    풀이를 만나보세요.
                  </p>
                  <ul>
                    <li>이름 형식에 맞는 풀이와 해설</li>
                    <li>사주 원국과 이름을 함께 살펴보는 분석</li>
                    <li>내 풀이함에서 언제든 다시 보는 결과</li>
                  </ul>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      sazuLoading ||
                      loading ||
                      !!sazu?.sample ||
                      !supportsStoredName({ name, nameMode, surnameLength })
                    }
                    onClick={continueToDetail}
                  >
                    더 자세한 내용 보기 <span aria-hidden>→</span>
                  </button>
                  <p className="field-help">
                    {sazu?.sample
                      ? "무료 샘플 결과는 상세 풀이와 계정 보관으로 이어지지 않아요."
                      : !supportsStoredName({ name, nameMode, surnameLength })
                        ? "이 이름 형식의 계정 보관과 상세 풀이는 준비 중이에요. 지금은 무료 미리보기를 이용해 주세요."
                        : signedIn
                          ? "입력 정보를 확인하고 내 계정에 보관할 수 있어요."
                          : "로그인 후 입력 정보를 확인하고 보관할 수 있어요."}
                    <br />
                    현재 상세 풀이 결제는 준비 중이며, 요금은 청구되지 않습니다.
                  </p>
                  {error && (
                    <p className="error-message" role="alert">
                      {error}
                    </p>
                  )}
                </section>
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
              정확한 한자와 획수를 바탕으로
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
          <p className="card-description">
            {catalogStatus === "preview"
              ? "미검수 참고 한자 목록"
              : "인명용 한자 목록"}{" "}
            · 실제 필획 기준
          </p>
          {catalogVersion && (
            <p className="field-help">자료 버전: {catalogVersion}</p>
          )}
          <input
            aria-label="한자·뜻·본관 검색"
            placeholder="한자·뜻·본관 검색 (예: 진주 강)"
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
                    setIds((previous) =>
                      previous.map((id, index) =>
                        index === active ? item.id : id,
                      ),
                    );
                  setActive(null);
                }}
              >
                <strong>{item.character}</strong>
                <span>
                  {hanjaLabel(item)}
                  {item.searchAliases?.length ? (
                    <small>{item.searchAliases.join(" · ")}</small>
                  ) : null}
                  <small>
                    {item.dictionaryStrokes === null ? "획수 미확인" : `${item.dictionaryStrokes}획`}
                  </small>
                </span>
                <span aria-hidden>＋</span>
              </button>
            ))}
          </div>
          {hanjaLoading && <p role="status">한자 목록을 불러오는 중이에요…</p>}
          {hanjaError && (
            <p className="error-message" role="alert">
              {hanjaError}
            </p>
          )}
          {!hanjaLoading && !hanjaError && candidates.length === 0 && (
            <p className="empty-state">
              {query
                ? "검색 조건에 맞는 한자가 없어요. 검색어를 지우거나 바꿔 주세요."
                : "현재 자료에 없는 독음/한자예요. 법적으로 사용할 수 없는 한자라는 뜻은 아닙니다."}
              <br />
              실제 이름에 한자가 있다면 ‘한자가 아니에요’를 선택하지 말고, 예시
              이름으로 체험해 주세요.
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}

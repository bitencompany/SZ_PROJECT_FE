"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clearDraft, readDraft, type ReadingDraft } from "@/lib/reading-draft";
import { birthSchema, supportsStoredName } from "@/lib/validation";
import { nameResponseSchema } from "@/lib/name-contract";
import type { NameResult } from "@/lib/types";
import { apiMessage } from "@/lib/client-api";
import { saveResponseSchema } from "@/lib/member-contract";
import { DeleteRequest } from "./delete-request";
import { StrokeReference } from "./stroke-reference";

export function CheckoutReview({
  initialDraft,
}: {
  initialDraft?: ReadingDraft;
}): ReactNode {
  const [draft, setDraft] = useState<ReadingDraft | null>(initialDraft ?? null);
  const [ready, setReady] = useState(!!initialDraft);
  const [nameResult, setNameResult] = useState<NameResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [birthConsent, setBirthConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nameNotice, setNameNotice] = useState("");
  const [saved, setSaved] = useState(!!initialDraft);
  useEffect(() => {
    if (!initialDraft) setDraft(readDraft());
    setReady(true);
  }, [initialDraft]);
  useEffect(() => {
    if (!draft) return;
    const controller = new AbortController();
    void fetch("/api/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name,
        nameMode: draft.nameMode,
        surnameLength: draft.surnameLength,
        hanjaIds: draft.ids,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return nameResponseSchema.parse(await response.json());
      })
      .then((response) => {
        if (!controller.signal.aborted) setNameResult(response.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setNameNotice(
            "한자 자료를 아직 확인하지 못했어요. 입력 내용은 보관할 수 있으며, 실제 분석 전에 검증합니다.",
          );
      });
    return () => controller.abort();
  }, [draft]);

  async function save(): Promise<void> {
    if (!draft || !consent || busy || !supportsStoredName(draft)) return;
    // OAuth 복귀 후에만 저장하며, 동의 없는 출생정보 전송을 막습니다.
    const hasBirth = !!(draft.birthDate || draft.birthTime);
    const birth = birthSchema.safeParse({
      birthDate: draft.birthDate,
      birthTime: draft.unknownTime ? null : draft.birthTime,
      gender: draft.gender,
      birthCity: draft.birthCity,
      consent: birthConsent,
    });
    if (hasBirth && !birth.success) {
      setError("출생 정보를 확인해 주세요. 입력 화면에서 수정할 수 있어요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/reading-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          requestId: draft.id,
          name: draft.name,
          hanjaIds: draft.ids,
          birth: hasBirth && birth.success ? birth.data : null,
          consentToSave: true,
          ...(draft.preview && Date.parse(draft.preview.expiresAt) > Date.now()
            ? { previewId: draft.preview.id }
            : {}),
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        window.location.assign("/login?next=%2Fcheckout");
        return;
      }
      if (!response.ok) {
        setError(apiMessage(body, "저장하지 못했어요. 다시 시도해 주세요."));
        return;
      }
      const savedResponse = saveResponseSchema.parse(body);
      if (savedResponse.data.requestId !== draft.id)
        throw new Error("Invalid response");
      window.history.replaceState(null, "", `/checkout?request=${draft.id}`);
      setSaved(true);
      clearDraft();
    } catch {
      setError("저장 연결이 원활하지 않아요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <p role="status">작성한 내용을 불러오는 중이에요…</p>;
  if (!draft)
    return (
      <>
        <h1>분석할 내용을 먼저 알려주세요.</h1>
        <p>입력 내용이 없거나 임시 보관 시간이 지났어요.</p>
        <a className="primary-button" href="/">
          무료 미리보기 시작하기 →
        </a>
      </>
    );
  return (
    <>
      <span className="section-index">
        01 로그인 완료 · 02 정보 확인 · 03 결제
      </span>
      <h1>
        {draft.name}님의 이야기를
        <br />
        이어서 준비할게요.
      </h1>
      <p>분석 대상은 로그인한 본인뿐 아니라 가족이나 다른 분이어도 괜찮아요.</p>
      <dl className="checkout-details">
        <div>
          <dt>분석할 이름</dt>
          <dd>
            {draft.name}{" "}
            {nameResult?.hanja
              .map((item, index) => item?.character ?? draft.name[index])
              .join("")}
          </dd>
        </div>
        <div>
          <dt>한자 원획수</dt>
          <dd>
            {draft.nameMode === "hangul"
              ? "한자 없음 · 획수 풀이 대상이 아니에요."
              : nameResult
                ? nameResult.hanja
                    .map((item, index) =>
                      item
                        ? `${item.character} ${item.strokes}획`
                        : `${draft.name[index]} 한자 없음`,
                    )
                    .join(" · ")
                : "한자 자료 확인 전 · 입력 내용은 보관할 수 있어요."}
          </dd>
        </div>
        <div>
          <dt>출생 정보</dt>
          <dd>
            {draft.birthDate
              ? `${draft.birthDate} · ${draft.unknownTime ? "시간 미상" : draft.birthTime} · ${draft.birthCity} · ${draft.gender === "female" ? "여성" : "남성"}`
              : "입력하지 않음 · 이름 분석만 선택"}
          </dd>
        </div>
      </dl>
      {nameResult && nameResult.hanja.length > 0 && (
        <StrokeReference items={nameResult.hanja} />
      )}
      {nameNotice && <p className="account-notice">{nameNotice}</p>}
      {!supportsStoredName(draft) && (
        <p className="account-notice">
          이 이름 형식의 계정 보관과 상세 풀이는 준비 중이에요. 입력 화면에서
          무료 미리보기를 이용해 주세요.
        </p>
      )}
      <p className="account-notice">
        상세 풀이 결제를 준비하고 있어요. 지금은 입력 내용을 내 계정에 보관할 수
        있으며, 결제나 유료 분석은 실행되지 않습니다.
      </p>
      {!saved ? (
        <>
          <label className="checkbox-row consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              상세 풀이 준비를 위해 이름·한자·출생 정보를 내 계정에 저장하는 데
              동의해요.
            </span>
          </label>
          {!!(draft.birthDate || draft.birthTime) && (
            <label className="checkbox-row consent">
              <input
                type="checkbox"
                checked={birthConsent}
                onChange={(event) => setBirthConsent(event.target.checked)}
              />
              <span>
                사주 분석 시 출생 정보를 SAZU에 제공하는 데 동의해요. 이름은
                보내지 않아요.
              </span>
            </label>
          )}
          <button
            className="primary-button"
            disabled={
              !supportsStoredName(draft) ||
              !consent ||
              (!!(draft.birthDate || draft.birthTime) && !birthConsent) ||
              busy
            }
            onClick={() => {
              void save();
            }}
          >
            {busy ? "입력 내용을 저장하고 있어요…" : "입력 내용 보관하기"}
            <span>→</span>
          </button>
          <a className="account-back" href="/">
            ← 입력 내용 수정하기
          </a>
        </>
      ) : (
        <>
          <p role="status">
            입력 내용을 내 계정에 보관했어요. 결제 준비가 끝나면 이어서 상세
            분석을 진행할 수 있어요.
          </p>
          <a className="primary-button" href="/my/readings">
            내 풀이함으로 이동 →
          </a>
          <DeleteRequest
            id={draft.id}
            onDeleted={() => {
              clearDraft();
              window.location.assign("/my/readings");
            }}
          />
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

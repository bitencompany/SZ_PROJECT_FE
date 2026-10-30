"use client";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import {
  readingListSchema,
  savedRequestSchema,
  type ReadingListItem,
  type SavedRequest,
} from "@/lib/member-contract";
import { clientApi, ApiFailure } from "@/lib/client-api";
import { DeleteRequest } from "./delete-request";
export function ReadingLibrary() {
  const [readings, setReadings] = useState<ReadingListItem[]>([]);
  const [recent, setRecent] = useState<SavedRequest[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const pageRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setReadings([]);
    setRecent([]);
    setNextPage(null);
    void Promise.all([
      clientApi("/api/readings?page=0", { signal: controller.signal }),
      clientApi("/api/reading-requests/recent", { signal: controller.signal }),
    ])
      .then(([reports, requests]) => {
        if (controller.signal.aborted) return;
        const page = readingListSchema.parse(reports);
        setReadings([
          ...new Map(page.data.map((item) => [item.id, item])).values(),
        ]);
        setNextPage(page.nextPage);
        setRecent(
          z
            .object({ data: z.array(savedRequestSchema.shape.data).max(10) })
            .parse(requests).data,
        );
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiFailure && cause.status === 401) {
          window.location.assign("/login?next=%2Fmy%2Freadings");
          return;
        }
        setError(
          cause instanceof ApiFailure
            ? cause.message
            : "내 풀이함을 불러오지 못했어요.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    const visibility = () => {
      controller.abort();
      pageRequest.current?.abort();
      setReadings([]);
      setRecent([]);
      setNextPage(null);
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      controller.abort();
      pageRequest.current?.abort();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh]);
  async function more() {
    if (nextPage === null || busy) return;
    const controller = new AbortController();
    pageRequest.current = controller;
    setBusy(true);
    setError("");
    try {
      const result = readingListSchema.parse(
        await clientApi(`/api/readings?page=${nextPage}`, {
          signal: controller.signal,
        }),
      );
      if (controller.signal.aborted) return;
      setReadings((items) => [
        ...new Map(
          [...items, ...result.data].map((item) => [item.id, item]),
        ).values(),
      ]);
      setNextPage(result.nextPage);
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (
        cause instanceof ApiFailure &&
        (cause.status === 401 || cause.status === 404)
      ) {
        setReadings([]);
        setRecent([]);
      }
      if (cause instanceof ApiFailure && cause.status === 401)
        window.location.assign("/login?next=%2Fmy%2Freadings");
      setError(
        cause instanceof ApiFailure
          ? cause.message
          : "목록을 더 불러오지 못했어요.",
      );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p className="error-message" role="alert">
          {error}{" "}
          <button
            className="text-button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            다시 확인
          </button>
        </p>
      )}
      <h2>구매한 상세 풀이</h2>
      {readings.length ? (
        <ul className="reading-list">
          {readings.map((item) => (
            <li key={item.id}>
              <a href={`/my/readings/${item.id}`}>
                <strong>
                  {item.title || `${item.subjectName}님의 상세 풀이`}
                </strong>
                <span>결과 보기 →</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        !busy &&
        !error && (
          <p className="account-notice">
            아직 구매한 풀이가 없어요. 상세 풀이 결제는 준비 중입니다.
          </p>
        )
      )}
      {nextPage !== null && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => {
            void more();
          }}
        >
          더 불러오기
        </button>
      )}
      {busy && <p role="status">내 풀이함을 불러오고 있어요…</p>}
      <h2>최근 보관한 입력</h2>
      <p className="field-help">
        이 브라우저에서 최근 저장한 최대 10건을 표시해요. 미구매 입력은 저장 후
        30일이 지나면 정리 대상이 됩니다.
      </p>
      <ul className="reading-list">
        {recent.map((item) => (
          <li key={item.requestId}>
            <a href={`/checkout?request=${item.requestId}`}>
              <strong>{item.input.name}</strong>
              <span>입력 내용 보기 →</span>
            </a>
            <DeleteRequest
              id={item.requestId}
              onDeleted={() =>
                setRecent((items) =>
                  items.filter((entry) => entry.requestId !== item.requestId),
                )
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}

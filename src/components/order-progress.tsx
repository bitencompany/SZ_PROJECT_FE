"use client";
import { useEffect, useState } from "react";
import { orderSchema, type OrderState } from "@/lib/member-contract";
import { clientApi, ApiFailure } from "@/lib/client-api";
import {
  MAX_ORDER_POLLS,
  shouldPollOrder,
  readyReading,
  orderMessage,
} from "@/lib/order-state";
export function OrderProgress({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [paused, setPaused] = useState(false);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    setOrder(null);
    setError("");
    setPaused(false);
    async function poll() {
      if (controller.signal.aborted || document.visibilityState !== "visible")
        return;
      try {
        const result = orderSchema.parse(
          await clientApi(`/api/orders/${id}`, {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(25000),
            ]),
          }),
        ).data;
        if (controller.signal.aborted) return;
        setOrder(result);
        const reading = readyReading(result);
        if (reading) {
          window.location.replace(`/my/readings/${reading}`);
          return;
        }
        if (shouldPollOrder(result)) {
          if (++polls < MAX_ORDER_POLLS)
            timer = setTimeout(() => {
              void poll();
            }, 3000);
          else setPaused(true);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        setOrder(null);
        if (cause instanceof ApiFailure && cause.status === 401) {
          window.location.assign(
            `/login?next=${encodeURIComponent(`/my/orders/${id}`)}`,
          );
          return;
        }
        setError(
          cause instanceof ApiFailure
            ? cause.message
            : "주문 상태를 확인하지 못했어요.",
        );
      }
    }
    void poll();
    const visibility = () => {
      controller.abort();
      clearTimeout(timer);
      setOrder(null);
      if (document.visibilityState === "visible")
        setRefresh((value) => value + 1);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [id, refresh]);
  async function retry() {
    if (retrying) return;
    setRetrying(true);
    setError("");
    try {
      await clientApi(`/api/orders/${id}/retry`, { method: "POST" });
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (cause instanceof ApiFailure && [401, 403, 404].includes(cause.status))
        setOrder(null);
      setError(
        cause instanceof ApiFailure ? cause.message : "다시 요청하지 못했어요.",
      );
    } finally {
      setRetrying(false);
    }
  }
  return (
    <>
      <h1>상세 풀이 준비</h1>
      {order && <p role="status">{orderMessage(order)}</p>}
      {!order && !error && <p role="status">주문 상태를 확인하고 있어요…</p>}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {paused && <p>자동 확인을 잠시 멈췄어요. 분석은 서버에서 계속됩니다.</p>}
      {order?.status === "paid" && order.generationStatus === "failed" && (
        <button
          className="primary-button"
          disabled={retrying}
          onClick={() => {
            void retry();
          }}
        >
          {retrying ? "요청 중…" : "분석 다시 요청하기"}
        </button>
      )}
      {(error || paused) && (
        <button
          className="secondary-button"
          onClick={() => setRefresh((value) => value + 1)}
        >
          상태 다시 확인
        </button>
      )}
      <a className="account-back" href="/my/readings">
        ← 내 풀이함
      </a>
    </>
  );
}

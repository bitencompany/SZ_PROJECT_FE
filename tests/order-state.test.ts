import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldPollOrder,
  readyReading,
  MAX_ORDER_POLLS,
} from "../src/lib/order-state";
import type { OrderState } from "../src/lib/member-contract";
const base: OrderState = {
  orderId: "11111111-1111-4111-8111-111111111111",
  status: "paid",
  amount: 1000,
  currency: "KRW",
  generationStatus: "queued",
  readingId: null,
};
test("paid의 queued/processing만 폴링하고 실패/대기/환불은 멈춘다", () => {
  assert.equal(shouldPollOrder(base), true);
  assert.equal(
    shouldPollOrder({ ...base, generationStatus: "processing" }),
    true,
  );
  for (const status of ["pending", "cancelled", "refunded", "failed"] as const)
    assert.equal(shouldPollOrder({ ...base, status }), false);
  for (const generationStatus of [null, "failed", "ready"] as const)
    assert.equal(shouldPollOrder({ ...base, generationStatus }), false);
  assert.equal(MAX_ORDER_POLLS, 20);
});
test("환불/취소 주문은 오래된 ready/readingId가 있어도 상세로 이동하지 않는다", () => {
  const ready = {
    ...base,
    generationStatus: "ready" as const,
    readingId: "22222222-2222-4222-8222-222222222222",
  };
  assert.equal(readyReading(ready), ready.readingId);
  assert.equal(readyReading({ ...ready, status: "refunded" }), null);
  assert.equal(readyReading({ ...ready, status: "cancelled" }), null);
});

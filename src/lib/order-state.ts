import type { OrderState } from "./member-contract";
export const MAX_ORDER_POLLS = 20;
export function shouldPollOrder(order: OrderState): boolean {
  return (
    order.status === "paid" &&
    (order.generationStatus === "queued" ||
      order.generationStatus === "processing")
  );
}
export function readyReading(order: OrderState): string | null {
  return order.status === "paid" && order.generationStatus === "ready"
    ? order.readingId
    : null;
}
export function orderMessage(order: OrderState): string {
  if (order.status === "refunded")
    return "환불된 주문이에요. 상세 풀이를 열 수 없습니다.";
  if (order.status === "cancelled") return "취소된 주문이에요.";
  if (order.status === "failed") return "결제가 완료되지 않았어요.";
  if (order.status === "pending")
    return "결제 대기 상태예요. 현재 결제 기능은 준비 중입니다.";
  if (order.generationStatus === "failed")
    return "분석 생성에 실패했어요. 추가 결제 없이 다시 요청할 수 있어요.";
  if (order.generationStatus === "queued")
    return "입력하신 내용으로 분석을 준비하고 있어요.";
  if (order.generationStatus === "processing")
    return "상세 풀이를 작성하고 있어요.";
  if (order.generationStatus === "ready") return "상세 풀이가 준비됐어요.";
  return "분석 준비 상태를 확인하고 있어요.";
}

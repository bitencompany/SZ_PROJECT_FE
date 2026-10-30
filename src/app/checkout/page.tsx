import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { CheckoutReview } from "@/components/checkout-review";
import { authenticatedSession } from "@/lib/auth/session";
import { backendRequest, BackendError } from "@/lib/backend";
import { savedRequestSchema } from "@/lib/member-contract";
import { draftSchema, type ReadingDraft } from "@/lib/reading-draft";

export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}): Promise<ReactNode> {
  const { request } = await searchParams;
  if (request && !/^[0-9a-f-]{36}$/.test(request)) notFound();
  const auth = await currentUser();
  if (auth.status !== "unavailable" && !auth.user)
    redirect(
      `/login?next=${encodeURIComponent(request ? `/checkout?request=${request}` : "/checkout")}`,
    );
  let initialDraft: ReadingDraft | undefined;
  let failed = auth.status === "unavailable";
  let missing = false;
  if (request && auth.user) {
    try {
      const { accessToken } = await authenticatedSession();
      const { data } = savedRequestSchema.parse(
        await backendRequest(`/api/reading-requests/${request}`, undefined, {
          accessToken,
        }),
      );
      initialDraft = draftSchema.parse({
        version: 1,
        id: request,
        savedAt: Date.now(),
        name: data.input.name,
        ids: data.input.hanjaIds,
        birthDate: data.input.birth?.birthDate ?? "",
        birthTime: data.input.birth?.birthTime ?? "",
        unknownTime: data.input.birth?.birthTime === null,
        gender: data.input.birth?.gender ?? "female",
        birthCity: data.input.birth?.birthCity ?? "서울",
        step: 2,
      });
    } catch (error) {
      if (error instanceof BackendError && error.status === 404) missing = true;
      else failed = true;
    }
  }
  if (missing) notFound();
  return (
    <main className="account-page">
      <a className="brand" href="/">
        <span className="brand-mark">결</span>이름결
      </a>
      <section className="account-card account-card-wide">
        {failed ? (
          <>
            <h1>분석 정보를 확인하지 못했어요.</h1>
            <p>잠시 후 다시 시도해 주세요.</p>
            <a
              className="account-back"
              href={request ? `/checkout?request=${request}` : "/checkout"}
            >
              다시 확인하기 →
            </a>
          </>
        ) : (
          <CheckoutReview initialDraft={initialDraft} />
        )}
      </section>
    </main>
  );
}

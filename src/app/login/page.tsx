import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { safeReturnPath } from "@/lib/auth/policy";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const auth = await currentUser();
  if (auth.user && params.error !== "logout") redirect(next);
  const message =
    params.error === "logout"
      ? "로그아웃하지 못했어요. 잠시 후 다시 시도해 주세요."
      : params.error === "cancelled"
        ? "카카오 로그인을 취소했어요. 입력 내용은 같은 탭에서 30분 동안 임시 보관됩니다."
        : params.error
          ? "로그인이 완료되지 않았어요. 다시 시도하거나 무료 체험을 계속할 수 있어요."
          : auth.status === "unavailable"
            ? "로그인 연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요."
            : null;
  return (
    <main className="account-page">
      <a className="brand" href="/">
        <span className="brand-mark">결</span>이름결
      </a>
      <section className="account-card">
        <span className="section-index">YOUR OWN COLLECTION</span>
        <h1>
          나의 이야기를,
          <br />
          언제든 다시 만나세요.
        </h1>
        <p>
          카카오 계정으로 간편하게 시작하세요.
          <br />
          구매한 풀이는 내 풀이함에서 다시 볼 수 있어요.
        </p>
        <form
          action={params.error === "logout" ? "/auth/logout" : "/auth/kakao"}
          method="post"
        >
          <input type="hidden" name="next" value={next} />
          <button
            className="kakao-button"
            disabled={auth.status === "unconfigured"}
          >
            {params.error === "logout"
              ? "로그아웃 다시 시도"
              : "카카오로 시작하기"}
          </button>
        </form>
        {auth.status === "unconfigured" && (
          <p className="account-notice" role="status">
            카카오 로그인을 준비 중이에요. 지금은 로그인 없이 무료 이름 분석을
            이용할 수 있어요.
          </p>
        )}
        {message && (
          <p className="error-message" role="alert">
            {message}
          </p>
        )}
        <a className="account-back" href="/">
          ← 무료 이름 분석 계속하기
        </a>
        <p className="field-help">
          이름 분석은 로그인 없이 이용할 수 있어요.
          <br />
          상세 풀이 구매 기능은 준비 중입니다.
        </p>
      </section>
    </main>
  );
}

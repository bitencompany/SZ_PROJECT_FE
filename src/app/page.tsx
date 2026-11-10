import { ReadingApp } from "@/components/reading-app";
import { currentUser } from "@/lib/auth/server";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_code?: string }>;
}): Promise<ReactNode> {
  // Supabase는 state가 만료되면 지정 콜백 대신 Site URL로 돌려보냅니다.
  // 공급자 오류 원문을 노출하지 않고 기존 콜백에서 복귀 쿠키를 정리합니다.
  const params = await searchParams;
  if (params.error) {
    const error =
      params.error === "access_denied"
        ? "access_denied"
        : ["bad_oauth_state", "flow_state_expired", "flow_state_not_found"].includes(
              params.error_code ?? "",
            )
          ? "login_expired"
          : "oauth_error";
    redirect(`/auth/callback?error=${error}`);
  }
  const auth = await currentUser();
  return (
    <ReadingApp
      signedIn={!!auth.user}
      backendNameEnabled={process.env.BACKEND_NAME_ENABLED === "true"}
    />
  );
}

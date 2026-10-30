import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { ReadingLibrary } from "@/components/reading-library";
export const dynamic = "force-dynamic";
export default async function MyReadings() {
  const auth = await currentUser();
  if (auth.status !== "unavailable" && !auth.user)
    redirect("/login?next=%2Fmy%2Freadings");
  return (
    <main className="account-page">
      <a className="brand" href="/">
        <span className="brand-mark">결</span>이름결
      </a>
      <section className="account-card account-card-wide">
        <span className="section-index">MY COLLECTION</span>
        <h1>내 풀이함</h1>
        <ReadingLibrary />
        <a className="primary-button" href="/">
          새로운 이름 분석하기 <span>→</span>
        </a>
        <form action="/auth/logout" method="post">
          <button className="account-back text-button">로그아웃</button>
        </form>
      </section>
    </main>
  );
}

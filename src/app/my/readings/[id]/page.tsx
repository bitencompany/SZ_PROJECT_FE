import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { ReadingDetail } from "@/components/reading-detail";
export default async function Reading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await currentUser();
  if (auth.status !== "unavailable" && !auth.user)
    redirect(`/login?next=${encodeURIComponent(`/my/readings/${id}`)}`);
  return (
    <main className="account-page">
      <a className="brand" href="/my/readings">
        ← 내 풀이함
      </a>
      <article className="account-card account-card-wide">
        <ReadingDetail id={id} />
      </article>
    </main>
  );
}

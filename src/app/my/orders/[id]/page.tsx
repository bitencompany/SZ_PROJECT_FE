import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { OrderProgress } from "@/components/order-progress";
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await currentUser();
  if (auth.status !== "unavailable" && !auth.user)
    redirect(`/login?next=${encodeURIComponent(`/my/orders/${id}`)}`);
  return (
    <main className="account-page">
      <a className="brand" href="/">
        이름결
      </a>
      <section className="account-card account-card-wide">
        <OrderProgress id={id} />
      </section>
    </main>
  );
}

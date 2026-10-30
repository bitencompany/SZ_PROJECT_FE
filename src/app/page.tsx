import { ReadingApp } from "@/components/reading-app";
import { currentUser } from "@/lib/auth/server";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function Home(): Promise<ReactNode> {
  const auth = await currentUser();
  return <ReadingApp signedIn={!!auth.user} />;
}

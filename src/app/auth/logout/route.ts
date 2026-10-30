import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
import { isSameOriginPost, siteOrigin } from "@/lib/auth/policy";

export async function POST(request: Request): Promise<Response> {
  const origin = siteOrigin();
  if (!origin || !isSameOriginPost(request, origin))
    return Response.json(
      { error: "페이지를 새로고침한 뒤 다시 시도해 주세요." },
      { status: 403 },
    );
  try {
    const client = await createAuthClient(true);
    if (client) {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    }
    const response = NextResponse.redirect(origin, 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=logout`, 303);
  }
}

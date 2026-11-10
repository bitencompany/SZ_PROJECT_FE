// 로그인 전 HTTP 경계만 검증합니다. 실계정 로그인·저장 E2E를 대신하지 않습니다.
// 응답 원문, 인증 URL, 쿠키와 비밀값은 출력하지 않습니다.
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const origin = process.env.APP_URL ?? "http://127.0.0.1:3000";
function check(condition, label) {
  if (!condition) throw new Error(label);
}
async function request(path, init = {}) {
  return fetch(new URL(path, origin), {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
}
async function run(label, action) {
  try {
    await action();
    console.log(`PASS ${label}`);
  } catch {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  }
}
check(
  new URL(origin).hostname === "127.0.0.1",
  "APP_URL must use local 127.0.0.1",
);

await run("로그인 화면과 결제 준비 중 안내", async () => {
  const response = await request("/login");
  check(response.status === 200, "login status");
  const html = await response.text();
  check(html.includes("카카오로 시작하기"), "login button");
  check(html.includes("상세 풀이 구매 기능은 준비 중"), "payment disabled");
});

const id = "11111111-1111-4111-8111-111111111111";
await run("비회원 보호 화면 및 회원 API 차단", async () => {
  for (const path of [
    "/checkout",
    "/my/readings",
    `/my/readings/${id}`,
    `/my/orders/${id}`,
  ]) {
    const response = await request(path);
    const location = response.headers.get("location");
    check(response.status === 307 && location, "protected redirect");
    const destination = new URL(location, origin);
    check(destination.pathname === "/login", "login path");
    check(destination.searchParams.get("next") === path, "return path");
  }
  for (const path of [
    "/api/readings",
    `/api/reading-requests/${id}`,
    `/api/orders/${id}`,
  ]) {
    const response = await request(path);
    check(response.status === 401, "member status");
    check(
      response.headers.get("cache-control")?.includes("no-store"),
      "no cache",
    );
  }
});

await run("타 출처 로그인·로그아웃·입력 저장 차단", async () => {
  for (const path of ["/auth/kakao", "/auth/logout", "/api/reading-requests"]) {
    const response = await request(path, {
      method: "POST",
      headers: { Origin: "https://invalid.example" },
    });
    check(response.status === 403, "origin rejected");
  }
});

await run("OAuth 시작·PKCE·HttpOnly 및 취소 후 복귀", async () => {
  const next = `/checkout?request=${id}`;
  const response = await request("/auth/kakao", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ next }),
  });
  check(response.status === 303, "start redirect");
  const location = new URL(response.headers.get("location"));
  check(
    location.origin === new URL(process.env.SUPABASE_URL).origin,
    "project",
  );
  check(location.searchParams.get("provider") === "kakao", "provider");
  check(
    location.searchParams.get("redirect_to") === `${origin}/auth/callback`,
    "callback",
  );
  check(
    location.searchParams.get("code_challenge_method")?.toLowerCase() ===
      "s256",
    "pkce",
  );
  const scope = location.searchParams.get("scope") ?? "";
  check(
    scope.includes("profile_nickname") &&
      scope.includes("profile_image") &&
      !scope.includes("email"),
    "optional scopes",
  );
  // Supabase가 실제 Kakao로 전달하는 권한까지 확인합니다.
  const provider = await fetch(location, {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  check(provider.status === 302, "provider redirect");
  const kakao = new URL(provider.headers.get("location"));
  check(
    kakao.origin === "https://kauth.kakao.com" &&
      kakao.pathname === "/oauth/authorize",
    "kakao destination",
  );
  const actualScopes = (kakao.searchParams.get("scope") ?? "")
    .split(/[ ,]+/).filter(Boolean).sort();
  check(
    JSON.stringify(actualScopes) ===
      JSON.stringify(["profile_image", "profile_nickname"]),
    "actual kakao scopes exclude email",
  );
  check(!!kakao.searchParams.get("state"), "provider state");
  check(
    kakao.searchParams.get("redirect_uri") ===
      `${new URL(process.env.SUPABASE_URL).origin}/auth/v1/callback`,
    "provider callback",
  );
  const cookies = response.headers.getSetCookie();
  check(
    cookies.some((value) => value.includes("code-verifier=")),
    "verifier cookie",
  );
  check(
    cookies.every(
      (value) => /httponly/i.test(value) && /samesite=lax/i.test(value),
    ),
    "cookie policy",
  );
  const callback = await request("/auth/callback?error=access_denied", {
    headers: { Cookie: cookies.map((value) => value.split(";")[0]).join("; ") },
  });
  check(callback.status === 303, "cancel redirect");
  const destination = new URL(callback.headers.get("location"));
  check(
    destination.searchParams.get("error") === "cancelled",
    "cancel message",
  );
  check(destination.searchParams.get("next") === next, "cancel return path");
  check(callback.headers.get("referrer-policy") === "no-referrer", "referrer");
});

await run("코드 없는 콜백은 로그인 실패 안내로 복귀", async () => {
  const response = await request("/auth/callback");
  check(response.status === 303, "callback redirect");
  const destination = new URL(response.headers.get("location"));
  check(
    destination.pathname === "/login" &&
      destination.searchParams.get("error") === "callback",
    "callback error",
  );
});

await run("Site URL로 돌아온 OAuth 만료·취소 오류 정리", async () => {
  for (const [query, message] of [
    ["error=invalid_request&error_code=bad_oauth_state&error_description=PRIVATE_PROVIDER_ERROR", "expired"],
    ["error=access_denied&error_description=PRIVATE_PROVIDER_ERROR", "cancelled"],
    ["error=server_error&error_description=PRIVATE_PROVIDER_ERROR", "callback"],
  ]) {
    const response = await request(`/?${query}`);
    check(response.status === 307, "site error redirect");
    const callback = new URL(response.headers.get("location"), origin);
    check(callback.origin === origin && callback.pathname === "/auth/callback", "safe callback");
    check(!callback.href.includes("PRIVATE_PROVIDER_ERROR"), "provider details removed");
    const completed = await request(callback.pathname + callback.search);
    const login = new URL(completed.headers.get("location"), origin);
    check(completed.status === 303 && login.pathname === "/login", "login recovery");
    check(login.searchParams.get("error") === message, "recovery message");
    check(completed.headers.get("referrer-policy") === "no-referrer", "recovery referrer");
  }
});

await run("로컬 BE 공유 비밀·한자 v2·필획 계산 연결", async () => {
  const backend = new URL(process.env.BACKEND_API_URL);
  check(backend.hostname === "127.0.0.1", "local backend only");
  const url = new URL("/api/hanja?reading=김", backend);
  const blocked = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  check(blocked.status === 403, "BFF required");
  const authorized = await fetch(url, {
    headers: { "X-BFF-Secret": process.env.BFF_SHARED_SECRET },
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  const body = await authorized.json();
  check(
    authorized.status === 200 &&
      body.catalog?.status === "preview" &&
      Array.isArray(body.data) &&
      body.catalog.version.startsWith("hanja-v2-") &&
      body.data.some((h) =>
        h.character === "金" && h.reading === "김" &&
        h.strokes === 8 && h.dictionaryStrokes === 8 &&
        h.strokeBasis === "written"),
    "v2 catalog covers surname 김 with written strokes",
  );
  if (process.env.BACKEND_NAME_ENABLED === "true") {
    const gang = await request("/api/hanja?reading=강&q=성%20강");
    const gangResult = await gang.json();
    check(gang.status === 200 && gangResult.data.some((h) => h.character === "姜" && h.dictionaryStrokes === 9 && h.strokes === 9), "강 성씨 검색");
    const fe = await request("/api/hanja?reading=윤&q=潤");
    const lookup = await fe.json();
    check(
      fe.status === 200 && lookup.catalog?.status === "preview",
      "FE catalog",
    );
    check(
      lookup.data.length === 1 && lookup.data[0].id === "jmd-6f64-c724",
      "FE filtered entry",
    );
    check(lookup.data[0].strokeReview === "unreviewed", "review state");
    const analysis = await request("/api/name", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "이서윤",
        nameMode: "hanja",
        surnameLength: 1,
        hanjaIds: ["jmd-674e-c774", "jmd-66f8-c11c", "jmd-6f64-c724"],
      }),
    });
    const result = await analysis.json();
    check(
      analysis.status === 200 && result.catalog.status === "preview",
      "FE analysis",
    );
    check(
      JSON.stringify(result.data.grids.map((grid) => grid.total)) ===
        "[25,17,22,32]",
      "grid totals",
    );
  }
});

if (process.env.PREVIEW_IP_SOURCE === "local") {
  await run("FE→BE→SAZU 무료 샘플·서명 쿠키·캐시 연결", async () => {
    const input = {
      birthDate: "1998-05-19",
      birthTime: "10:00",
      gender: "male",
      birthCity: "서울",
      consent: true,
    };
    const first = await request("/api/sazu", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = (await first.json()).data;
    check(first.status === 200 && result?.sample === true, "sample response");
    check(
      result.pillars.length === 4 && result.elements.length === 5,
      "sample fields",
    );
    check(
      result.pillars.every((pillar) => pillar.sky && pillar.earth && pillar.sippiSeong && pillar.earthSippiSeong && pillar.jiJangGan),
      "eight characters and pillar annotations",
    );
    check(
      result.providerData?.topics.join(",") === "manse,life" &&
        Object.keys(result.providerData.modules).length === 9 &&
        result.details?.wongukInteraction?.relations.length > 0 &&
        result.details?.decadeFortune?.list.length > 0 &&
        result.details?.yongsin && result.details?.gyeokguk,
      "full natal and life modules",
    );
    check(
      Date.parse(result.expiresAt) > Date.now() && result.previewId,
      "preview metadata",
    );
    const cookies = first.headers.getSetCookie();
    check(
      cookies.some(
        (cookie) =>
          cookie.startsWith("ireum-preview-visitor=") &&
          /httponly/i.test(cookie),
      ),
      "signed visitor cookie",
    );
    const second = await request("/api/sazu", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
      },
      body: JSON.stringify(input),
    });
    const cached = (await second.json()).data;
    check(
      second.status === 200 &&
        cached.previewId === result.previewId &&
        cached.expiresAt === result.expiresAt &&
        JSON.stringify(cached.providerData) === JSON.stringify(result.providerData),
      "cached preview",
    );
  });
}

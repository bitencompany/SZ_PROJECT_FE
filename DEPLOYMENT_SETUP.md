# Vercel 연결 설정

2026-11-10. INHA Chrome의 `ojackgyo-project` 계정에 FE와 BE가 각각 배포되었습니다. 사용자가 환경변수를 직접 설정하기로 했으므로 로컬 비밀값을 Vercel에 전송하지 않았습니다.

- 프론트: https://sz-project-fe.vercel.app
- 백엔드: https://sz-project-be.vercel.app
- [FE 환경변수 설정](https://vercel.com/ojackgyo-project/sz-project-fe/settings/environment-variables)
- [BE 환경변수 설정](https://vercel.com/ojackgyo-project/sz-project-be/settings/environment-variables)

## 1. 프론트 환경변수

`sz-project-fe` → Settings → Environment Variables에서 **Production**에 설정합니다. 비밀값은 `SZ_PROJECT_FE/.env.local`에서 직접 확인합니다. 기존 로컬 파일의 주소를 운영 주소로 바꾸어 저장하고 로컬 파일은 그대로 둡니다.

| 이름 | 운영 값 |
| --- | --- |
| `APP_URL` | `https://sz-project-fe.vercel.app` |
| `BACKEND_API_URL` | `https://sz-project-be.vercel.app` |
| `SUPABASE_URL` | 기존 로컬 FE와 같은 프로젝트 URL |
| `SUPABASE_PUBLISHABLE_KEY` | 기존 로컬 FE 값 |
| `BFF_SHARED_SECRET` | 기존 로컬 FE 값. **BE에도 동일한 값** |
| `BACKEND_NAME_ENABLED` | `true` |
| `PREVIEW_IP_SOURCE` | `vercel` |

`DATABASE_URL`, `SAZU_API_KEY`, `OPENAI_API_KEY`, `INPUT_HASH_SECRET`, `WORKER_SECRET`, `CRON_SECRET`은 FE에 넣지 않습니다. 비밀 변수에 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

## 2. 백엔드 환경변수

`sz-project-be` → Settings → Environment Variables → **Production**에 설정합니다. 비밀값은 `SZ_PROJECT_BE/.env.local`에서 직접 확인합니다.

| 이름 | 운영 값 |
| --- | --- |
| `SUPABASE_URL` | FE와 같은 프로젝트 URL |
| `DATABASE_URL` | 기존 로컬 BE의 TLS DB 연결값 |
| `BFF_SHARED_SECRET` | FE와 동일한 값 |
| `INPUT_HASH_SECRET` | 기존 로컬 BE 값 |
| `WORKER_SECRET` | 기존 로컬 BE 값 |
| `CRON_SECRET` | 기존 로컬 BE 값 |
| `SAZU_API_KEY` | 기존 로컬 BE 값. 현재 FREE 키는 공식 샘플 전용 |
| `PREVIEW_ENABLED` | `true` |

`OPENAI_API_KEY`와 검증한 `OPENAI_MODEL`은 AI 풀이를 개통할 때 추가합니다. 현재 키·모델은 미설정이며 결제도 비활성입니다. SAZU 개인 분석용 유료 키, PG 계약·상품·환불 설정은 별도 준비가 필요합니다.

운영 키를 Preview 환경에 함께 저장하지 않습니다. 미리보기 배포를 별도로 연결할 때는 테스트 환경과 리다이렉트 주소를 따로 준비합니다.

## 3. 카카오 로그인 주소

Supabase → Authentication → URL Configuration:

- Site URL: `https://sz-project-fe.vercel.app`
- Redirect URLs에 추가: `https://sz-project-fe.vercel.app/auth/callback`
- 로컬 개발을 유지한다면 기존 `http://127.0.0.1:3000/auth/callback`도 남깁니다.

Supabase Kakao 공급자의 **Allow users without an email**은 켜둡니다. Kakao Developers에 등록하는 OAuth Redirect URI는 기존 Supabase 주소(`https://프로젝트.supabase.co/auth/v1/callback`)이며 FE 콜백으로 바꾸지 않습니다. [인증 설정](./AUTH_SETUP.md)을 참고하세요.

## 4. 적용 순서와 확인

1. BE 환경변수를 저장하고 BE의 최신 main 배포를 **Redeploy**합니다.
2. FE 환경변수와 Supabase 운영 로그인 주소를 설정한 뒤 FE도 **Redeploy**합니다. 기존 배포는 환경변수 저장만으로 갱신되지 않습니다.
3. 운영 FE에서 한자 조회 → 공식 SAZU 샘플 → 카카오 로그인 → 이름 입력 저장 → 새로고침 → 내 풀이함 → 로그아웃 후 접근 차단을 확인합니다.

현재 배포 확인: FE 홈·로그인 HTTP 200, 비회원 풀이함 접근 307 로그인 복귀. 환경변수 미설정으로 회원 API는 503, 로그인 화면은 준비 중입니다. 로컬에서는 실제 계정 로그인·이름 입력 저장·재조회·로그아웃·재로그인이 검증되었습니다. **웹사이트 배포 완료와 운영 서비스 연결 완료는 다릅니다.**

BE health 주소는 https://sz-project-be.vercel.app/api/health 입니다. 생존 확인용이며 DB·SAZU·AI·결제 준비 완료를 의미하지 않습니다.

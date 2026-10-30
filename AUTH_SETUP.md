# 신규 카카오 로그인 설정

코드는 Supabase Auth를 통해 카카오 OAuth를 시작합니다. 브라우저에 인증 SDK·비밀 키를 두지 않고 FE 서버에서 PKCE 및 HttpOnly 쿠키를 처리합니다.

1. Supabase 프로젝트를 생성하고 Project URL과 publishable key를 `.env.local`의 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`에 입력합니다. service_role 키는 FE에 넣지 않습니다.
2. `APP_URL`을 실제 접속 주소와 일치시킵니다. 기본값은 `http://127.0.0.1:3000`이며 localhost와 127.0.0.1, 포트 차이를 혼용하지 않습니다. 운영은 HTTPS입니다.
3. Supabase Authentication의 URL Configuration에서 Site URL을 APP_URL로 설정하고 Redirect URL에 `APP_URL/auth/callback`을 정확히 등록합니다. 운영 도메인도 별도로 등록합니다.
4. 카카오 Developers에서 앱을 생성하고 카카오 로그인을 활성화합니다. REST API 키·활성화된 Client Secret은 Supabase의 Kakao provider에 입력합니다. FE 코드나 채팅에 붙이지 않습니다.
5. 카카오의 Redirect URI에는 **Supabase 대시보드에 표시된 OAuth callback URL**(`https://PROJECT.supabase.co/auth/v1/callback`)을 등록합니다. FE 콜백 주소와 다릅니다.
6. 카카오 동의항목은 닉네임·프로필 이미지에 맞추고, Supabase Kakao 설정의 **Allow users without an email**을 켭니다. FE는 `profile_nickname profile_image` scope를 사용하며 이메일을 식별키로 쓰지 않습니다. 화면에서는 닉네임·이미지를 표시하지 않습니다.
7. `BACKEND_OPERATIONS_SETUP_20261030.md`의 전체 BE 마이그레이션 순서로 DB를 설정합니다. 초기 FE SQL만 적용하지 않습니다. 두 번째 BE migration 이후 authenticated 직접 insert가 차단되므로 새 FE BFF와 함께 적용합니다. BE가 검증하는 Supabase JWT signing key는 ES256/RS256 JWKS여야 합니다.
8. FE와 BE에 동일한 `BFF_SHARED_SECRET`(최소 32바이트), FE `BACKEND_API_URL`을 설정합니다. 추가 미리보기 설정은 `FRONTEND_INTEGRATION_20261030.md`를 따릅니다.
9. 개발 서버를 재시작하고 무료 미리보기 → 상세 보기 → 카카오 로그인 → 입력 확인·저장 → 내 풀이함을 확인합니다. 취소 후 복귀와 로그아웃도 확인합니다.

계정·이용약관·개인정보 처리와 데이터 보관/삭제 정책, 실제 결제 연결은 운영 전 별도 준비가 필요합니다. 현재 로그인이 미설정이면 준비 중 화면을 표시하고 무료 이름 분석은 이용할 수 있습니다.

출처: [Supabase Kakao 로그인](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

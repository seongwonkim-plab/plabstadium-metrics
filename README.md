# 플랩 직영구장 지표

플랩풋볼 **직영사업 운영파트** 지표 대시보드. Plab Playground DB(매치·매출·매니저비)와 Google Sheets(회계 원장)를 결합해 지점·구장·기간별 매출/지출/영업이익·매치 세팅·진행률을 조회합니다.

- Next.js 16 (App Router · Server Components · Turbopack)
- React 19 · TypeScript · Tailwind v4
- Google Sheets API v4 · Plab Playground 데이터 게이트웨이

## 주요 화면

- **월간 대시보드** — 지점 합계 KPI, 지점별 표, 12개월 매출/지출/진행률 추이, 요일×시간대 진행률 히트맵
- **주간 대시보드** — 주 단위 진행률·세팅 현황
- **지점 상세** — 지점 단위 12개월 추이 + 손익 상세 + 구장별 히트맵
- **문서** — README, 작업 이력 (커밋마다 자동 갱신)
- **사이드바 하단 시스템 상태** — Plab API 실시간 헬스체크 (정상/오류)

## 로컬 실행

### 1. 환경변수 준비

`.env.example` 을 복사해서 `.env.local` 을 만듭니다.

```bash
cp .env.example .env.local
```

필수 값:
- `PLAB_API_URL` · `PLAB_API_KEY` — Plab 데이터 게이트웨이
- `GOOGLE_SHEETS_ID` — 회계 원장 시트 ID
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` — 서비스 계정 JSON 파일 경로 (예: `./.secrets/service-account.json`)
- `DASHBOARD_PASSWORD` — 로그인 비밀번호 (팀 공유용)
- `DASHBOARD_AUTH_SECRET` — 세션 쿠키 서명용 시크릿

`DASHBOARD_AUTH_SECRET` 생성:

```bash
openssl rand -hex 32
```

### 2. 의존성 설치 + 실행

```bash
npm install
npm run dev
```

기본 포트는 `3000`. `PORT=3001 npm run dev` 로 변경 가능.

첫 화면은 `/login` — `.env.local` 에 지정한 비밀번호로 접속합니다.

## Vercel 배포

### 1. GitHub 저장소 준비

이 프로젝트는 GitHub의 `seongwonkim-plab/plabstadium-metrics` 에 있습니다. Vercel 은 이 저장소를 import 해서 자동 배포합니다.

### 2. Vercel 프로젝트 생성

1. [vercel.com/new](https://vercel.com/new) 접속
2. `plabstadium-metrics` 저장소 Import
3. Framework: **Next.js** 로 자동 감지
4. **Environment Variables** 섹션에 아래 값을 추가

| 변수 | 설명 |
|---|---|
| `PLAB_API_URL` | `https://data-gateway.preview.plabfootball.com` |
| `PLAB_API_KEY` | Plab 데이터 게이트웨이 API 키 |
| `GOOGLE_SHEETS_ID` | 회계 원장 스프레드시트 ID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `.secrets/service-account.json` 파일 내용을 **통째로** 붙여넣기 (파일 경로 방식은 서버리스에서 동작 안 함) |
| `DASHBOARD_PASSWORD` | 팀 공유 로그인 비밀번호 |
| `DASHBOARD_AUTH_SECRET` | `openssl rand -hex 32` 로 생성한 시크릿 |

5. **Deploy** 클릭. 첫 배포에 1~2분 소요.

### 3. 배포 후 확인

- 배포 URL 접속 → `/login` 리다이렉트 → 비밀번호 입력 → 대시보드 진입
- 사이드바 하단 상태 표시기가 **초록**이면 API 연결 정상
- 배포 URL 은 `DASHBOARD_PASSWORD` 를 아는 팀원과만 공유

## 데이터 소스 규칙

### 소셜 매출 (`cash_history`)

옛날 데이터와 신 데이터 스키마가 다름:
- **신규 (2023+)**: `cash_type IN ('SOCIAL', 'REFUND_CASH')` + `order → match_apply` 조인
- **옛날 (~2022)**: `cash_type IN ('MATCH_PURCHASE', 'MATCH_CANCEL_%')` + `cash_history.match_apply_id` 직접 조인 (`order_id IS NULL` 로 배타)

### 대관 매출 (`stadium_product`)

`stadium_rental_monthly_settlement` 은 2026-06 이후만 채워지므로, 전 시기 정상 조회를 위해 `stadium_product WHERE product_type='RENTAL' AND product_status='SOLDOUT'` 을 사용.

### 매니저비 우선순위

1. DB 실지급 (`manager_settlement`, 2024-01~)
2. 시트 입력값 (`expenseManager`, 2020~2023 폴백)
3. `match_type_pay.price × RELEASE 건수` 추정 (최후 폴백)

### 감가상각

기본 **포함**. URL 쿼리 `?dep=0` 로 제외 가능. 토글 UI 는 "감가상각 제외" 라벨.

## 접근 통제

- 미들웨어 (`middleware.ts`) 기반 세션 쿠키 인증
- 로그인: `POST /api/login` (비밀번호 검증 → HMAC 토큰을 HttpOnly 쿠키로 발급)
- 로그아웃: 사이드바 하단 버튼 · 쿠키 즉시 만료
- `/api/health` 는 인증 미적용 (사이드바 상태 표시기용)

## 개발 규칙 요약

- 신규 매출/지출 계정 발견 시 `lib/accounts.ts` 매핑에 추가 (미매핑은 콘솔에 경고 + 대시보드 "기타" 항목 노출)
- 지점 매출 = **DB 소셜 + DB 대관 + 시트 (자판기·아카데미·기타)** — 시트의 "매출 합계" 컬럼은 사용하지 않음
- 지점 지출 = **시트 (임차료·인건비·수도광열·통신·소모품·보험·자판기 운영·AED·수수료·매출원가) + DB 매니저비 + [감가]**
- 표시 통화 단위는 `won()` (전액) / `wonShort()` (백/천 단위 축약) 로 통일

## 참고

- 데이터 갱신: `lib/plab.ts` 에 5분 프로세스 메모리 캐시 있음
- 통계 쿼리는 모두 `CONVERT_TZ(m.schedule,'+00:00','+09:00')` 로 KST 로 변환
- 진행률 = `RELEASE / (RELEASE + CANCEL)` (미래 시각 매치는 자동 제외)

# 작업 이력

플랩 직영구장 지표 대시보드의 변경 이력. 커밋마다 자동으로 항목이 추가됩니다.

## 2026-08-18

- **API 쿼리 배치 조회 (성능 6~10배)**
  - 문제: 페이지 로드마다 12개월 × 6쿼리 = 72개 Plab 쿼리 병렬 발사 → API 게이트웨이가 이 프로젝트만 반복 503 응답
  - 해결: `dbRevenueByBranchRange` / `matchStatsByBranchRange` 신설 · SQL `GROUP BY YEAR, MONTH` 로 12개월치를 5+1 쿼리로 통합
  - 월간·지점 페이지: 페이지당 ~73개 → **~7개 쿼리** (약 10배 감소)
  - 응답: 월간 3분+ → 2.4초 · 지점 1.4초
- **Vercel 배포 준비**
  - 미들웨어 자체 로그인 (`proxy.ts` · Next 16 컨벤션 · 이전 이름 middleware.ts)
    - Web Crypto HMAC-SHA256 서명 쿠키 (Edge 런타임 호환)
    - `DASHBOARD_PASSWORD` / `DASHBOARD_AUTH_SECRET` 두 env
    - `/login` 페이지 · `POST /api/login` · `POST /api/logout`
    - `/api/health` 는 인증 미적용 (사이드바 상태 표시기용)
  - `lib/sheets.ts` — Vercel용 `GOOGLE_SERVICE_ACCOUNT_JSON` env 폴백 추가 (파일 경로 → JSON 문자열)
  - 사이드바에 로그아웃 버튼 추가 (`AppShell` 클라이언트 래퍼로 /login 은 사이드바 숨김)
  - README 를 프로젝트 개요 + 로컬 실행 + Vercel 배포 가이드로 재작성
  - `.env.example` 갱신 (도메인·서비스계정 JSON·인증 env 항목 추가)

## 2026-08-13

- **지점 상세 페이지 확장**
  - 6개월 단순 막대 → **12개월 매출·지출 + 진행률 라인** 결합 차트 (월간 대시보드와 동일 스타일)
  - `TrendChart` 컴포넌트를 `app/components/TrendChart.tsx` 로 추출해 월간·지점 공용
  - 하단에 **구장별 요일 × 시간대 진행률 히트맵** 신설 (지점 내 각 구장별로 개별 히트맵 나열)
  - `lib/heatmap.ts` 에 `progressHeatmapByStadium(groupId, year, month)` 함수 추가
- **사이드바 하단 시스템 상태 표시기**
  - 초록 = API 정상 · 빨강 = API 오류 · 회색 = 확인 중
  - 30초마다 `/api/health` 폴링, Plab 게이트웨이에 `SELECT 1` 실시간 확인
  - hover 시 응답 시간·HTTP 상태·최근 확인 시각 툴팁
  - 배경: Plab 게이트웨이가 간헐적으로 503을 반환해 대시보드 전체가 빈 값으로 보일 때 원인 파악이 어려움 → 사용자가 즉시 서버측 문제인지 구별 가능
- **히트맵·문서 페이지 추가**
  - 월간 대시보드 하단에 **요일 × 시간대 진행률 히트맵** (영업 지점 합계, 07~23시 × 월~일)
  - 셀 상단 = 진행률 %, 하단 = 진행 매치 수 (취소 제외)
  - 색상: 빨강(낮음) → 회색(70%) → 초록(높음)
  - **문서 섹션 신설**: README, 작업 이력을 사이드바에서 조회
  - `react-markdown` + `remark-gfm` 기반 SSR 렌더
- **매출 공식 확장** (2020~2022 옛날 데이터 지원)
  - `cash_type` 확장: `MATCH_PURCHASE` (참가비), `MATCH_CANCEL_%` (수수료율별 환불)
  - `cash_history.match_apply_id` 직접 조인 경로 추가 (옛날엔 `order` 테이블 미사용)
  - 두 경로 배타 필터 (`order_id IS NULL`) 로 중복 합산 방지
- **매니저비 폴백 3단계**
  - DB 실지급 (`manager_settlement`, 2024+) > 시트 입력값 (2020~2023) > `match_type_pay` 기본가 추정
- **대관 매출 소스 교체**
  - `stadium_rental_monthly_settlement` (2026-06+만 존재) → `stadium_product` (`RENTAL` + `SOLDOUT`)
- **델타 라벨 방향 판정 수정**
  - 이전값 음수일 때 방향 오류 (예: 구미 -1.5M → +0.5M을 ▼로 표시) 수정
  - 방향은 `cur - prev` 부호, 크기는 `|ratio|`
- **대륭테크노타운 17차 지점 추가** (2026-08 신규 오픈, group_id 4087) → 영업 지점 10 → 11개
- **감가상각 토글 기본값 반전**: 기본 포함, 라벨 "감가상각 제외"
- **년도·월 분리 선택자** (2020~2026 지원 · 주간은 년도 + 그 해 전체 주)
- **Plab API 도메인 이전**: `vibe.techin.pe.kr` → `data-gateway.preview.plabfootball.com`
- **월간 대시보드 개선**
  - 세팅·진행·취소 3개 컬럼 병기 (이전: 세팅만)
  - 12개월 매출·지출 막대 + 진행률 라인 결합 차트 (SVG)
  - 평균 진행률 KPI에 전월 대비 델타 추가
  - "고정" → "운영비" 용어 변경

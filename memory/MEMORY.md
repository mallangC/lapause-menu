# Lapause Fleur - 프로젝트 메모리

## 프로젝트 개요
- 꽃집 'Lapause Fleur' 메뉴 관리 시스템
- Next.js 16 + Tailwind CSS v4 + Supabase
- 공개 메뉴 뷰어 + 관리자 CRUD

## 기술 스택
- Next.js 16.1.6, React 19.2.3
- Tailwind CSS v4 (@tailwindcss/postcss)
- Supabase (@supabase/supabase-js, @supabase/ssr)
- TypeScript, React Compiler (reactCompiler: true)

## 파일 구조
```
src/
├── app/
│   ├── globals.css          # 베이지 테마 (beige-*, gold-*)
│   ├── layout.tsx           # lang="ko", Lapause Fleur 메타데이터
│   ├── page.tsx             # Server Component, Supabase fetch
│   ├── middleware.ts        # 인증 보호 미들웨어
│   ├── admin/
│   │   ├── page.tsx         # 로그인 페이지
│   │   └── LoginForm.tsx    # Client Component 로그인 폼
│   └── admin/dashboard/
│       ├── page.tsx         # Server Component (인증 확인 + fetch)
│       ├── OperatorDashboardClient.tsx  # 현황/정산/검증 탭
│       ├── SettlementsTab.tsx           # 정산 관리 UI
│       └── VerificationTab.tsx         # 맞춤 주문 검증 관리 UI
├── components/
│   ├── main/
│   │   ├── MainLayout.tsx   # 필터 상태 + 비활성 타이머 (Client)
│   │   ├── FilterSidebar.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductCard.tsx
│   │   └── HeroImage.tsx    # public/hero.jpg 플레이스홀더
│   └── admin/
│       ├── ProductForm.tsx
│       └── ProductTable.tsx
├── lib/
│   ├── constants.ts         # PRODUCT_TYPES, FLOWER_COLORS 등
│   └── supabase/
│       ├── client.ts        # createBrowserClient
│       ├── server.ts        # createServerClient + cookies
│       └── middleware.ts    # 세션 갱신 + 리다이렉트 로직
└── types/index.ts           # Product, FilterState, ProductInput
```

## 핵심 패턴
- Supabase 클라이언트: client.ts (브라우저), server.ts (서버), middleware.ts (미들웨어)
- 미들웨어 보호: /admin/dashboard → 비인증시 /admin으로 리다이렉트
- 비활성 타이머: 필터 활성 시 mousemove/keydown 등 이벤트로 감지, 1분 후 자동 해제
- React Compiler 활성화: useMemo/useCallback 불필요

## Supabase 설정 필요
- .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 실제값으로 교체
- NTS_API_KEY: 공공데이터포털에서 발급 (국세청 사업자 상태조회)

## 실행 완료된 SQL 마이그레이션
- 20260404_add_plan_columns.sql
- 20260408_split_companies_table.sql
- 20260424_add_settlements.sql — settlements 테이블 + reservations.settlement_id
- 20260424_company_settings_verification.sql — business_verified_at, business_status, bank_account_image_url
- 20260424_private_storage.sql — private-documents 버킷 (비공개)
- 20260424_consult_apply.sql — consult_apply_status, consult_reject_reason

## 컬러 테마 (Tailwind v4 @theme)
- beige-50/100/200/300/400, gold-400/500/600, foreground: #2c2416
- 주 배경: beige-100 (#faf7f2)

## 피드백 파일
- memory/feedback_commit.md — 커밋/푸시는 사용자가 명시적으로 요청할 때만 실행 (임의로 하지 말 것)

## 기능 정리
- memory/project_features.md — 맞춤 주문 활성화 조건, 솔라피 연동, 예약 관리 등 현재 구현된 기능 상세

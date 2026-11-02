import type { Metadata } from "next";
import PreviewDashboardClient from "./_components/PreviewDashboardClient";

export const metadata: Metadata = { title: "사장님 화면 미리보기 | Flo.Aide", robots: { index: false } };

// 사장님 화면 미리보기 — 관리자 대시보드. 모든 데이터는 목업 (실제·데모 매장 데이터를 읽지 않는다)
export default function Page() {
  return <PreviewDashboardClient />;
}

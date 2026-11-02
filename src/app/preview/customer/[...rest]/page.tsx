import type { Metadata } from "next";
import PreviewComingSoon from "../../PreviewComingSoon";

export const metadata: Metadata = { title: "손님 화면 미리보기 | Flo.Aide", robots: { index: false } };

// 아직 만들지 않은 손님 화면(맞춤주문·장바구니·상품 상세 등) 자리
export default function Page() {
  return <PreviewComingSoon title="이 화면" />;
}

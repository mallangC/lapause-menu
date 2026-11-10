"use client";

import { useEffect, useRef, useState } from "react";
import StoreWelcomeClient from "@/app/[slug]/StoreWelcomeClient";
import type { StoreFooterProps } from "@/components/main/StoreFooter";
import type { RecProduct } from "@/app/[slug]/StoreWelcomeClient";
import type { SizeConfig } from "@/lib/sizeTiers";

// 손님 화면 미리보기 — 매장 첫 화면(대화형 상담). 실제 화면 컴포넌트를 목업 매장 값으로 그린다.
// · 주소가 /preview/customer 라서 메뉴판·맞춤주문 이동도 미리보기 안으로 이어진다
// · 찾아본 사진은 실제처럼 이 탭에만 보관하고, 미리보기라 어디에도 올리지 않는다
// · 푸터 링크는 이동하지 않고 안내만 띄운다 (메뉴판 미리보기와 같은 안내)

interface Props {
  logoNode: React.ReactNode;
  themeVars: Record<string, string>;
  photos: string[];
  sizeConfig: SizeConfig;
  productTypes: string[];
  products: RecProduct[];
  footer: Omit<StoreFooterProps, "onLinkClick">;
  /** 미리보기 메뉴판에서 '맞춤 상담'을 눌러 왔는지 */
  fromMenu?: boolean;
}

export default function PreviewStoreWelcome({ logoNode, themeVars, photos, sizeConfig, productTypes, products, footer, fromMenu = false }: Props) {
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const showLinkNotice = (label: string) => {
    setLinkNotice(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLinkNotice(null), 2500);
  };

  return (
    <>
      <StoreWelcomeClient
        slug="preview/customer"
        companyName="Brand Name"
        logoImage={null}
        logoNode={logoNode}
        themeVars={themeVars}
        consultEnabled
        photos={photos}
        sizeConfig={sizeConfig}
        fromMenu={fromMenu}
        productTypes={productTypes}
        products={products}
        footer={{ ...footer, onLinkClick: showLinkNotice }}
        // 아래 이동 바(< 처음 · 손님 홈)에 가리지 않게 모바일 대화 끝을 조금 더 위에
        mobileBottomGap={100}
      />
      {/* 푸터 링크 안내 토스트 — 이동 바(아래) 위에 */}
      {linkNotice && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[47] w-[calc(100%-32px)] max-w-sm px-4 py-3 rounded-2xl text-center text-[13px] leading-relaxed text-white shadow-xl"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)", background: "rgba(24,19,14,0.92)" }}
          role="status"
        >
          실제 매장 화면에서는 {linkNotice} 연결돼요.
          <br />
          <span className="text-white/60">미리보기라 이동하지 않아요.</span>
        </div>
      )}
    </>
  );
}

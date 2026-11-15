"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_TYPES_CHANGED } from "@/lib/productTypes";

export interface CategoryOrder {
  productTypes: string[];
  seasons: string[];
}

/**
 * 사장님이 메뉴 설정에서 정한 상품 유형·시즌 순서 (사장님 화면용)
 * 메뉴 설정에서 순서를 바꾸면 PRODUCT_TYPES_CHANGED 이벤트로 다시 불러온다.
 */
export function useCategoryOrder(companyId: string | null | undefined): CategoryOrder {
  const [order, setOrder] = useState<CategoryOrder>({ productTypes: [], seasons: [] });
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    const load = () =>
      supabase
        .from("company_settings")
        .select("product_type_order, season_order")
        .eq("company_id", companyId)
        .maybeSingle()
        .then(({ data }) =>
          setOrder({
            productTypes: (data?.product_type_order as string[] | null) ?? [],
            seasons: (data?.season_order as string[] | null) ?? [],
          }),
        );
    load();
    window.addEventListener(PRODUCT_TYPES_CHANGED, load);
    return () => window.removeEventListener(PRODUCT_TYPES_CHANGED, load);
  }, [companyId]);
  return order;
}

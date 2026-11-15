"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { storeProductTypes, PRODUCT_TYPES_CHANGED, type CategoryRow } from "@/lib/productTypes";
import { useCategoryOrder } from "@/hooks/useCategoryOrder";

export { PRODUCT_TYPES_CHANGED };

/**
 * 사장님 설정 화면용 매장 유형 목록 (손님에게 숨긴 유형도 포함)
 * 대시보드 탭은 한 번 열면 계속 살아 있으므로, 메뉴 설정에서 바뀌면 이벤트로 다시 불러온다.
 */
export function useStoreProductTypes(companyId: string, hiddenBuiltins: string[] | null | undefined): string[] {
  return useStoreProductTypeInfo(companyId, hiddenBuiltins).types;
}

/** 매장 유형 목록 + 손님에게 숨긴 유형 (설정 화면에서 '숨김' 표시용) */
export function useStoreProductTypeInfo(companyId: string, hiddenBuiltins: string[] | null | undefined): { types: string[]; hidden: string[] } {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  useEffect(() => {
    const supabase = createClient();
    const load = () =>
      supabase
        .from("company_categories")
        .select("category_type, name, hidden")
        .eq("company_id", companyId)
        .eq("category_type", "product_type")
        .then(({ data }) => setCategories((data as CategoryRow[] | null) ?? []));
    load();
    window.addEventListener(PRODUCT_TYPES_CHANGED, load);
    return () => window.removeEventListener(PRODUCT_TYPES_CHANGED, load);
  }, [companyId]);
  const order = useCategoryOrder(companyId);
  return {
    types: storeProductTypes(hiddenBuiltins, categories, false, order.productTypes),
    hidden: categories.filter((c) => c.hidden).map((c) => c.name),
  };
}

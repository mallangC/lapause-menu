import { PRODUCT_TYPES } from "@/lib/constants";

// 매장 상품 유형 목록 — 기본 제공 유형(삭제한 것 제외) + 사장님이 추가한 유형
// · 기본 제공 유형을 '삭제'하면 company_settings.hidden_product_types 에 들어간다 (목록에서 빠짐)
// · 추가한 유형은 company_categories(category_type='product_type'), hidden=true 면 손님에게만 숨김
// 유형별 설정(당일 준비 시간·크기 기준)은 '기본' + 유형별(선택)로 저장하고, 유형을 삭제하면 그 유형 설정도 지운다.

export interface CategoryRow {
  category_type: string;
  name: string;
  hidden?: boolean | null;
}

/** 유형별 설정에서 따로 정하지 않은 유형이 따라가는 값의 키 */
export const DEFAULT_TYPE_KEY = "기본";

/**
 * 매장 유형 목록
 * @param forCustomer true면 손님에게 숨긴 추가 유형은 뺀다 (사장님 설정 화면은 숨긴 것도 포함)
 */
export function storeProductTypes(hiddenBuiltins: string[] | null | undefined, categories: CategoryRow[] | null | undefined, forCustomer = false): string[] {
  const hidden = hiddenBuiltins ?? [];
  const builtins = PRODUCT_TYPES.filter((t) => !hidden.includes(t)) as string[];
  const customs = (categories ?? [])
    .filter((c) => c.category_type === "product_type" && !(forCustomer && c.hidden))
    .map((c) => c.name)
    .filter((n) => !builtins.includes(n));
  return [...builtins, ...customs];
}

/** 이 유형의 당일 최소 준비 시간(시간) — 유형 값 → 기본 → (예전 '기타' 값) → 2시간 */
export function leadHoursFor(map: Record<string, number> | null | undefined, type: string | null | undefined): number {
  const m = map ?? {};
  if (type && typeof m[type] === "number") return m[type];
  if (typeof m[DEFAULT_TYPE_KEY] === "number") return m[DEFAULT_TYPE_KEY];
  if (typeof m["기타"] === "number") return m["기타"];
  return 2;
}

/** 손님 화면 유형 이름 확인 — 매장마다 유형이 달라 이름 모양만 본다 (1~20자) */
export const isValidTypeName = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 20;

import { DEFAULT_TYPE_KEY } from "@/lib/productTypes";

// 크기 기준 — cm 대신 추상적인 단계 이름으로, 가격에 따라 자동으로 정해진다.
// '기본' 하나 + 상품 유형별(선택). 유형별로 따로 정하지 않은 유형은 기본을 따른다 (company_settings.size_tiers).
// 손님은 크기를 따로 고르지 않는다 — 예산·상품 가격을 보면 그에 맞는 크기가 보이고, (?)를 누르면 참고 사진이 뜬다.

export const SIZE_NAMES = ["미니", "소형", "중형", "대형", "특대형", "프리미엄"] as const;

export interface SizeTier {
  name: string;
  /** 이 가격(원)부터 이 크기 — 비어 있으면 쓰지 않는 단계 */
  minPrice: number | null;
  /** 크기 참고 사진 */
  image: string | null;
}

/** 저장 모양 — 기본 + 유형별(따로 정한 유형만) */
export interface SizeConfig {
  default: SizeTier[];
  byType: Record<string, SizeTier[]>;
}

/** 단계 목록을 정해진 6단계 순서로 맞춘다 (없는 단계는 빈 값) */
export function normalizeSizeTiers(raw: unknown): SizeTier[] {
  const list = Array.isArray(raw) ? (raw as Partial<SizeTier>[]) : [];
  return SIZE_NAMES.map((name) => {
    const t = list.find((x) => x?.name === name);
    const price = Number(t?.minPrice);
    return {
      name,
      minPrice: t?.minPrice != null && Number.isFinite(price) && price >= 0 ? price : null,
      image: typeof t?.image === "string" && t.image ? t.image : null,
    };
  });
}

/** 저장 값 읽기 — 예전 모양(단계 배열 하나)은 '기본'으로 */
export function normalizeSizeConfig(raw: unknown): SizeConfig {
  if (Array.isArray(raw)) return { default: normalizeSizeTiers(raw), byType: {} };
  const r = (raw ?? {}) as { default?: unknown; byType?: Record<string, unknown> };
  const byType: Record<string, SizeTier[]> = {};
  for (const [k, v] of Object.entries(r.byType ?? {})) byType[k] = normalizeSizeTiers(v);
  return { default: normalizeSizeTiers(r.default), byType };
}

/** 이 유형에 쓰는 크기 기준 (가격 기준을 넣은 단계만) — 유형별로 정했으면 그것, 아니면 기본 */
export function tiersForType(config: SizeConfig, type: string | null | undefined): SizeTier[] {
  const list = (type && config.byType[type]) || config.default;
  return list.filter((t) => t.minPrice != null);
}

/** 크기 기준을 하나라도 넣었는지 (기본 또는 유형별) */
export const hasAnySizeTier = (config: SizeConfig) =>
  [config.default, ...Object.values(config.byType)].some((l) => l.some((t) => t.minPrice != null));

/** 이 가격이면 어떤 크기인지 — 가격 기준 이하인 단계 중 가장 큰 것 (가장 작은 기준보다 싸면 가장 작은 단계) */
export function sizeForPrice(tiers: SizeTier[], price: number): SizeTier | null {
  const used = tiers.filter((t) => t.minPrice != null).sort((a, b) => a.minPrice! - b.minPrice!);
  if (used.length === 0 || !Number.isFinite(price)) return null;
  let found = used[0];
  for (const t of used) if (price >= t.minPrice!) found = t;
  return found;
}

/** 위 단계일수록 가격 기준이 커야 한다 — 어긋난 단계 이름 (사장님 설정 확인용) */
export function sizeTierOrderErrors(tiers: SizeTier[]): string[] {
  const errs: string[] = [];
  let prev: number | null = null;
  for (const t of tiers) {
    if (t.minPrice == null) continue;
    if (prev != null && t.minPrice <= prev) errs.push(t.name);
    prev = t.minPrice;
  }
  return errs;
}

/** 설정에 들어 있는 참고 사진 주소 전부 (지운 사진을 저장소에서 정리할 때) */
export const sizeConfigImages = (config: SizeConfig) =>
  [config.default, ...Object.values(config.byType)].flatMap((l) => l.map((t) => t.image).filter((u): u is string => !!u));

export { DEFAULT_TYPE_KEY };

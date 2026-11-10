import { DEFAULT_TYPE_KEY } from "@/lib/productTypes";

// 볼륨감 참고 이미지 — 사장님이 4단계(이름·가격·사진)를 정해 두면,
// 손님이 희망 금액을 정하기 전에 '이 가격이면 이 정도 볼륨' 사진을 보고 금액을 고를 수 있다.
// 상품 유형마다 따로 정한다 — 꽃다발·꽃바구니처럼 형태가 다르면 같은 가격이어도 볼륨이 달라 '기본'은 두지 않는다.
// 정하지 않은 유형은 손님에게 보여주지 않는다 (company_settings.size_tiers = { default: [], byType }).

/** 단계 수 (고정) */
export const VOLUME_TIER_COUNT = 4;
/** 이름을 비워 둔 단계에 쓰는 기본 이름 (입력 칸 안내 글자) */
export const DEFAULT_VOLUME_NAMES = ["미니", "중형", "대형", "프리미엄"];
export const VOLUME_NAME_MAX = 10;

export interface SizeTier {
  /** 사장님이 정한 단계 이름 (비우면 기본 이름) */
  name: string;
  /** 이 볼륨의 가격(원) — 비어 있으면 쓰지 않는 단계 */
  price: number | null;
  /** 볼륨감 참고 사진 */
  image: string | null;
}

/** 저장 모양 — 유형별 (default는 예전 '기본' 자리, 지금은 쓰지 않아 늘 빈 목록) */
export interface SizeConfig {
  default: SizeTier[];
  byType: Record<string, SizeTier[]>;
}

/** 빈 4단계 */
export const emptySizeTiers = (): SizeTier[] => normalizeSizeTiers([]);

/** 단계에 뭐라도 넣었는지 (이름·가격·사진) */
export const hasTierInput = (list: SizeTier[]) => list.some((t) => t.name || t.price != null || t.image);

/** 단계 목록을 4칸으로 맞춘다
 *  예전 모양(미니~프리미엄 6단계, minPrice)은 값이 들어 있는 단계만 앞에서부터 4개 옮긴다 */
export function normalizeSizeTiers(raw: unknown): SizeTier[] {
  const list = (Array.isArray(raw) ? raw : []) as { name?: unknown; price?: unknown; minPrice?: unknown; image?: unknown }[];
  const read = (t: (typeof list)[number] | undefined): SizeTier | null => {
    if (!t || typeof t !== "object") return null;
    const rawPrice = t.price ?? t.minPrice;
    const price = Number(rawPrice);
    return {
      name: typeof t.name === "string" ? t.name.trim().slice(0, VOLUME_NAME_MAX) : "",
      price: rawPrice != null && rawPrice !== "" && Number.isFinite(price) && price >= 0 ? price : null,
      image: typeof t.image === "string" && t.image ? t.image : null,
    };
  };
  const tiers = list.map(read).filter((t): t is SizeTier => !!t);
  // 예전 6단계 — 쓰던 단계(가격·사진이 있는 것)만 앞으로
  const picked = tiers.length > VOLUME_TIER_COUNT ? tiers.filter((t) => t.price != null || t.image) : tiers;
  return Array.from({ length: VOLUME_TIER_COUNT }, (_, i) => picked[i] ?? { name: "", price: null, image: null });
}

/** 저장 값 읽기 — 예전 '기본'(배열 하나 또는 default)은 쓰지 않는다 (다음 저장 때 사진과 함께 정리된다) */
export function normalizeSizeConfig(raw: unknown): SizeConfig {
  if (Array.isArray(raw)) return { default: normalizeSizeTiers(raw), byType: {} };
  const r = (raw ?? {}) as { default?: unknown; byType?: Record<string, unknown> };
  const byType: Record<string, SizeTier[]> = {};
  for (const [k, v] of Object.entries(r.byType ?? {})) byType[k] = normalizeSizeTiers(v);
  return { default: normalizeSizeTiers(r.default), byType };
}

/** 화면에 보일 단계 이름 */
export const tierName = (tiers: SizeTier[], t: SizeTier) => t.name || DEFAULT_VOLUME_NAMES[tiers.indexOf(t)] || "";

/** 손님에게 보여줄 볼륨감 참고 — 이 유형의 단계 중 가격과 사진을 모두 넣은 것 (가격 순, 정하지 않은 유형은 없음) */
export function volumeRefsForType(config: SizeConfig, type: string | null | undefined): { name: string; price: number; image: string }[] {
  const list = (type && config.byType[type]) || [];
  return list
    .map((t) => ({ name: tierName(list, t), price: t.price, image: t.image }))
    .filter((t): t is { name: string; price: number; image: string } => t.price != null && !!t.image)
    .sort((a, b) => a.price - b.price);
}

/** 볼륨감 참고를 하나라도 넣었는지 (유형별) */
export const hasAnySizeTier = (config: SizeConfig) =>
  Object.values(config.byType).some((l) => l.some((t) => t.price != null && t.image));

/** 아래 단계일수록 가격이 낮아야 한다 — 어긋난 단계 번호(0부터) (사장님 설정 확인용) */
export function sizeTierOrderErrors(tiers: SizeTier[]): number[] {
  const errs: number[] = [];
  let prev: number | null = null;
  tiers.forEach((t, i) => {
    if (t.price == null) return;
    if (prev != null && t.price <= prev) errs.push(i);
    prev = t.price;
  });
  return errs;
}

/** 설정에 들어 있는 참고 사진 주소 전부 (지운 사진을 저장소에서 정리할 때) */
export const sizeConfigImages = (config: SizeConfig) =>
  [config.default, ...Object.values(config.byType)].flatMap((l) => l.map((t) => t.image).filter((u): u is string => !!u));

export { DEFAULT_TYPE_KEY };

// 크기 기준 — cm 대신 추상적인 단계 이름으로, 가격에 따라 자동으로 정해진다.
// 사장님은 단계마다 '이 가격부터'와 참고 사진(크기만 보여주는 용도)을 넣는다 (company_settings.size_tiers).
// 손님은 크기를 따로 고르지 않는다 — 예산·상품 가격을 보면 그에 맞는 크기가 보이고, (?)를 누르면 참고 사진이 뜬다.

export const SIZE_NAMES = ["한송이", "미니", "소형", "중형", "대형", "특대형", "프리미엄"] as const;

export interface SizeTier {
  name: string;
  /** 이 가격(원)부터 이 크기 — 비어 있으면 쓰지 않는 단계 */
  minPrice: number | null;
  /** 크기 참고 사진 */
  image: string | null;
}

/** 저장된 값을 정해진 7단계 순서로 맞춘다 (없는 단계는 빈 값) */
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

/** 가격 기준을 넣은 단계만 (손님 화면용) */
export const activeSizeTiers = (raw: unknown) => normalizeSizeTiers(raw).filter((t) => t.minPrice != null);

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

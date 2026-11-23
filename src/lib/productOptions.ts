// 상품 옵션 — 사장님이 상품마다 만드는 옵션 묶음 (예: [포장지] 기본 0원 / 고급 +5,000 · [추가] 꽃 추가 +10,000)
// 손님 화면·장바구니·서버 금액 확인이 모두 이 파일의 계산을 쓴다 (금액이 어긋나지 않게)
//
// · 묶음(group): 이름 + 하나만 고르기(multi=false) / 여러 개 고르기(multi=true)
// · 항목(choice): 이름 + 추가 금액(0원 이상) + 기본 선택
// · 하나만 고르는 묶음은 늘 하나가 골라져 있다 (기본 선택이 없으면 첫 항목)
// · 손님이 고른 것은 항목 id 목록으로 주고받는다

export interface ProductOptionChoice {
  id: string;
  name: string;
  /** 추가 금액 (0원 이상, 원 단위) */
  price: number;
  /** 처음부터 골라져 있음 */
  default?: boolean;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  /** true: 여러 개 고르기 / false: 하나만 고르기 */
  multi: boolean;
  choices: ProductOptionChoice[];
}

export const OPTION_GROUP_MAX = 5;
export const OPTION_CHOICE_MAX = 10;
export const OPTION_PRICE_MAX = 10_000_000;
const NAME_MAX = 30;

export const newOptionId = () => Math.random().toString(36).slice(2, 10);

/** DB·요청에서 온 값을 믿을 수 있는 모양으로 (이상한 값은 버린다) */
export function normalizeOptions(raw: unknown): ProductOptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: ProductOptionGroup[] = [];
  for (const g of raw.slice(0, OPTION_GROUP_MAX)) {
    if (!g || typeof g !== "object") continue;
    const gg = g as Record<string, unknown>;
    const name = typeof gg.name === "string" ? gg.name.trim().slice(0, NAME_MAX) : "";
    const id = typeof gg.id === "string" && gg.id ? gg.id.slice(0, 20) : "";
    if (!name || !id || !Array.isArray(gg.choices)) continue;
    const choices: ProductOptionChoice[] = [];
    for (const c of gg.choices.slice(0, OPTION_CHOICE_MAX)) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      const cname = typeof cc.name === "string" ? cc.name.trim().slice(0, NAME_MAX) : "";
      const cid = typeof cc.id === "string" && cc.id ? cc.id.slice(0, 20) : "";
      const price = Number(cc.price);
      if (!cname || !cid || !Number.isInteger(price) || price < 0 || price > OPTION_PRICE_MAX) continue;
      choices.push({ id: cid, name: cname, price, default: cc.default === true });
    }
    if (choices.length === 0) continue;
    const multi = gg.multi === true;
    // 하나만 고르는 묶음은 기본 선택을 하나로
    if (!multi) {
      const first = choices.findIndex((c) => c.default);
      choices.forEach((c, i) => (c.default = i === (first >= 0 ? first : -1)));
    }
    groups.push({ id, name, multi, choices });
  }
  return groups;
}

/** 처음 골라져 있는 항목 — 하나만 고르는 묶음은 기본 선택(없으면 첫 항목), 여러 개는 기본 선택들 */
export function defaultSelection(groups: ProductOptionGroup[]): string[] {
  const ids: string[] = [];
  for (const g of groups) {
    if (g.multi) ids.push(...g.choices.filter((c) => c.default).map((c) => c.id));
    else ids.push((g.choices.find((c) => c.default) ?? g.choices[0]).id);
  }
  return ids;
}

export interface ResolvedOptions {
  /** 고른 항목 id (묶음 순서대로) */
  ids: string[];
  /** 옵션 추가 금액 합계 (상품 1개 기준) */
  price: number;
  /** 화면·예약에 보여줄 글 — "포장지: 고급 포장(+5,000원) / 추가: 꽃 추가(+10,000원)" */
  label: string;
}

const won = (n: number) => n.toLocaleString("ko-KR");

/**
 * 고른 항목 확인 — 없는 항목이 있거나, 하나만 고르는 묶음에서 0개·2개 이상이면 null
 * selected 가 없으면(undefined) 기본 선택으로 본다 (옵션 화면이 없는 주문 경로)
 */
export function resolveOptions(groups: ProductOptionGroup[], selected: string[] | undefined | null): ResolvedOptions | null {
  const sel = selected == null ? defaultSelection(groups) : selected;
  if (!Array.isArray(sel)) return null;
  const known = new Set(groups.flatMap((g) => g.choices.map((c) => c.id)));
  if (sel.some((id) => typeof id !== "string" || !known.has(id))) return null;
  const chosen = new Set(sel);
  const ids: string[] = [];
  const parts: string[] = [];
  let price = 0;
  for (const g of groups) {
    const picked = g.choices.filter((c) => chosen.has(c.id));
    if (!g.multi && picked.length !== 1) return null;
    if (picked.length === 0) continue;
    ids.push(...picked.map((c) => c.id));
    price += picked.reduce((s, c) => s + c.price, 0);
    parts.push(`${g.name}: ${picked.map((c) => (c.price > 0 ? `${c.name}(+${won(c.price)}원)` : c.name)).join(", ")}`);
  }
  return { ids, price, label: parts.join(" / ") };
}

/** 장바구니에서 같은 상품이라도 옵션이 다르면 다른 줄 */
export const cartLineKey = (item: { productId: string; options?: string[] | null }) =>
  item.options?.length ? `${item.productId}|${[...item.options].sort().join(",")}` : item.productId;

/**
 * 주문서에 넣을 상품 값 — 상품가(할인가)·정가에 고른 옵션 금액을 더하고, 고른 항목 id·글을 붙인다
 * 고른 것이 없거나 옵션이 바뀌어 맞지 않으면 기본 선택으로 (서버도 같은 계산으로 다시 확인한다)
 * 주의: 한 상품에 한 번만 쓴다 (두 번 쓰면 옵션 금액이 두 번 더해진다)
 */
export function applyOptions<T extends { price: number; original_price?: number | null; options?: unknown }>(p: T, selected?: string[] | null) {
  const groups = normalizeOptions(p.options);
  const r = resolveOptions(groups, selected) ?? resolveOptions(groups, undefined);
  if (!r || groups.length === 0) return { ...p, productOptions: [] as string[], optionsLabel: null as string | null };
  return {
    ...p,
    price: p.price + r.price,
    original_price: p.original_price != null ? p.original_price + r.price : p.original_price ?? null,
    productOptions: r.ids,
    optionsLabel: r.label || null,
  };
}

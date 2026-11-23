"use client";

import { useState, useEffect, useCallback } from "react";
import { cartLineKey } from "@/lib/productOptions";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  /** 할인 전 정가 (있으면 할인 중) */
  original_price?: number | null;
  image_url: string | null;
  product_type: string;
  bag_included: boolean;
  /** 사장님이 '메시지카드 추가 불가'로 둔 상품 — 장바구니·바로 예약에서도 카드를 추가하지 못한다 */
  message_card_unavailable?: boolean;
  /** 사장님이 '생화 수명연장제 추가 불가'로 둔 상품 */
  preservative_unavailable?: boolean;
  /** 고른 상품 옵션 항목 id — price(·original_price)에 옵션 금액이 이미 더해져 있다 */
  options?: string[];
  /** 고른 상품 옵션 글 (장바구니·주문서에 보여 준다) */
  optionsLabel?: string | null;
  quantity: number;
  shoppingBagCount: number;
  preservativeCount: number;
  messageCardCount: number;
  messageCardContents: string[];
  checked: boolean;
}

/**
 * cart: 장바구니 (localStorage, 브라우저를 닫아도 유지)
 * direct: 상품 상세에서 수량 2개 이상으로 바로 예약할 때 쓰는 임시 주문서 (sessionStorage, 장바구니와 완전히 분리)
 */
export type CartStore = "cart" | "direct";

function storageKey(slug: string, store: CartStore) {
  return store === "direct" ? `direct_${slug}` : `cart_${slug}`;
}

function storage(store: CartStore): Storage {
  return store === "direct" ? sessionStorage : localStorage;
}

function load(slug: string, store: CartStore): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(storage(store).getItem(storageKey(slug, store)) ?? "[]");
  } catch {
    return [];
  }
}

function save(slug: string, store: CartStore, items: CartItem[]) {
  storage(store).setItem(storageKey(slug, store), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cartupdate", { detail: { slug, store } }));
}

type CartProduct = Omit<CartItem, "quantity" | "shoppingBagCount" | "preservativeCount" | "messageCardCount" | "messageCardContents" | "checked">;

const newItem = (product: CartProduct, quantity: number): CartItem => ({
  ...product, quantity, shoppingBagCount: 0, preservativeCount: 0, messageCardCount: 0, messageCardContents: [], checked: true,
});

/** 바로 예약 시작 — 장바구니는 건드리지 않고, 바로 예약 주문서를 이 상품 하나로 새로 채운다 */
export function startDirectOrder(slug: string, product: CartProduct, quantity: number) {
  save(slug, "direct", [newItem(product, quantity)]);
}

export function useCart(slug: string, store: CartStore = "cart") {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(load(slug, store));

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.slug === slug && (detail?.store ?? "cart") === store) {
        setItems(load(slug, store));
      }
    };
    window.addEventListener("cartupdate", handler);
    return () => window.removeEventListener("cartupdate", handler);
  }, [slug, store]);

  const addItem = useCallback((product: CartProduct, quantity = 1) => {
    const current = load(slug, store);
    // 같은 상품이라도 옵션이 다르면 다른 줄 (줄 구분: cartLineKey)
    const key = cartLineKey(product);
    const existing = current.find((i) => cartLineKey(i) === key);
    const next = existing
      ? current.map((i) => cartLineKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i)
      : [...current, newItem(product, quantity)];
    save(slug, store, next);
    setItems(next);
  }, [slug, store]);

  /** key — cartLineKey(줄) (옵션 없는 상품은 상품 id 와 같다) */
  const removeItem = useCallback((key: string) => {
    const current = load(slug, store);
    const next = current.filter((i) => cartLineKey(i) !== key);
    save(slug, store, next);
    setItems(next);
  }, [slug, store]);

  const updateItem = useCallback((key: string, patch: Partial<CartItem>) => {
    const current = load(slug, store);
    const next = current.map((i) => cartLineKey(i) === key ? { ...i, ...patch } : i);
    save(slug, store, next);
    setItems(next);
  }, [slug, store]);

  const clearCart = useCallback(() => {
    save(slug, store, []);
    setItems([]);
  }, [slug, store]);

  const checkedItems = items.filter((i) => i.checked);
  const totalPrice = checkedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, checkedItems, totalPrice, totalCount, addItem, removeItem, updateItem, clearCart };
}

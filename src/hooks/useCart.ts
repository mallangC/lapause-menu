"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  product_type: string;
  bag_included: boolean;
  quantity: number;
  shoppingBagCount: number;
  messageCardCount: number;
  messageCardContents: string[];
  checked: boolean;
}

function storageKey(slug: string) {
  return `cart_${slug}`;
}

function load(slug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKey(slug)) ?? "[]");
  } catch {
    return [];
  }
}

function save(slug: string, items: CartItem[]) {
  localStorage.setItem(storageKey(slug), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cartupdate", { detail: { slug } }));
}

export function useCart(slug: string) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(load(slug));

    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.slug === slug) {
        setItems(load(slug));
      }
    };
    window.addEventListener("cartupdate", handler);
    return () => window.removeEventListener("cartupdate", handler);
  }, [slug]);

  const addItem = useCallback((
    product: Omit<CartItem, "quantity" | "shoppingBagCount" | "messageCardCount" | "messageCardContents" | "checked">,
    quantity = 1,
  ) => {
    const current = load(slug);
    const existing = current.find((i) => i.productId === product.productId);
    const next = existing
      ? current.map((i) => i.productId === product.productId ? { ...i, quantity: i.quantity + quantity } : i)
      : [...current, { ...product, quantity, shoppingBagCount: 0, messageCardCount: 0, messageCardContents: [], checked: true }];
    save(slug, next);
    setItems(next);
  }, [slug]);

  const removeItem = useCallback((productId: string) => {
    const current = load(slug);
    const next = current.filter((i) => i.productId !== productId);
    save(slug, next);
    setItems(next);
  }, [slug]);

  const updateItem = useCallback((productId: string, patch: Partial<CartItem>) => {
    const current = load(slug);
    const next = current.map((i) => i.productId === productId ? { ...i, ...patch } : i);
    save(slug, next);
    setItems(next);
  }, [slug]);

  const clearCart = useCallback(() => {
    save(slug, []);
    setItems([]);
  }, [slug]);

  const checkedItems = items.filter((i) => i.checked);
  const totalPrice = checkedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, checkedItems, totalPrice, totalCount, addItem, removeItem, updateItem, clearCart };
}

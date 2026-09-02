"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StoreHeader from "@/components/main/StoreHeader";
import { useCart } from "@/hooks/useCart";

interface CartClientProps {
  slug: string;
  companyName: string;
  logoImage: string | null;
  themeVars: Record<string, string>;
  consultEnabled: boolean;
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  messageCardEnabled: boolean;
  messageCardPrice: number;
}

export default function CartClient({
  slug,
  companyName,
  logoImage,
  themeVars,
  consultEnabled,
  shoppingBagEnabled,
  shoppingBagPrice,
  messageCardEnabled,
  messageCardPrice,
}: CartClientProps) {
  const router = useRouter();
  const { items, checkedItems, removeItem, updateItem, clearCart } = useCart(slug);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const totalPrice = checkedItems.reduce((sum, item) => {
    let price = item.price * item.quantity;
    if (!item.bag_included) price += shoppingBagPrice * (item.shoppingBagCount ?? 0);
    price += messageCardPrice * (item.messageCardCount ?? 0);
    return sum + price;
  }, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50" style={themeVars}>
        <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />
        <div className="flex flex-col items-center justify-center py-32 px-8 text-center gap-4">
          <svg className="w-16 h-16 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <p className="text-gray-400 text-base">장바구니가 비어있습니다</p>
          <Link href={`/${slug}`} className="mt-2 px-6 py-2.5 rounded-full bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 transition-colors">
            상품 보러가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={themeVars}>
      <StoreHeader slug={slug} companyName={companyName} logoImage={logoImage} productTypeList={[]} seasonList={[]} consultEnabled={consultEnabled} />

      <div className="max-w-lg mx-auto px-4 py-6 pb-36">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">장바구니</h1>
          <button onClick={clearCart} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">전체 삭제</button>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = expandedCard === item.productId;
            const itemTotal = item.price * item.quantity
              + (!item.bag_included ? shoppingBagPrice * (item.shoppingBagCount ?? 0) : 0)
              + messageCardPrice * (item.messageCardCount ?? 0);

            return (
              <div key={item.productId} className="bg-white rounded-2xl overflow-hidden">
                {/* 상품 행 */}
                <div className="flex items-center gap-3 px-4 py-4">
                  {/* 체크박스 */}
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => updateItem(item.productId, { checked: e.target.checked })}
                    className="w-4 h-4 accent-gold-500 shrink-0"
                  />

                  {/* 이미지 */}
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} width={64} height={64} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0" />
                  )}

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.product_type}</p>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{item.name}</p>
                    <p className="text-sm font-bold text-gold-500 mt-0.5">{itemTotal.toLocaleString()}원</p>
                  </div>

                  {/* 수량 + 삭제 */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-gray-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            const newQty = item.quantity - 1;
                            const newCardCount = Math.min(item.messageCardCount ?? 0, newQty);
                            updateItem(item.productId, {
                              quantity: newQty,
                              shoppingBagCount: Math.min(item.shoppingBagCount ?? 0, newQty),
                              messageCardCount: newCardCount,
                              messageCardContents: (item.messageCardContents ?? []).slice(0, newCardCount),
                            });
                          } else {
                            removeItem(item.productId);
                          }
                        }}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateItem(item.productId, { quantity: item.quantity + 1 })}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 옵션 (쇼핑백, 메시지카드) */}
                {(shoppingBagEnabled || messageCardEnabled || item.bag_included) && (
                  <>
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : item.productId)}
                      className="w-full flex items-center justify-between px-4 py-2.5 border-t border-gray-50 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <span>옵션 추가</span>
                      <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-3">
                        {/* 쇼핑백 */}
                        {(shoppingBagEnabled || item.bag_included) && (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm ${item.bag_included ? "text-gray-400" : "text-gray-700"}`}>
                                {item.bag_included ? "쇼핑백 포함 제품" : "쇼핑백"}
                              </p>
                              {!item.bag_included && <p className="text-xs text-gray-400">+{shoppingBagPrice.toLocaleString()}원 / 개</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItem(item.productId, { shoppingBagCount: Math.max(0, (item.shoppingBagCount ?? 0) - 1) })}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                disabled={item.bag_included || (item.shoppingBagCount ?? 0) === 0}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="text-sm font-medium w-4 text-center">{item.shoppingBagCount ?? 0}</span>
                              <button
                                onClick={() => updateItem(item.productId, { shoppingBagCount: Math.min(item.quantity, (item.shoppingBagCount ?? 0) + 1) })}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                disabled={item.bag_included || (item.shoppingBagCount ?? 0) >= item.quantity}
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 메시지카드 */}
                        {messageCardEnabled && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-700">메시지 카드</p>
                                <p className="text-xs text-gray-400">+{messageCardPrice.toLocaleString()}원 / 장</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const next = Math.max(0, (item.messageCardCount ?? 0) - 1);
                                    updateItem(item.productId, { messageCardCount: next, messageCardContents: (item.messageCardContents ?? []).slice(0, next) });
                                  }}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                  disabled={(item.messageCardCount ?? 0) === 0}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                                </button>
                                <span className="text-sm font-medium w-4 text-center">{item.messageCardCount ?? 0}</span>
                                <button
                                  onClick={() => {
                                    const next = Math.min(item.quantity, (item.messageCardCount ?? 0) + 1);
                                    const contents = [...(item.messageCardContents ?? [])];
                                    if (contents.length < next) contents.push("");
                                    updateItem(item.productId, { messageCardCount: next, messageCardContents: contents });
                                  }}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                  disabled={(item.messageCardCount ?? 0) >= item.quantity}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                                </button>
                              </div>
                            </div>
                            {(item.messageCardCount ?? 0) > 0 && (
                              <div className="space-y-2 pt-1">
                                {Array.from({ length: item.messageCardCount ?? 0 }).map((_, idx) => (
                                  <div key={idx}>
                                    {(item.messageCardCount ?? 0) > 1 && (
                                      <p className="text-xs text-gray-400 mb-1">{idx + 1}번 카드</p>
                                    )}
                                    <textarea
                                      value={(item.messageCardContents ?? [])[idx] ?? ""}
                                      onChange={(e) => {
                                        const next = Array.from({ length: item.messageCardCount ?? 0 }, (_, i) => (item.messageCardContents ?? [])[i] ?? "");
                                        next[idx] = e.target.value;
                                        updateItem(item.productId, { messageCardContents: next });
                                      }}
                                      placeholder="카드에 적을 내용을 입력해주세요"
                                      rows={2}
                                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-gold-400"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 결제 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">선택 {checkedItems.length}개</p>
            <p className="text-lg font-bold text-gray-900">{totalPrice.toLocaleString()}원</p>
          </div>
          <button
            disabled={checkedItems.length === 0}
            onClick={() => router.push(`/${slug}/cart/checkout`)}
            className="px-8 py-3 rounded-full bg-gold-500 text-white font-medium text-sm hover:bg-gold-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>
  );
}

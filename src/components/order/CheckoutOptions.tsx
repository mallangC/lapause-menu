"use client";

import type { OrderCheckoutState } from "./useOrderCheckout";
import MessageCardSuggest, { MESSAGE_CARD_PLACEHOLDER, MessageCardCount } from "./MessageCardSuggest";
import { MESSAGE_CARD_MAX } from "@/lib/constants";

// 추가 옵션 (메시지 카드 · 쇼핑백 · 생화 수명연장제) — 상품 1개 주문
// 결제 화면(OrderCheckout)과 첫 화면 대화 주문(ChatCheckout)이 함께 쓴다. 수량 2개 이상이면 개수로 고른다.
export default function CheckoutOptions({
  c,
  messageCardEnabled,
  messageCardPrice,
  shoppingBagEnabled,
  shoppingBagPrice,
  preservativeEnabled,
  preservativePrice,
}: {
  c: OrderCheckoutState;
  messageCardEnabled: boolean;
  messageCardPrice: number;
  shoppingBagEnabled: boolean;
  shoppingBagPrice: number;
  preservativeEnabled: boolean;
  preservativePrice: number;
}) {
  const {
    product, quantity, form, set, single,
    messageCardCount, setMessageCardCount, messageCardContents, setMessageCardContents,
    shoppingBagCount, setShoppingBagCount, preservativeCount, setPreservativeCount,
  } = c;
  if (!(messageCardEnabled || shoppingBagEnabled || preservativeEnabled)) return null;
  return (
                  <div className="bg-white overflow-hidden">
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                      <h3 className="text-sm font-medium text-gray-700">추가 옵션</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {messageCardEnabled && !product?.message_card_unavailable && (
                        <div>
                          {quantity >= 2 ? (
                            /* 수량 2개 이상: 카운터 UI */
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <div>
                                <span className="text-sm text-gray-800">메시지 카드</span>
                                <span className="ml-2 text-xs text-gold-500">+{messageCardPrice.toLocaleString()}원 / 장</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(0, messageCardCount - 1);
                                    setMessageCardCount(next);
                                    setMessageCardContents((prev) => prev.slice(0, next));
                                  }}
                                  disabled={messageCardCount === 0}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                                </button>
                                <span className="text-sm font-medium w-5 text-center">{messageCardCount}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.min(quantity, messageCardCount + 1);
                                    setMessageCardCount(next);
                                    setMessageCardContents((prev) => {
                                      const arr = [...prev];
                                      if (arr.length < next) arr.push("");
                                      return arr;
                                    });
                                  }}
                                  disabled={messageCardCount >= quantity}
                                  className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* 수량 1개: 기존 토글 UI */
                            <button
                              type="button"
                              onClick={() => {
                                const next = form.messageCard === "추가" ? "없음" : "추가";
                                set("messageCard", next);
                                if (next === "없음") set("messageCardContent", "");
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.messageCard === "추가" ? "bg-white" : "hover:bg-gray-50"}`}
                            >
                              <div>
                                <span className={`text-sm ${form.messageCard === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>메시지 카드</span>
                                <span className="ml-2 text-xs text-gold-500">+{messageCardPrice.toLocaleString()}원</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.messageCard === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                                {form.messageCard === "추가" && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )}
                          {/* 메시지 카드 내용 입력 */}
                          {quantity >= 2 && messageCardCount > 0 && (
                            <div className="px-4 pb-3 space-y-2">
                              {Array.from({ length: messageCardCount }).map((_, idx) => (
                                <div key={idx}>
                                  {messageCardCount > 1 && (
                                    <p className="text-xs text-gray-400 mb-1">{idx + 1}번 카드</p>
                                  )}
                                  <MessageCardSuggest
                                        purpose={single?.taste.purpose}
                                        onPick={(text) =>
                                          setMessageCardContents((prev) => {
                                            const next = Array.from({ length: messageCardCount }, (_, i) => prev[i] ?? "");
                                            next[idx] = text.slice(0, MESSAGE_CARD_MAX);
                                            return next;
                                          })
                                        }
                                      />
                                  <textarea
                                    value={messageCardContents[idx] ?? ""}
                                    onChange={(e) => {
                                      setMessageCardContents((prev) => {
                                        const next = Array.from({ length: messageCardCount }, (_, i) => prev[i] ?? "");
                                        next[idx] = e.target.value.slice(0, MESSAGE_CARD_MAX);
                                        return next;
                                      });
                                    }}
                                    maxLength={MESSAGE_CARD_MAX}
                                    placeholder={MESSAGE_CARD_PLACEHOLDER}
                                    rows={2}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300"
                                  />
                                  {/* 글자 수 — 입력칸 오른쪽 아래 */}
                                  <MessageCardCount text={messageCardContents[idx] ?? ""} />
                                </div>
                              ))}
                            </div>
                          )}
                          {quantity < 2 && form.messageCard === "추가" && (
                            <div className="px-4 pb-3">
                              <MessageCardSuggest purpose={single?.taste.purpose} onPick={(text) => set("messageCardContent", text.slice(0, MESSAGE_CARD_MAX))} />
                              <textarea
                                value={form.messageCardContent}
                                onChange={(e) => set("messageCardContent", e.target.value.slice(0, MESSAGE_CARD_MAX))}
                                maxLength={MESSAGE_CARD_MAX}
                                placeholder={MESSAGE_CARD_PLACEHOLDER}
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gold-400 bg-gray-50 placeholder:text-gray-300"
                              />
                              {/* 글자 수 — 입력칸 오른쪽 아래 */}
                              <MessageCardCount text={form.messageCardContent} />
                            </div>
                          )}
                        </div>
                      )}
                      {shoppingBagEnabled && (
                        product?.bag_included ? (
                          <div className="w-full flex items-center justify-between px-4 py-3.5">
                            <span className="text-sm text-gray-400">쇼핑백 포함 제품</span>
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex items-center justify-center shrink-0" />
                          </div>
                        ) : quantity >= 2 ? (
                          /* 수량 2개 이상: 카운터 UI */
                          <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                              <span className="text-sm text-gray-800">쇼핑백</span>
                              <span className="ml-2 text-xs text-gold-500">+{shoppingBagPrice.toLocaleString()}원 / 개</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShoppingBagCount((c) => Math.max(0, c - 1))}
                                disabled={shoppingBagCount === 0}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="text-sm font-medium w-5 text-center">{shoppingBagCount}</span>
                              <button
                                type="button"
                                onClick={() => setShoppingBagCount((c) => Math.min(quantity, c + 1))}
                                disabled={shoppingBagCount >= quantity}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 수량 1개: 기존 토글 UI */
                          <button
                            type="button"
                            onClick={() => set("shoppingBag", form.shoppingBag === "추가" ? "없음" : "추가")}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.shoppingBag === "추가" ? "bg-white" : "hover:bg-gray-50"}`}
                          >
                            <div>
                              <span className={`text-sm ${form.shoppingBag === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>쇼핑백</span>
                              <span className="ml-2 text-xs text-gold-500">+{shoppingBagPrice.toLocaleString()}원</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.shoppingBag === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                              {form.shoppingBag === "추가" && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      )}
                      {preservativeEnabled && !product?.preservative_unavailable && (
                        quantity >= 2 ? (
                          /* 수량 2개 이상: 카운터 UI */
                          <div className="flex items-center justify-between px-4 py-3.5">
                            <div>
                              <span className="text-sm text-gray-800">생화 수명연장제</span>
                              <span className="ml-2 text-xs text-gold-500">+{preservativePrice.toLocaleString()}원 / 개</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreservativeCount((c) => Math.max(0, c - 1))}
                                disabled={preservativeCount === 0}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                              </button>
                              <span className="text-sm font-medium w-5 text-center">{preservativeCount}</span>
                              <button
                                type="button"
                                onClick={() => setPreservativeCount((c) => Math.min(quantity, c + 1))}
                                disabled={preservativeCount >= quantity}
                                className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 transition-colors disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 수량 1개: 기존 토글 UI */
                          <button
                            type="button"
                            onClick={() => set("preservative", form.preservative === "추가" ? "없음" : "추가")}
                            className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${form.preservative === "추가" ? "bg-white" : "hover:bg-gray-50"}`}
                          >
                            <div>
                              <span className={`text-sm ${form.preservative === "추가" ? "text-gold-600 font-medium" : "text-gray-800"}`}>생화 수명연장제</span>
                              <span className="ml-2 text-xs text-gold-500">+{preservativePrice.toLocaleString()}원</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${form.preservative === "추가" ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
                              {form.preservative === "추가" && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </div>
  );
}

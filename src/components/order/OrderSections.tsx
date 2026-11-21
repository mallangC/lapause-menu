"use client";

import Spinner from "@/components/Spinner";
import { useState } from "react";
import Link from "next/link";
import AgreementCheckbox from "@/components/AgreementCheckbox";
import PaymentMethodSection from "@/components/PaymentMethodSection";
import { LazyDaumPostcode } from "@/components/LazyOrderInputs";
import { formatPhone, parsePhone } from "@/lib/format";
import type { CashReceipt, PaymentMethod } from "@/lib/payment";

// 주문 마지막 페이지 공통 칸 — 맞춤주문 마지막 단계(ConsultClient)와 장바구니 결제(CheckoutClient)가 함께 쓴다.
// 화면 모양만 여기서 그리고, 값·검사·결제 흐름은 각 화면이 그대로 가진다.
// (상품 정보·추가 옵션처럼 화면마다 다른 칸은 각 화면에 둔다)

type Ref = React.RefObject<HTMLDivElement | null>;

const inputCls = (bad: boolean) =>
  `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 placeholder:text-gray-300 ${bad ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`;

/** 동그라미 체크 (선택지 오른쪽) */
function RadioDot({ on }: { on: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${on ? "border-gold-500 bg-gold-500" : "border-gray-300"}`}>
      {on && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
    </div>
  );
}

// ── 사장님 안내 사항 (확인 체크) ──
export function OwnerNoticeBox({ notice, agreed, onAgree, error, refEl }: { notice: string; agreed: boolean; onAgree: (v: boolean) => void; error?: boolean; refEl?: Ref }) {
  return (
    <div ref={refEl} className={`rounded-xl px-4 py-3 border ${error ? "border-red-300 bg-red-50" : "bg-amber-50 border-amber-200"}`}>
      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${error ? "text-red-700" : "text-amber-800"}`}>{notice}</p>
      <label className={`flex items-center gap-2 mt-3 text-sm cursor-pointer ${error ? "text-red-500 font-medium" : "text-amber-700"}`}>
        <AgreementCheckbox checked={agreed} onChange={onAgree} />
        <span>
          안내 사항을 확인했습니다. <span className="text-red-400">*</span>
        </span>
      </label>
    </div>
  );
}

// ── 주문자 정보 ──
export function OrdererSection(p: {
  name: string;
  phone: string;
  onName: (v: string) => void;
  /** 하이픈을 넣은 값으로 넘어온다 */
  onPhone: (v: string) => void;
  errors: { name?: boolean; phone?: boolean };
  refName?: Ref;
  refPhone?: Ref;
}) {
  const digits = parsePhone(p.phone).length;
  const badLength = !!p.phone && (digits < 10 || digits > 11);
  return (
    <div className="bg-white px-4 py-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">
        주문자 정보 <span className="text-red-400">*</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
        <div ref={p.refName}>
          <label className={`block text-xs mb-1 ${p.errors.name ? "text-red-500 font-medium" : "text-gray-600"}`}>이름{p.errors.name && " *필수"}</label>
          <input type="text" placeholder="홍길동" value={p.name} onChange={(e) => p.onName(e.target.value)} className={inputCls(!!p.errors.name)} />
        </div>
        <div ref={p.refPhone}>
          <label className={`block text-xs mb-1 ${p.errors.phone ? "text-red-500 font-medium" : "text-gray-600"}`}>휴대전화{p.errors.phone && " *필수"}</label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="010-1234-5678"
            value={p.phone}
            onChange={(e) => p.onPhone(formatPhone(e.target.value))}
            className={inputCls(!!p.errors.phone || badLength)}
          />
          {badLength && <p className="mt-1 text-xs text-red-500">연락처는 10~11자리로 입력해주세요.</p>}
        </div>
      </div>
    </div>
  );
}

// ── 수령 방법 (픽업 / 배송 + 받는 분·주소·배송비) ──
export function DeliverySection(p: {
  deliveryEnabled: boolean;
  value: string;
  onChange: (v: string) => void;
  recipientName: string;
  onRecipientName: (v: string) => void;
  recipientPhone: string;
  /** 하이픈을 넣은 값으로 넘어온다 */
  onRecipientPhone: (v: string) => void;
  address: string;
  /** 주소 검색에서 고른 주소 — 배송비 계산은 각 화면이 한다 */
  onAddress: (v: string) => void;
  addressDetail: string;
  onAddressDetail: (v: string) => void;
  storeAddress: string | null;
  distance: { loading: boolean; km: number | null; fee: number | null };
  errors: { deliveryType?: boolean; deliveryInfo?: boolean };
  refType?: Ref;
  refInfo?: Ref;
}) {
  const [showPostcode, setShowPostcode] = useState(false);
  const infoBad = !!p.errors.deliveryInfo;
  const km = p.distance.km != null ? Math.round(p.distance.km * 10) / 10 : null;
  return (
    <div ref={p.refType} className="bg-white overflow-hidden">
      <div className={`px-4 pt-4 pb-3 border-b ${p.errors.deliveryType ? "border-red-300 bg-red-50" : "border-gray-100"}`}>
        <h3 className={`text-sm font-medium ${p.errors.deliveryType ? "text-red-500" : "text-gray-700"}`}>
          수령 방법 <span className="text-red-400">*</span>
          {p.errors.deliveryType && " — 선택해주세요"}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {(p.deliveryEnabled ? ["픽업", "배송"] : ["픽업"]).map((v) => {
          const on = p.value === v;
          return (
            <div key={v}>
              <button
                type="button"
                onClick={() => p.onChange(v)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${on ? "bg-white" : "hover:bg-gray-50"}`}
              >
                <span className={`text-sm ${on ? "text-gold-600 font-medium" : "text-gray-800"}`}>{v}</span>
                <RadioDot on={on} />
              </button>
              {v === "배송" && on && (
                <div ref={p.refInfo} className="px-4 pt-4 pb-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs mb-1 ${infoBad && !p.recipientName ? "text-red-500 font-medium" : "text-gray-600"}`}>받는 분 이름</label>
                      <input type="text" placeholder="홍길동" value={p.recipientName} onChange={(e) => p.onRecipientName(e.target.value)} className={inputCls(infoBad && !p.recipientName)} />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${infoBad && !p.recipientPhone ? "text-red-500 font-medium" : "text-gray-600"}`}>받는 분 전화번호</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="010-1234-5678"
                        value={p.recipientPhone}
                        onChange={(e) => p.onRecipientPhone(formatPhone(e.target.value))}
                        className={inputCls(infoBad && !p.recipientPhone)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${infoBad && !p.address ? "text-red-500 font-medium" : "text-gray-600"}`}>주소</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="주소 검색"
                        value={p.address}
                        readOnly
                        onClick={() => setShowPostcode(true)}
                        className={`flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-gray-50 cursor-pointer placeholder:text-gray-300 ${infoBad && !p.address ? "border-red-400" : "border-gray-200 focus:border-gray-400"}`}
                      />
                      <button type="button" onClick={() => setShowPostcode(true)} className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:border-gray-400 bg-gray-50 transition-colors whitespace-nowrap">
                        찾기
                      </button>
                    </div>
                  </div>
                  {showPostcode && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="text-xs text-gray-500">주소 검색</span>
                        <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                          ✕
                        </button>
                      </div>
                      <LazyDaumPostcode
                        onComplete={(data) => {
                          p.onAddress(data.roadAddress || data.jibunAddress || data.address);
                          setShowPostcode(false);
                        }}
                        style={{ height: 400 }}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">상세 주소</label>
                    <input type="text" placeholder="동/호수 등" value={p.addressDetail} onChange={(e) => p.onAddressDetail(e.target.value)} className={inputCls(false)} />
                  </div>
                  {/* 배송비 — 매장까지 직선거리로 */}
                  {p.address && (
                    <div className="text-xs px-1">
                      {!p.storeAddress ? (
                        <span className="text-gray-400">매장 주소가 등록되지 않아 거리를 계산할 수 없습니다.</span>
                      ) : p.distance.loading ? (
                        <span className="text-gray-400">거리 계산 중...</span>
                      ) : km !== null ? (
                        <span className="text-gray-500">
                          📍 매장까지 직선거리 <span className="font-semibold text-gray-800">약 {km}km</span>
                          {p.distance.fee !== null ? (
                            <span className="ml-1 text-gold-600 font-semibold"> · 배송비 {p.distance.fee.toLocaleString()}원</span>
                          ) : (
                            <span className="ml-1 text-amber-500"> · 배송 가능 거리를 넘었어요. 매장에 문의해 주세요</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">거리를 계산할 수 없습니다.</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 수령 날짜 (달력은 각 화면이 넘긴다 — 고를 수 있는 날짜 규칙이 다르다) ──
export function PickupDateSection({ refEl, children }: { refEl?: Ref; children: React.ReactNode }) {
  return (
    <div ref={refEl} className="bg-white overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">
          수령 날짜 <span className="text-red-400">*</span>
        </h3>
      </div>
      {children}
    </div>
  );
}

// ── 수령 시간 (시간 격자는 각 화면이 넘긴다) ──
export function PickupTimeSection(p: {
  refEl?: Ref;
  error?: boolean;
  /** 고른 날의 영업시간 (없으면 날짜를 아직 안 고름) */
  day: { closed?: boolean; open: string; close: string } | null;
  dateSelected: boolean;
  hasSlots: boolean;
  children: React.ReactNode;
}) {
  return (
    <div ref={p.refEl} className="bg-white px-4 py-4 space-y-3">
      <h3 className={`text-sm font-medium flex items-center gap-2 pb-3 border-b ${p.error ? "text-red-500 border-red-200" : "text-gray-700 border-gray-100"}`}>
        수령 시간 <span className="text-red-400">*</span>
        {p.day && !p.day.closed && (
          <span className="text-xs font-normal text-gray-400">
            영업시간 · {p.day.open}~{p.day.close}
          </span>
        )}
        {p.error && <span className="text-xs font-normal">— 시간을 선택해주세요</span>}
      </h3>
      {!p.dateSelected ? (
        <p className="text-xs text-gray-400 px-1">날짜를 먼저 선택해주세요.</p>
      ) : !p.day || p.day.closed ? (
        <p className="text-xs text-gray-400 px-1">해당 날짜는 휴무입니다.</p>
      ) : !p.hasSlots ? (
        <p className="text-xs text-gray-400 px-1">선택 가능한 시간이 없습니다.</p>
      ) : (
        p.children
      )}
    </div>
  );
}

// ── 요청 사항 — 모바일은 접어 두고(내용이 있으면 펼쳐서), PC는 늘 펼침 ──
export function RequestsSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // 대화에서 미리 채운 내용(피하고 싶은 것 등)이 있으면 펼친 채로 시작
  const [open, setOpen] = useState(!!value);
  return (
    <div className={`bg-white px-4 pt-4 space-y-2 ${open ? "pb-4" : "pb-0 md:pb-4"}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="md:hidden w-full flex items-center justify-between text-left pb-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700">요청 사항</h3>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>
      <h3 className="hidden md:block text-sm font-medium text-gray-700 pb-3 border-b border-gray-100">요청 사항</h3>
      <div className={`${open ? "block" : "hidden"} md:block`}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="매장에 전달할 내용을 입력해주세요. (선택)"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-400 bg-gray-50 placeholder:text-gray-300"
        />
      </div>
    </div>
  );
}

// ── 동의 (개인정보·환불 정책) ──
export function OrderAgreements(p: {
  privacy: boolean;
  onPrivacy: (v: boolean) => void;
  cancellation: boolean;
  onCancellation: (v: boolean) => void;
  errors: { privacy?: boolean; cancellation?: boolean };
  refEl?: Ref;
}) {
  return (
    <div ref={p.refEl} className="space-y-4">
      <label className={`flex items-start gap-3 text-sm cursor-pointer ${p.errors.privacy ? "text-red-500" : "text-gray-500"}`}>
        <AgreementCheckbox checked={p.privacy} onChange={p.onPrivacy} />
        <span>
          <Link href="/privacy" target="_blank" className="underline text-gold-600">
            개인정보처리방침
          </Link>
          에 동의합니다. <span className="text-red-400">*</span>
        </span>
      </label>
      <label className={`flex items-start gap-3 text-sm cursor-pointer ${p.errors.cancellation ? "text-red-500" : "text-gray-500"}`}>
        <AgreementCheckbox checked={p.cancellation} onChange={p.onCancellation} />
        <span>
          주문 후 제작하는 상품으로 제작 착수 후<br />
          취소·환불 불가.{" "}
          <Link href="/refund" target="_blank" className="underline text-gold-600">
            환불 정책
          </Link>{" "}
          동의 <span className="text-red-400">*</span>
        </span>
      </label>
      <p className="text-xs text-gray-400">예약이 확정되거나 취소되면 입력하신 번호로 카카오톡 알림톡을 보내드립니다.</p>
    </div>
  );
}

// ── 결제 금액 · 결제 방법 · 동의 · 결제 버튼 ──
// PC: 오른쪽에 붙어 따라오는 결제 상자 / 모바일: 폼 맨 아래

export interface PaymentProps {
  method: PaymentMethod;
  onMethod: (m: PaymentMethod) => void;
  receipt: CashReceipt;
  onReceipt: (r: CashReceipt) => void;
  receiptError?: boolean;
  transferAvailable: boolean;
}

interface PayBoxProps {
  /** 결제 금액 줄 — 상품·옵션·배송비 (금액이 0이면 그리지 않는 건 넘기는 쪽에서) */
  lines: { label: string; amount: number; plus?: boolean; minus?: boolean }[];
  total: number;
  payment: PaymentProps;
  agreements: React.ReactNode;
  error: string | null;
  onConfirm: () => void;
  submitting: boolean;
  /** 카드 결제창이 아직 준비 안 됨 */
  cardNotReady: boolean;
}

function PriceLines({ lines, total, px }: { lines: PayBoxProps["lines"]; total: number; px: string }) {
  return (
    <div className={`${px} py-4 border-b border-gray-100 space-y-2`}>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">결제 금액</p>
      {lines.map((l) => (
        <div key={l.label} className={`flex justify-between text-sm ${l.minus ? "text-red-500" : "text-gray-700"}`}>
          <span>{l.label}</span>
          <span>
            {l.plus ? "+" : l.minus ? "-" : ""}
            {l.amount.toLocaleString()}원
          </span>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-sm font-semibold text-gray-900">총 결제금액</span>
        <span className="text-lg font-bold text-gold-500">{total.toLocaleString()}원</span>
      </div>
    </div>
  );
}

function PayButton({ total, payment, onConfirm, submitting, cardNotReady }: Pick<PayBoxProps, "total" | "payment" | "onConfirm" | "submitting" | "cardNotReady">) {
  const transfer = payment.method === "transfer";
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={submitting || (!transfer && cardNotReady)}
      aria-busy={submitting}
      className="w-full bg-gold-500 text-white py-3.5 rounded-xl font-medium hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      {submitting ? (
        <>
          <Spinner />
          {transfer ? "예약 중..." : "결제창 여는 중..."}
        </>
      ) : (
        `${total.toLocaleString()}원 ${transfer ? "예약하기" : "결제하기"}`
      )}
    </button>
  );
}

/** 모바일 — 결제 방법 · 결제 금액 · 동의 · 버튼 (폼 맨 아래) */
export function MobilePayBox(p: PayBoxProps & { refPayment?: Ref }) {
  return (
    <>
      <div ref={p.refPayment} className="md:hidden">
        <PaymentMethodSection {...p.payment} />
      </div>
      <div className="md:hidden bg-white">
        <PriceLines lines={p.lines} total={p.total} px="px-4" />
        <div className="px-4 py-4 space-y-4">
          {p.agreements}
          {p.error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{p.error}</p>}
          <PayButton {...p} />
        </div>
      </div>
    </>
  );
}

/** PC — 오른쪽에 붙어 따라오는 결제 상자 */
export function SidePayBox(p: PayBoxProps) {
  return (
    // 패널 자체를 sticky로, top은 헤더(80px) + 단계 표시 바(약 49px) 아래 — 더 작으면 단계 바에 위가 가려짐
    <div className="hidden md:flex md:flex-col md:w-80 md:shrink-0 md:self-start md:sticky md:top-[150px]">
      <div className="bg-white border border-gray-100 overflow-hidden">
        <PriceLines lines={p.lines} total={p.total} px="px-5" />
        <PaymentMethodSection {...p.payment} inSidebar />
        <div className="px-5 py-4 space-y-4">
          {p.agreements}
          {p.error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{p.error}</p>}
          <PayButton {...p} />
        </div>
      </div>
    </div>
  );
}

/** 첫 화면 대화 주문 — 결제 방법 · 결제 금액 · 동의 · 버튼을 한 카드로 (화면 크기와 관계없이) */
export function ChatPayBox(p: PayBoxProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      <PaymentMethodSection {...p.payment} />
      <PriceLines lines={p.lines} total={p.total} px="px-4" />
      <div className="px-4 py-4 space-y-4">
        {p.agreements}
        {p.error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{p.error}</p>}
        <PayButton {...p} />
      </div>
    </div>
  );
}

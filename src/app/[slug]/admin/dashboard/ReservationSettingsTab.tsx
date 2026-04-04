"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, parseMoney } from "@/lib/format";

interface Props {
  companyId: string;
  onConsultToggle?: (enabled: boolean) => void;
}

export default function ReservationSettingsTab({ companyId, onConsultToggle }: Props) {
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [messageCardEnabled, setMessageCardEnabled] = useState(false);
  const [messageCardPrice, setMessageCardPrice] = useState("");
  const [shoppingBagEnabled, setShoppingBagEnabled] = useState(false);
  const [shoppingBagPrice, setShoppingBagPrice] = useState("");
  const [consultNotice, setConsultNotice] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [showDeliveryFeeWarning, setShowDeliveryFeeWarning] = useState(false);
  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({
    "0-1": "", "1-3": "", "3-5": "", "5-10": "", "10-15": "", "15-20": "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasBankInfo, setHasBankInfo] = useState(false);
  const [showBankWarning, setShowBankWarning] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("companies")
      .select("consult_enabled, message_card_enabled, message_card_price, shopping_bag_enabled, shopping_bag_price, bank_name, bank_account, bank_holder, phone, address, consult_notice, delivery_fees, delivery_enabled")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.consult_enabled) setConsultEnabled(data.consult_enabled);
        setMessageCardEnabled(data.message_card_enabled ?? false);
        setMessageCardPrice(data.message_card_price ? formatMoney(String(data.message_card_price)) : "");
        setShoppingBagEnabled(data.shopping_bag_enabled ?? false);
        setShoppingBagPrice(data.shopping_bag_price ? formatMoney(String(data.shopping_bag_price)) : "");
        setHasBankInfo(!!(data.phone && data.address && data.bank_name && data.bank_account && data.bank_holder));
        if (data.consult_notice) setConsultNotice(data.consult_notice);
        setDeliveryEnabled(data.delivery_enabled ?? false);
        if (data.delivery_fees && typeof data.delivery_fees === "object") {
          const fees = data.delivery_fees as Record<string, number>;
          setDeliveryFees({
            "0-1":   fees["0-1"]   != null ? formatMoney(String(fees["0-1"]))   : "",
            "1-3":   fees["1-3"]   != null ? formatMoney(String(fees["1-3"]))   : "",
            "3-5":   fees["3-5"]   != null ? formatMoney(String(fees["3-5"]))   : "",
            "5-10":  fees["5-10"]  != null ? formatMoney(String(fees["5-10"]))  : "",
            "10-15": fees["10-15"] != null ? formatMoney(String(fees["10-15"])) : "",
            "15-20": fees["15-20"] != null ? formatMoney(String(fees["15-20"])) : "",
          });
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await supabase
      .from("companies")
      .update({
        consult_enabled: consultEnabled,
        message_card_enabled: messageCardEnabled,
        message_card_price: messageCardEnabled ? parseMoney(messageCardPrice) : 0,
        shopping_bag_enabled: shoppingBagEnabled,
        shopping_bag_price: shoppingBagEnabled ? parseMoney(shoppingBagPrice) : 0,
        consult_notice: consultNotice || null,
        delivery_enabled: deliveryEnabled,
        delivery_fees: Object.fromEntries(
          Object.entries(deliveryFees).map(([k, v]) => [k, v === "" ? null : parseMoney(v)])
        ),
      })
      .eq("id", companyId);
    if (err) setError(err.message);
    else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onConsultToggle?.(consultEnabled);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-xl font-medium text-gray-900">맞춤 주문</h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      {/* 맞춤 주문 기능 활성화 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">맞춤 주문 기능</p>
          <p className="text-xs text-gray-400 mt-0.5">홈 화면에 &#34;맞춤 주문하기&#34; 버튼을 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!consultEnabled && !hasBankInfo) {
              setShowBankWarning(true);
              return;
            }
            setConsultEnabled((prev) => !prev);
          }}
          className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${
            consultEnabled ? "bg-gold-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              consultEnabled ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* 계좌 정보 미입력 경고 팝업 */}
      {showBankWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowBankWarning(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">계좌 정보를 먼저 입력해주세요</p>
                <p className="text-xs text-gray-400 mt-0.5">맞춤 주문 기능을 활성화하려면 계좌 정보가 필요합니다.</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
              <p>
                맞춤 주문 기능을 활성화하려면<br />
                <span className="font-medium text-gray-700">매장 정보 탭 &gt; 예약 알림 정보</span>에서<br />
                매장 전화번호, 매장 주소, 은행, 계좌번호, 예금주을 모두 입력해주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBankWarning(false)}
              className="w-full bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 메시지 카드 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">메시지 카드</p>
          <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 메시지 카드 옵션을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {messageCardEnabled && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={messageCardPrice}
                onChange={(e) => setMessageCardPrice(formatMoney(e.target.value))}
                placeholder="0"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-400 bg-white"
              />
              <span className="text-xs text-gray-400">원</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMessageCardEnabled((prev) => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative ${messageCardEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${messageCardEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 쇼핑백 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">쇼핑백</p>
          <p className="text-xs text-gray-400 mt-0.5">예약 추가 시 쇼핑백 옵션을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {shoppingBagEnabled && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                value={shoppingBagPrice}
                onChange={(e) => setShoppingBagPrice(formatMoney(e.target.value))}
                placeholder="0"
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-400 bg-white"
              />
              <span className="text-xs text-gray-400">원</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShoppingBagEnabled((prev) => !prev)}
            className={`w-12 h-6 rounded-full transition-colors relative ${shoppingBagEnabled ? "bg-gold-500" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${shoppingBagEnabled ? "left-6" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* 배송 기능 */}
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
        <div>
          <p className="text-sm font-medium text-gray-800">배송 기능</p>
          <p className="text-xs text-gray-400 mt-0.5">비활성화 시 맞춤 주문에서 배송 선택이 숨겨집니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!deliveryEnabled) {
              if (!deliveryFees["0-1"]) { setShowDeliveryFeeWarning(true); return; }
            }
            setDeliveryEnabled((prev) => !prev);
          }}
          className={`shrink-0 w-12 h-6 rounded-full transition-colors relative ${deliveryEnabled ? "bg-gold-500" : "bg-gray-200"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${deliveryEnabled ? "left-6" : "left-0.5"}`} />
        </button>
      </div>

      {/* 배송비 미설정 경고 */}
      {showDeliveryFeeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDeliveryFeeWarning(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">1km 이내 배송비를 먼저 설정해주세요</p>
                <p className="text-xs text-gray-400 mt-0.5">배송 기능을 활성화하려면 1km 이내 배송비가 필수입니다. 나머지 구간은 선택 사항입니다.</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              아래 <span className="font-medium text-gray-700">배송비 설정</span>에서 <span className="font-medium text-gray-700">1km 이내</span> 배송비를 입력하고 저장해주세요. 나머지 구간은 비워두면 해당 거리에서 고객에게 &ldquo;매장 문의&rdquo;로 안내됩니다.
            </p>
            <button
              type="button"
              onClick={() => setShowDeliveryFeeWarning(false)}
              className="w-full bg-gold-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gold-600 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 배송비 설정 */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700">배송비 설정</h3>
          <p className="text-xs text-gray-400 mt-0.5">거리별 배송비를 설정합니다. 비워두면 해당 구간은 표시되지 않습니다.</p>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {[
            { key: "0-1",   label: "1km 이내"   },
            { key: "1-3",   label: "1 ~ 3km"   },
            { key: "3-5",   label: "3 ~ 5km"   },
            { key: "5-10",  label: "5 ~ 10km"  },
            { key: "10-15", label: "10 ~ 15km" },
            { key: "15-20", label: "15 ~ 20km" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 bg-white">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={deliveryFees[key]}
                  onChange={(e) => setDeliveryFees((prev) => ({ ...prev, [key]: formatMoney(e.target.value) }))}
                  placeholder="미설정"
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-gray-400 bg-white"
                />
                <span className="text-xs text-gray-400">원</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 예약 확인 안내 문구 */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-gray-700">예약 확인 안내 문구</h3>
          <p className="text-xs text-gray-400 mt-0.5">고객이 예약을 완료하기 직전 확인 화면 상단에 표시됩니다.</p>
        </div>
        <textarea
          value={consultNotice}
          onChange={(e) => setConsultNotice(e.target.value)}
          placeholder={"예) 주문 후 입금까지 완료되어야 예약이 확정됩니다.\n당일 취소는 불가하오니 신중히 주문해주세요."}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 resize-none bg-white"
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-0 pt-4 pb-1 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="bg-gold-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gold-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : "저장"}
        </button>
        {success && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            저장되었습니다.
          </span>
        )}
      </div>
    </div>
  );
}

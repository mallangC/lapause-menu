"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import DaumPostcodeEmbed from "react-daum-postcode";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, parsePhone } from "@/lib/format";

interface Props {
  companyId: string;
  plan: "starter" | "pro" | "free";
}

function ProGate() {
  return (
    <div className="absolute inset-0 z-10 rounded-xl bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-center px-4">
      <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
      <p className="text-sm font-semibold text-gray-800">Pro 플랜에서 이용 가능합니다</p>
      <p className="text-xs text-gray-400">요금제 탭에서 Pro로 업그레이드하세요.</p>
    </div>
  );
}

export default function OrderSettingsTab({ companyId, plan }: Props) {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [showAddressDetail, setShowAddressDetail] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankAccountImageUrl, setBankAccountImageUrl] = useState<string | null>(null);
  const [bankImageUploading, setBankImageUploading] = useState(false);
  const [businessRegImageUrl, setBusinessRegImageUrl] = useState<string | null>(null);
  const [businessRegUploading, setBusinessRegUploading] = useState(false);
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessVerifiedAt, setBusinessVerifiedAt] = useState<string | null>(null);
  const [businessStatus, setBusinessStatus] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [consultApplyStatus, setConsultApplyStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [consultRejectReason, setConsultRejectReason] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialConsultFields = useRef({ bankName: "", bankAccount: "", bankHolder: "", businessNumber: "" });
  const bankImageInputRef = useRef<HTMLInputElement>(null);
  const businessRegInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("bank_name, bank_account, bank_holder, address, consult_enabled, business_number, business_verified_at, business_status, bank_account_image_url, business_registration_image_url, consult_apply_status, consult_reject_reason")
      .eq("company_id", companyId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.address) setAddress(data.address);
        if (data.bank_name) setBankName(data.bank_name);
        if (data.bank_account) setBankAccount(data.bank_account);
        if (data.bank_holder) setBankHolder(data.bank_holder);
        if (data.business_number) setBusinessNumber(data.business_number);
        if (data.business_verified_at) setBusinessVerifiedAt(data.business_verified_at);
        if (data.business_status) setBusinessStatus(data.business_status);
        if (data.bank_account_image_url) setBankAccountImageUrl(data.bank_account_image_url);
        if (data.business_registration_image_url) setBusinessRegImageUrl(data.business_registration_image_url);
        if (data.consult_apply_status) setConsultApplyStatus(data.consult_apply_status);
        if (data.consult_reject_reason) setConsultRejectReason(data.consult_reject_reason);
        setConsultEnabled(data.consult_enabled ?? false);
        initialConsultFields.current = {
          bankName: data.bank_name || "",
          bankAccount: data.bank_account || "",
          bankHolder: data.bank_holder || "",
          businessNumber: data.business_number || "",
        };
      });
    supabase
      .from("companies")
      .select("phone")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        if (data?.phone) setPhone(formatPhone(data.phone));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleBankImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankImageUploading(true);
    let uploadFile: File = file;
    if (file.type.startsWith("image/")) {
      uploadFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
    }
    const formData = new FormData();
    formData.append("file", uploadFile, file.name);
    formData.append("company_id", companyId);
    const res = await fetch("/api/company/bank-doc", { method: "POST", body: formData });
    if (res.ok) {
      setBankAccountImageUrl("uploaded");
      if (consultApplyStatus !== null) {
        setConsultApplyStatus(null);
        setConsultEnabled(false);
        await supabase.from("company_settings").update({ consult_apply_status: null, consult_enabled: false }).eq("company_id", companyId);
      }
    } else {
      const data = await res.json();
      setError("통장사본 업로드 실패: " + (data.error ?? "알 수 없는 오류"));
    }
    setBankImageUploading(false);
  };

  const handleViewBankDoc = async () => {
    const res = await fetch(`/api/company/bank-doc?company_id=${companyId}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    } else {
      setError("통장사본 조회에 실패했습니다.");
    }
  };

  const handleBusinessRegUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusinessRegUploading(true);
    let uploadFile: File = file;
    if (file.type.startsWith("image/")) {
      uploadFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 2048, useWebWorker: true });
    }
    const formData = new FormData();
    formData.append("file", uploadFile, file.name);
    formData.append("company_id", companyId);
    const res = await fetch("/api/company/business-doc", { method: "POST", body: formData });
    if (res.ok) {
      setBusinessRegImageUrl("uploaded");
      if (consultApplyStatus !== null) {
        setConsultApplyStatus(null);
        setConsultEnabled(false);
        await supabase.from("company_settings").update({ consult_apply_status: null, consult_enabled: false }).eq("company_id", companyId);
      }
    } else {
      const data = await res.json();
      setError("사업자등록증 업로드 실패: " + (data.error ?? "알 수 없는 오류"));
    }
    setBusinessRegUploading(false);
  };

  const handleViewBusinessReg = async () => {
    const res = await fetch(`/api/company/business-doc?company_id=${companyId}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    } else {
      setError("사업자등록증 조회에 실패했습니다.");
    }
  };

  const handleVerifyBusiness = async () => {
    setVerifying(true);
    setVerifyError(null);
    const res = await fetch("/api/verify-business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_number: businessNumber, company_id: companyId }),
    });
    const data = await res.json();
    if (res.ok) {
      setBusinessVerifiedAt(new Date().toISOString());
      setBusinessStatus(data.status);
      if (!data.isActive) {
        setVerifyError(`조회 결과: ${data.status}. 계속사업자만 등록 가능합니다.`);
        setBusinessVerifiedAt(null);
      }
    } else {
      setVerifyError(data.error ?? "인증에 실패했습니다.");
    }
    setVerifying(false);
  };

  const handleConsultApply = async () => {
    setApplying(true);
    const res = await fetch("/api/company/consult-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    const data = await res.json();
    if (res.ok) {
      setConsultApplyStatus("pending");
      setConsultEnabled(false);
    } else {
      setError(data.error ?? "신청에 실패했습니다.");
    }
    setApplying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const consultFieldsChanged =
      bankName !== initialConsultFields.current.bankName ||
      bankAccount !== initialConsultFields.current.bankAccount ||
      bankHolder !== initialConsultFields.current.bankHolder ||
      businessNumber !== initialConsultFields.current.businessNumber;
    const shouldResetConsult = consultFieldsChanged && consultApplyStatus !== null;

    const [{ error: companiesError }, { error: settingsError }] = await Promise.all([
      supabase.from("companies").update({ phone: parsePhone(phone) || null }).eq("id", companyId),
      supabase.from("company_settings").update({
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        bank_holder: bankHolder || null,
        bank_account_image_url: bankAccountImageUrl || null,
        business_number: businessNumber || null,
        address: address ? (addressDetail ? `${address} ${addressDetail}` : address) : null,
        ...(shouldResetConsult ? { consult_apply_status: null, consult_enabled: false } : {}),
      }).eq("company_id", companyId),
    ]);

    const combinedError = companiesError || settingsError;
    if (combinedError) {
      setError(combinedError.message);
    } else {
      if (shouldResetConsult) {
        setConsultApplyStatus(null);
        setConsultEnabled(false);
        initialConsultFields.current = { bankName, bankAccount, bankHolder, businessNumber };
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const disabledByConsult = consultEnabled;

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-medium text-gray-900 mb-6">주문 설정</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-700">예약 알림 정보</h3>
            {consultEnabled && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">맞춤 주문 활성화 중 — 수정 불가</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">맞춤 주문 기능 활성화 및 카카오 알림톡 발송에 사용됩니다.<br />모든 항목을 입력해야 맞춤 주문을 활성화할 수 있습니다.</p>

          <div className={`space-y-3 ${disabledByConsult ? "opacity-50 pointer-events-none select-none" : ""}`}>
            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">매장 전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="010-1234-5678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1.5">따로 매장 전화번호가 없다면 핸드폰번호를 다시 입력해주세요.</p>
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">매장 주소</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    readOnly
                    onClick={() => setShowPostcode(true)}
                    placeholder="주소 검색을 눌러주세요"
                    className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPostcode(true)}
                    className="shrink-0 px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-gray-500 bg-white transition-colors whitespace-nowrap"
                  >
                    찾기
                  </button>
                </div>
                {showAddressDetail && (
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="상세주소 (동/호수 등)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                  />
                )}
                {showPostcode && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">주소 검색</span>
                      <button type="button" onClick={() => setShowPostcode(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                    </div>
                    <DaumPostcodeEmbed
                      onComplete={(data) => {
                        setAddress(data.roadAddress || data.jibunAddress);
                        setAddressDetail("");
                        setShowPostcode(false);
                        setShowAddressDetail(true);
                      }}
                      style={{ height: 400 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 은행 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">은행</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 국민은행"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* 계좌번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="예: 000-0000-0000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* 예금주 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예금주</label>
              <input
                type="text"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">계좌번호를 잘못 적어서 생기는 불이익은 책임지지 않습니다.</p>
        </div>

        {/* Pro 전용: 통장사본, 사업자등록증, 사업자 정보, 맞춤 주문 신청 */}
        <div className="relative">
          {plan === "starter" && <ProGate />}
          <div className={plan === "starter" ? "pointer-events-none select-none" : ""}>

            {/* 통장사본 */}
            <div className={disabledByConsult ? "opacity-50 pointer-events-none select-none" : ""}>
              <label className="block text-sm font-medium text-gray-700 mb-1">통장사본</label>
              <p className="text-xs text-gray-400 mb-2">정산 처리를 위해 계좌 확인용으로 사용됩니다.</p>
              {bankAccountImageUrl ? (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleViewBankDoc} className="text-xs text-blue-500 hover:underline">통장사본 확인</button>
                  <button type="button" onClick={() => setBankAccountImageUrl(null)} className="text-xs text-gray-400 hover:text-red-400">삭제</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bankImageInputRef.current?.click()}
                  disabled={bankImageUploading}
                  className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                >
                  {bankImageUploading ? "업로드 중..." : "+ 통장사본 업로드"}
                </button>
              )}
              <input ref={bankImageInputRef} type="file" accept="image/*,application/pdf" onChange={handleBankImageUpload} className="hidden" />
            </div>

            {/* 사업자 정보 */}
            <div className={`pt-2${disabledByConsult ? " opacity-50 pointer-events-none select-none" : ""}`}>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">사업자 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={businessNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                        const formatted = raw.length <= 3 ? raw : raw.length <= 5 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
                        setBusinessNumber(formatted);
                        setBusinessVerifiedAt(null);
                        setBusinessStatus(null);
                        setVerifyError(null);
                      }}
                      placeholder="000-00-00000"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyBusiness}
                      disabled={verifying || businessNumber.replace(/\D/g, "").length !== 10}
                      className="shrink-0 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-500 bg-white transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      {verifying ? "조회 중..." : "인증"}
                    </button>
                  </div>
                  {businessVerifiedAt && businessStatus && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      인증 완료 · {businessStatus} · {new Date(businessVerifiedAt).toLocaleDateString("ko-KR")}
                    </div>
                  )}
                  {verifyError && <p className="mt-2 text-xs text-red-500">{verifyError}</p>}
                </div>

                {/* 사업자등록증 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록증</label>
                  <p className="text-xs text-gray-400 mb-2">본인 명의 사업자 확인용으로 사용됩니다. 사진 또는 PDF로 업로드하세요.</p>
                  {businessRegImageUrl ? (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handleViewBusinessReg} className="text-xs text-blue-500 hover:underline">사업자등록증 확인</button>
                      <button type="button" onClick={() => setBusinessRegImageUrl(null)} className="text-xs text-gray-400 hover:text-red-400">삭제</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => businessRegInputRef.current?.click()}
                      disabled={businessRegUploading}
                      className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                      {businessRegUploading ? "업로드 중..." : "+ 사업자등록증 업로드"}
                    </button>
                  )}
                  <input ref={businessRegInputRef} type="file" accept="image/*,application/pdf" onChange={handleBusinessRegUpload} className="hidden" />
                </div>
              </div>
            </div>

            {/* 맞춤 주문 신청 */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">맞춤 주문 신청</h3>
              {consultApplyStatus === "pending" && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm text-yellow-700">
                  검토 중입니다. 운영자 확인 후 안내드리겠습니다.
                </div>
              )}
              {consultApplyStatus === "approved" && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
                  승인되었습니다. 맞춤 주문 탭에서 활성화할 수 있습니다.
                </div>
              )}
              {consultApplyStatus === "rejected" && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 space-y-1">
                  <div className="font-medium">반려되었습니다.</div>
                  {consultRejectReason && <div className="text-xs">{consultRejectReason}</div>}
                </div>
              )}
              {(!consultApplyStatus || consultApplyStatus === "rejected") && (() => {
                const canApply = !!businessVerifiedAt && !!bankAccountImageUrl && !!businessRegImageUrl && !!bankName && !!bankAccount && !!bankHolder;
                return (
                  <div className="space-y-2 mt-2">
                    {!canApply && (
                      <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
                        {!businessVerifiedAt && <li>사업자등록번호 인증 필요</li>}
                        {!bankAccountImageUrl && <li>통장사본 업로드 필요</li>}
                        {!businessRegImageUrl && <li>사업자등록증 업로드 필요</li>}
                        {(!bankName || !bankAccount || !bankHolder) && <li>계좌 정보 입력 필요</li>}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={handleConsultApply}
                      disabled={!canApply || applying}
                      className="px-5 py-2.5 bg-gold-500 text-white text-sm rounded-lg hover:bg-gold-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {applying ? "신청 중..." : "맞춤 주문 신청하기"}
                    </button>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 -mx-0 pt-4 pb-1 flex items-center gap-3">
          <button
            type="submit"
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
      </form>
    </div>
  );
}

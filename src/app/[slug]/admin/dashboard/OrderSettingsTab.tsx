"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import DaumPostcodeEmbed from "react-daum-postcode";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, parsePhone } from "@/lib/format";
import SaveButton, { SaveButtonHandle } from "@/components/admin/SaveButton";
import { notifyMenuChanged } from "@/lib/menuCacheClient";
import type { CompanySettings } from "./companySettings";
import { useSettingsSync } from "./useSettingsSync";

interface Props {
  companyId: string;
  plan: "monthly" | "annual" | "none" | "free";
  settings: CompanySettings;
  onSettingsSaved: (patch: CompanySettings) => void;
}

export default function OrderSettingsTab({ companyId, plan: _plan, settings, onSettingsSaved }: Props) {
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
  const [mailOrderNumber, setMailOrderNumber] = useState("");
  const [soldCount, setSoldCount] = useState(0);
  const [businessVerifiedAt, setBusinessVerifiedAt] = useState<string | null>(null);
  const [businessStatus, setBusinessStatus] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [consultApplyStatus, setConsultApplyStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [consultRejectReason, setConsultRejectReason] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [consultEnabled, setConsultEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialConsultFields = useRef({ bankName: "", bankAccount: "", bankHolder: "", businessNumber: "" });
  const bankImageInputRef = useRef<HTMLInputElement>(null);
  const businessRegInputRef = useRef<HTMLInputElement>(null);
  const saveBtnRef = useRef<SaveButtonHandle>(null);
  const supabase = createClient();

  // 매장 설정은 대시보드가 한 번 받아둔 값을 사용 (DB 재조회 없음)
  const markOwnSave = useSettingsSync(settings, (data) => {
    if (data.address) setAddress(data.address);
    if (data.bank_name) setBankName(data.bank_name);
    if (data.bank_account) setBankAccount(data.bank_account);
    if (data.bank_holder) setBankHolder(data.bank_holder);
    if (data.business_number) setBusinessNumber(data.business_number);
    if (data.mail_order_number) setMailOrderNumber(data.mail_order_number);
    setSoldCount(data.sold_count ?? 0);
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
  // 이 탭에서 저장한 값을 공유 설정에도 반영 (다른 탭이 최신 값을 보도록)
  const saveShared = (patch: CompanySettings) => { markOwnSave(); onSettingsSaved(patch); };

  useEffect(() => {
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
      saveShared({ bank_account_image_url: "uploaded" });
      if (consultApplyStatus !== null) {
        setConsultApplyStatus(null);
        setConsultEnabled(false);
        await supabase.from("company_settings").update({ consult_apply_status: null, consult_enabled: false }).eq("company_id", companyId);
        notifyMenuChanged();
        saveShared({ consult_apply_status: null, consult_enabled: false });
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
      saveShared({ business_registration_image_url: "uploaded" });
      if (consultApplyStatus !== null) {
        setConsultApplyStatus(null);
        setConsultEnabled(false);
        await supabase.from("company_settings").update({ consult_apply_status: null, consult_enabled: false }).eq("company_id", companyId);
        notifyMenuChanged();
        saveShared({ consult_apply_status: null, consult_enabled: false });
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
      const verifiedAt = data.isActive ? new Date().toISOString() : null;
      setBusinessVerifiedAt(verifiedAt);
      setBusinessStatus(data.status);
      saveShared({ business_verified_at: verifiedAt, business_status: data.status });
      if (!data.isActive) {
        setVerifyError(`조회 결과: ${data.status}. 계속사업자만 등록 가능합니다.`);
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
      saveShared({ consult_apply_status: "pending", consult_enabled: false });
    } else {
      setError(data.error ?? "신청에 실패했습니다.");
    }
    setApplying(false);
  };

  const handleSave = async () => {
    setError(null);

    const consultFieldsChanged =
      bankName !== initialConsultFields.current.bankName ||
      bankAccount !== initialConsultFields.current.bankAccount ||
      bankHolder !== initialConsultFields.current.bankHolder ||
      businessNumber !== initialConsultFields.current.businessNumber;
    const shouldResetConsult = consultFieldsChanged && consultApplyStatus !== null;

    const settingsPatch = {
      bank_name: bankName || null,
      bank_account: bankAccount || null,
      bank_holder: bankHolder || null,
      bank_account_image_url: bankAccountImageUrl || null,
      business_number: businessNumber || null,
      mail_order_number: mailOrderNumber || null,
      address: address ? (addressDetail ? `${address} ${addressDetail}` : address) : null,
      ...(shouldResetConsult ? { consult_apply_status: null, consult_enabled: false } : {}),
      };
    const [{ error: companiesError }, { error: settingsError }] = await Promise.all([
      supabase.from("companies").update({ phone: parsePhone(phone) || null }).eq("id", companyId),
      supabase.from("company_settings").update(settingsPatch).eq("company_id", companyId),
    ]);

    const combinedError = companiesError || settingsError;
    if (combinedError) {
      setError(combinedError.message);
      return false;
    }
    saveShared({ ...settingsPatch, company_phone: parsePhone(phone) || null });
    // 전화번호·사업자번호·통신판매업 번호·주소는 메뉴판 하단 사업자 정보에 노출된다
    notifyMenuChanged();
    if (shouldResetConsult) {
      setConsultApplyStatus(null);
      setConsultEnabled(false);
      initialConsultFields.current = { bankName, bankAccount, bankHolder, businessNumber };
    }
  };

  const disabledByConsult = consultEnabled;

  return (
    // 섹션마다 흰 카드로 나눠 회색 바탕이 굵은 구분선처럼 보이게 한다 (영업·판매 설정과 같은 방식)
    <div className="space-y-3">
      <h2 className="text-xl font-medium text-gray-900">판매 신청</h2>
      <form onSubmit={(e) => { e.preventDefault(); saveBtnRef.current?.trigger(); }} className="space-y-3">
      {/* 예약 알림 정보 — 통신판매업 안내·오류 문구도 이 첫 카드 맨 위에 */}
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-md">
          {!mailOrderNumber && (
            <div className={`mb-5 p-4 rounded-xl border flex items-center justify-between gap-3 ${
              soldCount >= 31 ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"
            }`}>
              <div>
                <p className={`text-sm font-semibold ${soldCount >= 31 ? "text-red-700" : "text-yellow-700"}`}>현재 통신판매업 신고가 되어있지 않습니다</p>
                <p className={`text-xs mt-0.5 ${soldCount >= 31 ? "text-red-500" : "text-yellow-600"}`}>
                  {soldCount >= 50
                    ? "판매 수량이 50개를 초과해 판매가 정지되었습니다. 통신판매업 신고번호를 등록해주세요."
                    : soldCount >= 31
                    ? "판매 수량이 31개를 넘었습니다. 50개 판매 시 자동으로 판매가 정지됩니다. 통신판매업 신고번호를 등록해주세요."
                    : "신고번호를 등록하지 않으면 50개 판매 시 판매가 자동으로 정지됩니다."}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold ${soldCount >= 31 ? "text-red-600" : "text-yellow-700"}`}>{Math.min(soldCount, 50)}/50</span>
            </div>
          )}

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-800">예약 알림 정보</h3>
                {consultEnabled && (
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">맞춤 주문 활성화 중 — 수정 불가</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-3">맞춤 주문 기능 활성화 및 카카오 알림톡 발송에 사용됩니다.</p>

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
                  <p className="text-xs text-gray-400 mt-1.5">계좌번호를 잘못 적어서 생기는 불이익은 책임지지 않습니다.</p>
                </div>

                {/* 통장사본 — 계좌 정보 바로 아래 (같은 카드) */}
                <div>
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
              </div>
            </div>

        </div>
      </div>

      {/* 사업자 정보 */}
      <div className="bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:p-6">
        <div className="max-w-md">
            <div className={disabledByConsult ? "opacity-50 pointer-events-none select-none" : ""}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">사업자 정보</h3>
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

                {/* 통신판매업 신고번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">통신판매업 신고번호</label>
                  <p className="text-xs text-gray-400 mb-2">
                    상품을 50개 판매하기 전 통신판매업 신고를 해주세요.<br />
                    통신판매업 미신고 상태로 50개 판매 시 판매가 정지됩니다.
                  </p>
                  <input
                    type="text"
                    value={mailOrderNumber}
                    onChange={(e) => setMailOrderNumber(e.target.value)}
                    placeholder="예: 제2024-서울강남-0000호"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
            </div>

        </div>
      </div>

      {/* 판매 신청 — 마지막 카드: 아래 저장 줄과 붙여 한 카드처럼 보이게 아래 모서리는 각지게.
          Tailwind v4의 space-y는 앞 요소 아래 여백(margin-bottom)으로 간격을 두므로 !mb-0으로 틈을 없앤다 */}
      <div className="!mb-0 bg-white -mx-4 md:mx-0 py-5 px-4 md:rounded-2xl md:rounded-b-none md:p-6">
        <div className="max-w-md">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">판매 신청</h3>
              <p className="text-xs text-gray-400 mb-3">통신판매업 신고번호를 제외한 모든 항목을 입력·업로드해야 신청할 수 있습니다.</p>
              {consultApplyStatus === "pending" && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm text-yellow-700">
                  검토 중입니다. 운영자 확인 후 안내드리겠습니다.
                </div>
              )}
              {consultApplyStatus === "approved" && (
                <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
                  승인되었습니다. 판매 설정 탭에서 활성화할 수 있습니다.
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

      {/* 저장 — 카드 밖(폼 안)에 두어 어느 섹션을 보고 있어도 화면 아래에 붙어 있게 하고, 위 카드와는 옅은 회색 선으로만 구분 */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-gray-100 -mx-4 md:mx-0 px-4 md:px-6 py-3 md:rounded-b-2xl flex items-center gap-3">
        <SaveButton
          ref={saveBtnRef}
          onSave={handleSave}
          className="text-sm font-medium text-white bg-gold-500 hover:bg-gold-600"
        />
      </div>
      </form>
    </div>
  );
}

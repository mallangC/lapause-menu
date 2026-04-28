"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";

interface Company {
  id: string;
  name: string;
}

interface PendingItem {
  company_id: string;
  company_name: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  business_number: string | null;
  reservation_count: number;
  total_amount: number;
  reservation_ids: string[];
}

interface Settlement {
  id: string;
  company_id: string;
  company_name: string;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  business_number: string | null;
  period_start: string;
  period_end: string;
  year_month: string;
  total_amount: number;
  status: "pending" | "completed" | "cancelled";
  transferred_at: string | null;
  transfer_memo: string | null;
  tax_invoice_number: string | null;
  tax_invoice_issued_at: string | null;
  reservation_count: number;
}

interface Props {
  companies: Company[];
}

type InnerTab = "target" | "history";

export default function SettlementsTab({ companies }: Props) {
  const [innerTab, setInnerTab] = useState<InnerTab>("target");

  // 정산 대상 탭
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);
  const [periodStart, setPeriodStart] = useState(firstOfMonth);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [pendingItems, setPendingItems] = useState<PendingItem[] | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);

  // 이체 완료 모달
  const [completeModal, setCompleteModal] = useState(false);
  const [transferredAt, setTransferredAt] = useState(now.toISOString().slice(0, 10));
  const [transferMemo, setTransferMemo] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);

  // 정산 내역 탭
  const [history, setHistory] = useState<Settlement[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(thisMonth);

  // 세금계산서 모달
  const [taxModal, setTaxModal] = useState<Settlement | null>(null);
  const [taxNumber, setTaxNumber] = useState("");
  const [taxIssuedAt, setTaxIssuedAt] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!periodStart || !periodEnd) return;
    setPendingLoading(true);
    const res = await fetch(
      `/api/operator/settlements/pending?period_start=${periodStart}&period_end=${periodEnd}`
    );
    if (res.ok) setPendingItems(await res.json());
    setPendingLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart, periodEnd]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    const res = await fetch("/api/operator/settlements");
    if (res.ok) {
      const data: Settlement[] = await res.json();
      setHistory(data.filter(s => s.year_month === historyMonth));
    }
    setHistoryLoading(false);
  }, [historyMonth]);

  const handleDownloadExcel = () => {
    if (!pendingItems?.length) return;

    const rows = pendingItems.map((item, idx) => ({
      순번: idx + 1,
      수취인명: item.bank_holder ?? "",
      수취은행: item.bank_name ?? "",
      수취계좌번호: item.bank_account ?? "",
      이체금액: item.total_amount,
      적요: `${periodStart}~${periodEnd} 정산`,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // 계좌번호 컬럼을 텍스트 형식으로 (앞자리 0 보존)
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
      if (cell) cell.z = "@";
    }

    // 컬럼 너비
    ws["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "대량이체");
    XLSX.writeFile(wb, `신한_대량이체_${periodStart}_${periodEnd}.xlsx`);
  };

  const handleComplete = async () => {
    if (!pendingItems?.length || !transferredAt) return;
    setCompleteLoading(true);

    const res = await fetch("/api/operator/settlements/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: pendingItems.map(i => ({
          company_id: i.company_id,
          total_amount: i.total_amount,
          reservation_ids: i.reservation_ids,
        })),
        period_start: periodStart,
        period_end: periodEnd,
        transferred_at: transferredAt,
        transfer_memo: transferMemo || null,
      }),
    });

    if (res.ok) {
      setCompleteModal(false);
      setPendingItems(null);
      alert("정산 완료 처리되었습니다.");
    } else {
      const data = await res.json();
      alert(data.error ?? "오류가 발생했습니다.");
    }
    setCompleteLoading(false);
  };

  const handleTaxInvoice = async () => {
    if (!taxModal) return;
    setTaxLoading(true);
    const res = await fetch(`/api/operator/settlements/${taxModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "tax_invoice",
        tax_invoice_number: taxNumber,
        tax_invoice_issued_at: taxIssuedAt || null,
      }),
    });
    if (res.ok) {
      setTaxModal(null);
      fetchHistory();
    } else {
      const data = await res.json();
      alert(data.error ?? "오류가 발생했습니다.");
    }
    setTaxLoading(false);
  };

  const fmt = (s: string | null) => s ? s.slice(0, 10) : "—";
  const fmtMoney = (n: number) => n.toLocaleString() + "원";
  const totalAmount = pendingItems?.reduce((sum, i) => sum + i.total_amount, 0) ?? 0;

  // 월 옵션 (최근 12개월)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <div className="space-y-4">
      {/* 이너 탭 */}
      <div className="flex border-b border-gray-200">
        {([
          { key: "target", label: "정산 대상" },
          { key: "history", label: "정산 내역" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setInnerTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              innerTab === tab.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 정산 대상 탭 ── */}
      {innerTab === "target" && (
        <div className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-400 mb-1">시작일</label>
              <input
                type="date"
                value={periodStart}
                onChange={e => { setPeriodStart(e.target.value); setPendingItems(null); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <span className="text-gray-400 pb-2">~</span>
            <div>
              <label className="block text-xs text-gray-400 mb-1">종료일</label>
              <input
                type="date"
                value={periodEnd}
                min={periodStart}
                onChange={e => { setPeriodEnd(e.target.value); setPendingItems(null); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={fetchPending}
              disabled={pendingLoading || !periodStart || !periodEnd}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {pendingLoading ? "조회 중..." : "정산 대상 조회"}
            </button>
          </div>

          {pendingItems !== null && (
            <>
              {pendingItems.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center text-gray-300 text-sm">
                  {periodStart} ~ {periodEnd} 기간에 정산할 내역이 없습니다.
                </div>
              ) : (
                <>
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs text-gray-400">
                            <th className="text-left px-6 py-3 font-medium">매장</th>
                            <th className="text-left px-6 py-3 font-medium">은행</th>
                            <th className="text-left px-6 py-3 font-medium">계좌번호</th>
                            <th className="text-left px-6 py-3 font-medium">예금주</th>
                            <th className="text-right px-6 py-3 font-medium">예약 수</th>
                            <th className="text-right px-6 py-3 font-medium">정산 금액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pendingItems.map(item => (
                            <tr key={item.company_id} className="hover:bg-gray-50">
                              <td className="px-6 py-3.5">
                                <div className="font-medium text-gray-900">{item.company_name}</div>
                                {item.business_number && (
                                  <div className="text-xs text-gray-400">{item.business_number}</div>
                                )}
                              </td>
                              <td className="px-6 py-3.5 text-gray-600">{item.bank_name ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-6 py-3.5 font-mono text-gray-700">{item.bank_account ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-6 py-3.5 text-gray-600">{item.bank_holder ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-6 py-3.5 text-right text-gray-700">{item.reservation_count}건</td>
                              <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{fmtMoney(item.total_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-100 bg-gray-50">
                            <td colSpan={5} className="px-6 py-3 text-sm text-gray-500 font-medium">
                              총 {pendingItems.length}개 매장
                            </td>
                            <td className="px-6 py-3 text-right text-base font-bold text-gray-900">
                              {fmtMoney(totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleDownloadExcel}
                      className="px-5 py-2.5 border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <span>엑셀 다운로드</span>
                      <span className="text-xs text-gray-400">(신한 대량이체)</span>
                    </button>
                    <button
                      onClick={() => {
                        setTransferredAt(now.toISOString().slice(0, 10));
                        setTransferMemo("");
                        setCompleteModal(true);
                      }}
                      className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      이체 완료 처리
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 정산 내역 탭 ── */}
      {innerTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">월 선택</label>
              <select
                value={historyMonth}
                onChange={e => { setHistoryMonth(e.target.value); setHistory(null); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {historyLoading ? "조회 중..." : "조회"}
            </button>
          </div>

          {history !== null && (
            history.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl px-6 py-12 text-center text-gray-300 text-sm">
                {historyMonth}에 정산 내역이 없습니다.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th className="text-left px-6 py-3 font-medium">매장</th>
                        <th className="text-left px-6 py-3 font-medium">정산 기간</th>
                        <th className="text-right px-6 py-3 font-medium">예약</th>
                        <th className="text-right px-6 py-3 font-medium">금액</th>
                        <th className="text-left px-6 py-3 font-medium">이체일</th>
                        <th className="text-left px-6 py-3 font-medium">세금계산서</th>
                        <th className="text-left px-6 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3.5">
                            <div className="font-medium text-gray-900">{s.company_name}</div>
                            {s.business_number && <div className="text-xs text-gray-400">{s.business_number}</div>}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {fmt(s.period_start)} ~ {fmt(s.period_end)}
                          </td>
                          <td className="px-6 py-3.5 text-right text-gray-700">{s.reservation_count}건</td>
                          <td className="px-6 py-3.5 text-right font-semibold text-gray-900 whitespace-nowrap">{fmtMoney(s.total_amount)}</td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">
                            {s.transferred_at ? (
                              <>
                                <div>{fmt(s.transferred_at)}</div>
                                {s.transfer_memo && <div className="text-gray-400">{s.transfer_memo}</div>}
                              </>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-3.5 text-xs">
                            {s.tax_invoice_number ? (
                              <div className="text-gray-700 font-medium">{s.tax_invoice_number}</div>
                            ) : (
                              <span className="text-gray-300">미등록</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              onClick={() => {
                                setTaxModal(s);
                                setTaxNumber(s.tax_invoice_number ?? "");
                                setTaxIssuedAt(s.tax_invoice_issued_at?.slice(0, 10) ?? "");
                              }}
                              className="px-2.5 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                              세금계산서
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 이체 완료 모달 */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">이체 완료 처리</h3>
            <p className="text-xs text-gray-400 mb-4">
              {pendingItems?.length}개 매장 · 합계 {fmtMoney(totalAmount)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">이체일 *</label>
                <input
                  type="date"
                  value={transferredAt}
                  onChange={e => setTransferredAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">메모 (선택)</label>
                <input
                  type="text"
                  value={transferMemo}
                  onChange={e => setTransferMemo(e.target.value)}
                  placeholder={`${periodStart}~${periodEnd} 정산`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setCompleteModal(false)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleComplete}
                disabled={completeLoading || !transferredAt}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {completeLoading ? "처리 중..." : "완료 처리"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세금계산서 모달 */}
      {taxModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-1">세금계산서 등록</h3>
            <p className="text-xs text-gray-400 mb-4">
              {taxModal.company_name} · {taxModal.year_month}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">세금계산서 번호 *</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={e => setTaxNumber(e.target.value)}
                  placeholder="홈택스 발행 번호"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">발행일</label>
                <input
                  type="date"
                  value={taxIssuedAt}
                  onChange={e => setTaxIssuedAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setTaxModal(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={handleTaxInvoice}
                disabled={taxLoading || !taxNumber}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {taxLoading ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

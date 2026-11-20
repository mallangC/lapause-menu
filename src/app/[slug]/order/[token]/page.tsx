import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getMenuData } from "@/lib/menuCache";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/format";
import StoreImage from "@/components/StoreImage";
import StoreFooter from "@/components/main/StoreFooter";
import PhotoSaveButton from "./PhotoSaveButton";

// 손님 주문 확인 페이지 — 확정 알림톡·결제 완료 화면의 [주문 확인하기]로 연다 (로그인 없이, 주문마다 추측할 수 없는 코드)
// 진행 단계(택배 배송 현황처럼) · 주문 내용 · 매장 안내(주소·주차·연락) · 메뉴판과 같은 바로가기
// 수령 완료(또는 취소) 7일 뒤에는 닫는다 — 링크가 다른 사람에게 전달될 수 있어 전화번호는 가린다

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "주문 확인", robots: { index: false, follow: false } };

/** 수령 완료·취소 후 링크를 열어 두는 기간 */
const OPEN_DAYS = 7;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const dateLabel = (d: string | null) => {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${WEEKDAYS[dt.getDay()]})`;
};
/** 단계 옆 시각 (한국 시간) — 예: 11/20 14:02 */
const stamp = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/\. /g, "/").replace(/\.$/, "").replace(/\/(\d\d:\d\d)/, " $1")
    : null;
/** 010-****-5678 */
const maskPhone = (p: string | null) => {
  const f = formatPhone(p ?? "");
  const parts = f.split("-");
  return parts.length === 3 ? `${parts[0]}-****-${parts[2]}` : f;
};

type Item = { type?: string; name?: string; price?: number; quantity?: number; product_id?: string | null };

export default async function OrderStatusPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{16,64}$/i.test(token)) notFound();
  const menu = await getMenuData(slug);
  if (!menu) notFound();

  const db = createAdminClient();
  const { data: r } = await db
    .from("reservations")
    .select("id, company_id, status, created_at, orderer_name, orderer_phone, items, final_price, delivery_type, desired_date, desired_time, recipient_name, address, address_detail, payment_method, paid, deleted_at")
    .eq("order_token", token)
    .maybeSingle();
  // 다른 매장 주소로 열었거나 지운 주문이면 없는 주문으로
  if (!r || r.company_id !== menu.company.id || r.deleted_at) notFound();

  // 단계별 시각 — 상태가 바뀐 기록에서
  const [{ data: logs }, { data: extra }, { data: photoRows }] = await Promise.all([
    db.from("reservation_logs").select("created_at, new_value, reason").eq("reservation_id", r.id).eq("action", "status_change").order("created_at", { ascending: true }),
    db.from("company_settings").select("parking").eq("company_id", r.company_id).maybeSingle(),
    // 사장님이 올린 완성 사진 (없으면 이 칸 자체를 보여주지 않는다)
    db.from("reservation_photos").select("id, image_url").eq("reservation_id", r.id).order("created_at", { ascending: true }),
  ]);
  const photos = (photoRows ?? []) as { id: string; image_url: string }[];
  const at = (status: string, last = false) => {
    const list = (logs ?? []).filter((l) => l.new_value === status);
    return (last ? list[list.length - 1] : list[0])?.created_at ?? null;
  };
  const confirmedAt = at("준비중");
  const madeAt = at("제작완료");
  // 수령 완료 기록이 없으면(예전 주문 등) 받는 날 다음 날을 완료로 본다
  const doneAt = at("픽업/배송완료", true) ?? (r.status === "픽업/배송완료" && r.desired_date ? `${r.desired_date}T23:59:00+09:00` : null);
  const cancelLog = (logs ?? []).filter((l) => l.new_value === "취소").pop();
  const cancelledAt = cancelLog?.created_at ?? null;

  const s = menu.settings as Record<string, unknown>;
  const company = menu.company;
  const companyName = company.name ?? slug;
  const logo = (s.logo_image as string | null) ?? null;
  const storeAddress = (s.address as string | null) ?? null;
  const locationUrl = (s.location_url as string | null) ?? null;
  const kakaoUrl = (s.kakao_channel_url as string | null) ?? null;
  const storePhone = company.phone ? formatPhone(company.phone) : null;
  const parking = (extra as { parking?: string | null } | null)?.parking ?? null;
  const footer = {
    companyName,
    locationUrl,
    kakaoChannelUrl: kakaoUrl,
    instagramUrl: (s.instagram_url as string | null) ?? null,
    youtubeUrl: (s.youtube_url as string | null) ?? null,
    phone: storePhone,
    representativeName: menu.ownerName ?? null,
    businessNumber: (s.business_number as string | null) ?? null,
    mailOrderNumber: (s.mail_order_number as string | null) ?? null,
    address: storeAddress,
  };

  const header = (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
        <Link href={`/${slug}`} className="flex items-center gap-2">
          {logo ? <StoreImage src={logo} alt={companyName} width={160} height={40} className="h-9 w-auto object-contain" /> : <span className="text-lg font-medium text-gold-600">{companyName}</span>}
        </Link>
      </div>
    </header>
  );

  // 수령 완료·취소 후 7일이 지나면 닫는다
  const closedFrom = r.status === "취소" ? cancelledAt : r.status === "픽업/배송완료" ? doneAt : null;
  if (closedFrom && Date.now() > new Date(closedFrom).getTime() + OPEN_DAYS * 86_400_000) {
    return (
      <div className="min-h-screen bg-beige-100 flex flex-col">
        {header}
        <main className="flex-1 max-w-lg w-full mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-lg font-medium text-gray-900">확인 기간이 지난 주문이에요</p>
          <p className="text-sm text-gray-500 break-keep">주문 확인 페이지는 수령 후 {OPEN_DAYS}일 동안 열려 있어요.<br />궁금한 점은 매장으로 문의해 주세요.</p>
          <Link href={`/${slug}/menu`} className="inline-block mt-2 px-6 py-3 rounded-full bg-gold-500 text-white text-sm font-medium">메뉴판 보기</Link>
        </main>
        <StoreFooter {...footer} />
      </div>
    );
  }

  const isDelivery = r.delivery_type === "배송";
  const items = (Array.isArray(r.items) ? r.items : []) as Item[];
  // 상품 사진 (지금 상품 사진 — 사장님 스타일·사진 주문은 상품이 없어 사진 없이)
  const productIds = items.map((i) => i.product_id).filter((x): x is string => !!x);
  const { data: prods } = productIds.length ? await db.from("products").select("id, image_url").in("id", productIds) : { data: [] };
  const imageOf = new Map((prods ?? []).map((p) => [p.id as string, p.image_url as string | null]));

  // 진행 단계 — 접수 → 확정·준비 중 → 제작 완료 → 픽업 완료 / 배송 출발
  const level = { 미확인: 0, 준비중: 1, 제작완료: 2, "픽업/배송완료": 3 }[r.status as string] ?? 0;
  const transferWaiting = r.payment_method === "transfer" && !r.paid && level === 0;
  const steps = [
    { label: "주문 접수", sub: transferWaiting ? "입금이 확인되면 사장님이 예약을 확정해요" : "사장님이 주문을 확인하고 있어요", at: r.created_at as string },
    { label: "예약 확정", sub: "꽃을 준비하고 있어요", at: confirmedAt },
    { label: "제작 완료", sub: isDelivery ? "곧 배송을 출발해요" : "준비가 끝났어요. 찾으러 오시면 돼요", at: madeAt },
    { label: isDelivery ? "배송 출발" : "픽업 완료", sub: isDelivery ? "기사님이 받는 분께 전달하고 있어요" : "찾아가 주셔서 감사해요", at: doneAt },
  ];

  // 모바일은 좌우 끝까지 (카드 사이 바탕색이 구분선처럼), PC는 둥근 카드
  const card = "bg-white -mx-4 md:mx-0 px-4 py-5 md:p-5 md:rounded-2xl";
  const row = (label: string, value: React.ReactNode) => (
    <div key={label} className="flex gap-3 text-sm">
      <dt className="w-16 shrink-0 text-gray-400">{label}</dt>
      <dd className="flex-1 text-gray-800 break-keep">{value}</dd>
    </div>
  );

  return (
    <div className="min-h-screen bg-beige-100 flex flex-col">
      {header}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 space-y-3">
        <div className="px-1">
          <p className="text-sm text-gray-500">{r.orderer_name}님의 주문</p>
          <h1 className="text-xl font-semibold text-gray-900 mt-0.5">
            {r.status === "취소" ? "주문이 취소됐어요" : `${dateLabel(r.desired_date)}${r.desired_time ? ` ${r.desired_time}` : ""} ${isDelivery ? "배송" : "픽업"}`}
          </h1>
        </div>

        {/* 진행 단계 */}
        {r.status === "취소" ? (
          <div className={card}>
            <p className="text-sm text-gray-700">주문이 취소됐어요.{cancelLog?.reason ? ` (사유: ${cancelLog.reason})` : ""}</p>
            {/* 환불 안내 — 결제(입금)한 주문만 (입금 전에 취소된 무통장 주문은 낼 돈이 없었다) */}
            <p className="text-xs text-gray-400 mt-1 break-keep">
              {r.paid ? (r.payment_method === "transfer" ? "입금하신 금액은 매장에서 환불해 드려요. " : "결제하신 금액은 결제 수단으로 환불돼요. ") : ""}궁금한 점은 매장으로 문의해 주세요.
            </p>
          </div>
        ) : (
          <div className={card}>
            <ol className="relative">
              {steps.map((st, i) => {
                const done = i <= level;
                const current = i === level;
                const last = i === steps.length - 1;
                return (
                  <li key={st.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {/* 세로 줄 */}
                    {!last && <span aria-hidden className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${i < level ? "bg-gold-400" : "bg-gray-200"}`} />}
                    <span className={`relative z-[1] mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-gold-500" : "bg-white border-2 border-gray-200"}`}>
                      {done && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-[15px] ${current ? "font-semibold text-gray-900" : done ? "text-gray-700" : "text-gray-400"}`}>{st.label}</p>
                        {done && st.at && <span className="text-xs text-gray-400 tabular-nums shrink-0">{stamp(st.at)}</span>}
                      </div>
                      {current && <p className="text-xs text-gold-600 mt-0.5 break-keep">{st.sub}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {/* 예약 확정(준비 중) — 사장님이 바빠 '제작 완료'를 못 누를 수도 있으니 약속한 시간 기준으로 안내 */}
            {level === 1 && (
              <p className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 break-keep">
                {isDelivery
                  ? "준비하느라 바쁠 땐 '제작 완료' 표시가 늦어질 수 있어요.\n표시와 관계없이 약속한 시간에 맞춰 배송해 드려요."
                  : "준비하느라 바쁠 땐 '제작 완료' 표시가 늦어질 수 있어요.\n표시와 관계없이 약속한 시간에 오시면 꽃을 준비해 둘게요."}
              </p>
            )}
          </div>
        )}

        {/* 무통장 입금 대기 — 입금 계좌 */}
        {transferWaiting && s.bank_account ? (
          <div className={`${card} space-y-1.5`}>
            <p className="text-sm font-semibold text-gray-900 mb-1">입금 계좌</p>
            <dl className="space-y-1.5">
              {row("은행", s.bank_name as string)}
              {row("계좌번호", s.bank_account as string)}
              {row("예금주", s.bank_holder as string)}
              {row("입금 금액", `${Number(r.final_price).toLocaleString()}원`)}
            </dl>
          </div>
        ) : null}

        {/* 완성 사진 — 사장님이 올렸을 때만 */}
        {photos.length > 0 && (
          <div className={card}>
            <p className="text-sm font-semibold text-gray-900 mb-1">완성 사진</p>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="space-y-1.5">
                  {/* 누르면 다른 페이지로 가지 않게 그냥 사진으로 (저장은 아래 버튼) */}
                  <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-beige-100">
                    <StoreImage thumb src={p.image_url} alt={`완성 사진 ${i + 1}`} fill sizes="200px" className="object-cover" />
                  </div>
                  <PhotoSaveButton url={p.image_url} name={`${companyName}_${i + 1}.webp`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 주문 내용 */}
        <div className={card}>
          <p className="text-sm font-semibold text-gray-900 mb-3">주문 내용</p>
          <div className="space-y-3 mb-4">
            {items.map((it, i) => {
              const img = it.product_id ? imageOf.get(it.product_id) ?? null : null;
              return (
                <div key={i} className="flex items-center gap-3">
                  {img ? (
                    <StoreImage thumb src={img} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-beige-100 shrink-0 flex items-center justify-center text-xl">💐</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{it.type}</p>
                    <p className="text-sm font-medium text-gray-900 break-keep">{it.name}{(it.quantity ?? 1) > 1 ? ` × ${it.quantity}` : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <dl className="space-y-1.5 pt-3 border-t border-gray-100">
            {row("주문자", `${r.orderer_name} · ${maskPhone(r.orderer_phone)}`)}
            {row("받는 날", `${dateLabel(r.desired_date)}${r.desired_time ? ` ${r.desired_time}` : ""}`)}
            {isDelivery
              ? row("배송지", `${r.recipient_name ? `${r.recipient_name} · ` : ""}${r.address ?? ""}${r.address_detail ? ` ${r.address_detail}` : ""}`)
              : row("수령", "매장 픽업")}
            {row(r.payment_method === "transfer" ? "입금 금액" : "결제 금액", `${Number(r.final_price).toLocaleString()}원${r.payment_method === "transfer" ? (r.paid ? " (입금 확인)" : " (입금 대기)") : ""}`)}
          </dl>
        </div>

        {/* 매장 안내 */}
        <div className={`${card} space-y-3`}>
          <p className="text-sm font-semibold text-gray-900">{companyName}</p>
          <dl className="space-y-1.5">
            {storeAddress && row("주소", storeAddress)}
            {!isDelivery && parking && row("주차", parking)}
          </dl>
          {/* 픽업 — 시간이 바뀌면 미리 연락 (꽃은 받는 시간에 맞춰 준비한다) */}
          {!isDelivery && r.status !== "취소" && r.status !== "픽업/배송완료" && (
            <p className="text-xs text-gray-500 bg-beige-50 rounded-lg px-3 py-2 break-keep">예약 상품은 픽업 시간에 맞춰 준비해 드리고 있어요.<br />픽업 시간이 변동이 생기면 꼭 미리 연락 주세요.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {locationUrl && (
              <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-gray-700 text-[13px] font-medium">
                지도 보기
              </a>
            )}
            {kakaoUrl && (
              <a href={kakaoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#FEE500] text-[#191919] text-[13px] font-medium">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#191919" aria-hidden><path d="M12 3C6.477 3 2 6.477 2 10.832c0 2.838 1.793 5.325 4.5 6.774L5.5 21l3.868-2.06C10.2 19.3 11.09 19.5 12 19.5c5.523 0 10-3.477 10-7.832C22 6.477 17.523 3 12 3z" /></svg>
                카카오톡 문의
              </a>
            )}
            {storePhone && (
              <a href={`tel:${storePhone}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-gray-700 text-[13px] font-medium">
                전화하기
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pt-2 break-keep">이 페이지는 수령 후 {OPEN_DAYS}일 동안 볼 수 있어요.</p>
      </main>
      <StoreFooter {...footer} />
    </div>
  );
}

import { blockIfInactive } from "@/lib/requireActiveCompany";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOODS } from "@/lib/constants";
import { buildReservationPrompt, reservationResponseSchema, type ParsedReservation } from "@/lib/ai/reservationPrompt";

export const dynamic = "force-dynamic";

// 예약 추가 AI 채우기 — 사장님이 붙여 넣은 손님 메시지를 우리 예약 폼 칸(JSON)으로 바꿔 돌려준다. 저장은 하지 않는다.
// 남용 막기: ① 로그인한 사장님 본인 매장만 ② 매장별 하루 100회 (한국 날짜 기준, DB에서 센다) ③ 한 번에 3,000자까지

/** 매장별 하루 사용 횟수 */
const DAILY_LIMIT = 100;
/** 붙여 넣는 글 최대 길이 */
const MAX_TEXT = 3000;
/** Gemini 모델 — 바꿀 때는 환경변수 GEMINI_MODEL */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "자동으로 채우기를 아직 쓸 수 없어요." }, { status: 503 });

  // ① 로그인한 사장님만
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { companyId?: string; text?: string; productTypes?: unknown } | null;
  const companyId = body?.companyId;
  const text = (body?.text ?? "").trim();
  if (!companyId || !text) return NextResponse.json({ error: "붙여 넣은 내용이 없어요." }, { status: 400 });
  if (text.length > MAX_TEXT) return NextResponse.json({ error: `한 번에 ${MAX_TEXT.toLocaleString()}자까지 넣을 수 있어요.` }, { status: 400 });

  // 본인 매장인지
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).eq("owner_id", user.id).single();
  if (company) { const blocked = await blockIfInactive(companyId); if (blocked) return blocked; } // 구독이 끝난 매장은 보기만
  if (!company) return NextResponse.json({ error: "권한이 없어요." }, { status: 403 });

  // 매장 상품 유형 — 폼에서 보낸 목록 (짧은 글자만, 최대 30개)
  const productTypes = Array.isArray(body?.productTypes)
    ? (body!.productTypes as unknown[]).filter((t): t is string => typeof t === "string" && t.length > 0 && t.length <= 20).slice(0, 30)
    : [];
  if (productTypes.length === 0) productTypes.push("꽃다발", "꽃바구니", "센터피스", "화병꽂이");

  // ② 매장별 하루 횟수 — 다 썼으면 null
  const admin = createAdminClient();
  const { data: used, error: quotaError } = await admin.rpc("ai_usage_take", { p_company_id: companyId, p_limit: DAILY_LIMIT });
  if (quotaError) {
    console.error("[ai/parse-reservation] 사용 횟수 확인 실패:", quotaError.message);
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  if (used == null) return NextResponse.json({ error: `오늘 사용 횟수(${DAILY_LIMIT}회)를 다 썼어요. 내일 다시 쓸 수 있어요.` }, { status: 429 });

  const refund = () => admin.rpc("ai_usage_refund", { p_company_id: companyId }).then(() => {}, () => {});

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildReservationPrompt({ productTypes, moods: MOODS }) }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          // 생각 단계 끔 — 정리만 하면 되는 일이라 정확도는 같고 응답이 두 배 빠르다 (약 6초 → 3초)
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: reservationResponseSchema({ productTypes, moods: MOODS }),
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.error("[ai/parse-reservation] Gemini 오류:", res.status, (await res.text()).slice(0, 500));
      await refund();
      return NextResponse.json({ error: "내용을 읽지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const parsed = JSON.parse(raw) as ParsedReservation;
    return NextResponse.json({ result: parsed, used, limit: DAILY_LIMIT });
  } catch (e) {
    console.error("[ai/parse-reservation] 실패:", e);
    await refund();
    return NextResponse.json({ error: "내용을 읽지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}

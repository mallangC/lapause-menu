import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function verifyOperator() {
  const supabase = await createServerAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "operator";
}

// 자동 생성 코드에 쓰는 글자 — 헷갈리는 0/O, 1/I/L은 뺀다 (31자 × 6자리 ≈ 8.9억 가지)
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const AUTO_CODE_LENGTH = 6;
const AUTO_CODE_ATTEMPTS = 5;

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(AUTO_CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

const LIST_COLUMNS =
  "id, code, description, discount_type, discount_value, applies_to, duration_cycles, max_redemptions, redeemed_count, expires_at, active, operator_only, created_at";

// 할인 코드 목록 + 코드별 현재 적용 중인 매장 수
export async function GET() {
  if (!(await verifyOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const [{ data: codes, error }, { data: subs }] = await Promise.all([
    db.from("promo_codes").select(LIST_COLUMNS).order("created_at", { ascending: false }),
    db.from("company_subscriptions").select("promo_code_id").not("promo_code_id", "is", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inUse: Record<string, number> = {};
  for (const s of subs ?? []) inUse[s.promo_code_id as string] = (inUse[s.promo_code_id as string] ?? 0) + 1;

  return NextResponse.json((codes ?? []).map((c) => ({ ...c, in_use_count: inUse[c.id] ?? 0 })));
}

// 할인 코드 생성
export async function POST(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);
  const appliesTo = body.appliesTo ?? "all";
  const durationCycles = body.durationCycles == null || body.durationCycles === "" ? null : Number(body.durationCycles);
  const maxRedemptions = body.maxRedemptions == null || body.maxRedemptions === "" ? null : Number(body.maxRedemptions);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const description = typeof body.description === "string" && body.description.trim() ? body.description.trim() : null;
  const operatorOnly = body.operatorOnly === true;

  // 코드를 비우면 자동 생성
  const autoCode = code === "";
  if (!autoCode && !/^[A-Z0-9_-]{3,30}$/.test(code)) {
    return NextResponse.json({ error: "코드는 영문 대문자·숫자·-·_ 3~30자로 입력해주세요." }, { status: 400 });
  }
  if (discountType !== "percent" && discountType !== "amount") {
    return NextResponse.json({ error: "할인 방식을 선택해주세요." }, { status: 400 });
  }
  if (!Number.isInteger(discountValue) || discountValue <= 0 || (discountType === "percent" && discountValue > 100)) {
    return NextResponse.json({ error: discountType === "percent" ? "할인율은 1~100 사이 정수로 입력해주세요." : "할인 금액은 1원 이상 정수로 입력해주세요." }, { status: 400 });
  }
  if (!["all", "monthly", "annual"].includes(appliesTo)) {
    return NextResponse.json({ error: "적용 플랜이 올바르지 않습니다." }, { status: 400 });
  }
  if (durationCycles !== null && (!Number.isInteger(durationCycles) || durationCycles < 1)) {
    return NextResponse.json({ error: "할인 횟수는 1 이상 정수로 입력하거나 비워두세요(평생)." }, { status: 400 });
  }
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
    return NextResponse.json({ error: "사용 가능 매장 수는 1 이상 정수로 입력하거나 비워두세요(무제한)." }, { status: 400 });
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "등록 마감일이 올바르지 않습니다." }, { status: 400 });
  }

  const db = createAdminClient();
  const insert = (c: string) => db
    .from("promo_codes")
    .insert({
      code: c,
      description,
      discount_type: discountType,
      discount_value: discountValue,
      applies_to: appliesTo,
      duration_cycles: durationCycles,
      max_redemptions: maxRedemptions,
      expires_at: expiresAt?.toISOString() ?? null,
      operator_only: operatorOnly,
    })
    .select(LIST_COLUMNS)
    .single();

  // 자동 생성 코드가 기존 코드와 겹치면(23505) 새로 뽑아서 다시 시도
  let result = await insert(autoCode ? generateCode() : code);
  for (let i = 1; autoCode && result.error?.code === "23505" && i < AUTO_CODE_ATTEMPTS; i++) {
    result = await insert(generateCode());
  }

  const { data, error } = result;
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: autoCode ? "코드 자동 생성에 실패했습니다. 다시 시도해주세요." : "이미 있는 코드입니다." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ...data, in_use_count: 0 });
}

// 사용 중지/재개 — 중지해도 이미 적용된 매장의 할인은 유지되고, 새 등록만 막힌다
export async function PATCH(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await req.json();
  if (!id || typeof active !== "boolean") return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const { error } = await createAdminClient().from("promo_codes").update({ active }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

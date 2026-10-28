// ⚠️ 로컬 테스트 전용 진입점 (wrangler.billing-test.toml에서만 사용, 배포되지 않음)
// 정기결제 Workflow를 "지정한 매장 1곳"에 대해서만 실행한다.
// dispatchBillingRenewals()는 전체 매장을 대상으로 하므로 테스트 키로 돌리면 실제 매장 구독에 실패 기록이 쌓인다 — 절대 쓰지 않는다.
import { createClient } from "@supabase/supabase-js";
import { isDue, renewalKey, SUBSCRIPTION_COLUMNS, type BillingEnv, type SubscriptionRow } from "./billingRenew";

export { BillingRenewWorkflow } from "./billingRenew";

interface DevEnv extends BillingEnv {
  BILLING_RENEW: BillingEnv["BILLING_RENEW"] & {
    get(id: string): Promise<{ status(): Promise<unknown> }>;
  };
  TEST_COMPANY_ID: string;
}

export default {
  async fetch(request: Request, env: DevEnv): Promise<Response> {
    const url = new URL(request.url);

    // 테스트 키가 아니면 실행 거부 (운영 키로 실제 결제가 나가는 사고 방지)
    if (!env.TOSS_BILLING_SECRET_KEY?.startsWith("test_")) {
      return Response.json({ error: "TOSS_BILLING_SECRET_KEY가 테스트 키(test_...)가 아닙니다." }, { status: 400 });
    }

    // GET /run — TEST_COMPANY_ID 매장 1곳만 Workflow 인스턴스 생성
    if (url.pathname === "/run") {
      const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: sub, error } = await db
        .from("company_subscriptions").select(SUBSCRIPTION_COLUMNS).eq("company_id", env.TEST_COMPANY_ID).maybeSingle();
      if (error || !sub) return Response.json({ error: error?.message ?? "구독을 찾을 수 없습니다." }, { status: 404 });

      const row = sub as SubscriptionRow;
      if (!isDue(row, new Date())) {
        return Response.json({ error: "결제 대상이 아닙니다 (만료일이 미래이거나 재시도 대기 중).", sub: row }, { status: 400 });
      }
      const id = renewalKey(row);
      try {
        await env.BILLING_RENEW.create({ id, params: { companyId: row.company_id, orderId: id } });
        return Response.json({ created: id });
      } catch (err) {
        return Response.json({ duplicate: id, message: err instanceof Error ? err.message : String(err) }, { status: 409 });
      }
    }

    // GET /status?id=... — 인스턴스 진행 상태 조회
    if (url.pathname === "/status") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "id 파라미터가 필요합니다." }, { status: 400 });
      const instance = await env.BILLING_RENEW.get(id);
      return Response.json(await instance.status());
    }

    return new Response("GET /run  또는  GET /status?id=<인스턴스 ID>", { status: 404 });
  },
};

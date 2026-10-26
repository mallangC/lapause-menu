"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export interface TossPaymentWidgetRequest {
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
}

export interface TossPaymentWidgetHandle {
  requestPayment: (request: TossPaymentWidgetRequest) => Promise<void>;
}

interface TossPaymentWidgetProps {
  customerKey: string;
  amount: number;
  clientKey?: string;
  onReadyChange?: (ready: boolean) => void;
  /** 사용자가 결제창을 닫고 결제를 포기했을 때 호출됩니다. */
  onCancel?: () => void;
  /** true면 토스 결제창을 띄우지 않고, 성공한 것처럼 successUrl로 바로 이동합니다. (데모 매장 전용) */
  isDemo?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetsInstance = any;

const TossPaymentWidget = forwardRef<TossPaymentWidgetHandle, TossPaymentWidgetProps>(
  function TossPaymentWidget({ customerKey, amount, clientKey, onReadyChange, onCancel, isDemo }, ref) {
    const widgetsRef = useRef<WidgetsInstance | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (isDemo) {
        // 데모 매장은 실제 위젯을 띄울 필요가 없으므로 바로 준비완료 처리
        onReadyChange?.(true);
        return;
      }
      let destroyed = false;
      (async () => {
        try {
          const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
          const tossPayments = await loadTossPayments(
            clientKey ?? process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY!,
          );
          const widgets = tossPayments.widgets({ customerKey });
          if (destroyed) return;
          widgetsRef.current = widgets;
          await widgets.setAmount({ currency: "KRW", value: amount });
          if (!destroyed) onReadyChange?.(true);
        } catch (err) {
          if (!destroyed) {
            setError(err instanceof Error ? err.message : "결제 위젯을 불러오지 못했습니다.");
            onReadyChange?.(false);
          }
        }
      })();
      return () => {
        destroyed = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerKey]);

    useEffect(() => {
      widgetsRef.current?.setAmount({ currency: "KRW", value: amount });
    }, [amount]);

    useImperativeHandle(
      ref,
      () => ({
        requestPayment: async (request: TossPaymentWidgetRequest) => {
          if (isDemo) {
            // 실제 결제창 없이, 토스가 성공 후 돌려보내는 것과 동일한 쿼리스트링으로 바로 이동시킨다.
            // 서버(order/reservation API)는 company.is_demo를 다시 확인한 뒤에만 이 값을 신뢰한다.
            const url = new URL(request.successUrl);
            url.searchParams.set("paymentKey", `demo_${Date.now()}`);
            url.searchParams.set("orderId", request.orderId);
            url.searchParams.set("amount", String(amount));
            window.location.href = url.toString();
            return;
          }

          const widgets = widgetsRef.current;
          if (!widgets) throw new Error("결제 위젯이 아직 준비되지 않았습니다.");

          // 결제수단 선택까지 포함된 결제창을 오버레이로 띄운다.
          const paymentWindow = await widgets.renderPaymentWindow({
            variantKey: { paymentMethod: "DEFAULT", agreement: "DEFAULT" },
          });

          paymentWindow.on("paymentRequest", async () => {
            await widgets.requestPayment(request);
          });
          paymentWindow.on("cancel", async () => {
            onCancel?.();
          });
        },
      }),
      [onCancel, isDemo, amount],
    );

    return error ? <p className="text-xs text-red-500">{error}</p> : null;
  },
);

export default TossPaymentWidget;

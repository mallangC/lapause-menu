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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetsInstance = any;

const TossPaymentWidget = forwardRef<TossPaymentWidgetHandle, TossPaymentWidgetProps>(
  function TossPaymentWidget({ customerKey, amount, clientKey, onReadyChange, onCancel }, ref) {
    const widgetsRef = useRef<WidgetsInstance | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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
      [onCancel],
    );

    return error ? <p className="text-xs text-red-500">{error}</p> : null;
  },
);

export default TossPaymentWidget;

declare module "@portone/browser-sdk/v2" {
  interface IssueBillingKeyRequest {
    storeId: string;
    channelKey: string;
    billingKeyMethod: string;
    issueId: string;
    issueName: string;
    customer?: { fullName?: string };
  }

  interface IssueBillingKeySuccess {
    billingKey: string;
  }

  interface PortOneError {
    code: string;
    message: string;
  }

  interface PaymentRequest {
    storeId: string;
    channelKey: string;
    paymentId: string;
    orderName: string;
    totalAmount: number;
    currency: string;
    payMethod: string;
    customer?: { fullName?: string; phoneNumber?: string };
  }

  interface PaymentSuccess {
    paymentId: string;
    transactionType: string;
  }

  export function requestIssueBillingKey(
    request: IssueBillingKeyRequest
  ): Promise<IssueBillingKeySuccess | PortOneError>;

  export function requestPayment(
    request: PaymentRequest
  ): Promise<PaymentSuccess | PortOneError>;
}

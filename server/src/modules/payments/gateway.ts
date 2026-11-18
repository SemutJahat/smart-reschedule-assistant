import { timingSafeEqual } from "node:crypto";
import type { AppConfig } from "../../config/env";
import { AppError } from "../../shared/errors";

export const DEVELOPMENT_MIDTRANS_SERVER_KEY = "development-midtrans-server-key";

const SNAP_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const SNAP_PRODUCTION_URL = "https://app.midtrans.com/snap/v1/transactions";
const SNAP_TIMEOUT_MS = 10_000;

export interface SnapTransactionRequest {
  orderId: string;
  grossAmount: number;
  item: { id: string; name: string; price: number };
  customer: { name: string; email: string; phone: string | null };
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
}

export interface PaymentGateway {
  createTransaction(request: SnapTransactionRequest): Promise<SnapTransaction>;
  verifyNotification(notification: MidtransNotification): boolean;
}

export function midtransSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
  return new Bun.CryptoHasher("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");
}

function verifySignature(notification: MidtransNotification, serverKey: string): boolean {
  const expected = Buffer.from(midtransSignature(notification.order_id, notification.status_code, notification.gross_amount, serverKey));
  const received = Buffer.from(notification.signature_key.toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function snapPayload(request: SnapTransactionRequest) {
  return {
    transaction_details: { order_id: request.orderId, gross_amount: request.grossAmount },
    item_details: [{ id: request.item.id, name: request.item.name.slice(0, 50), price: request.item.price, quantity: 1 }],
    customer_details: { first_name: request.customer.name.slice(0, 255), email: request.customer.email, ...(request.customer.phone ? { phone: request.customer.phone } : {}) },
  };
}

export class MidtransSnapGateway implements PaymentGateway {
  private readonly url: string;

  constructor(private readonly serverKey: string, isProduction = false, private readonly fetchImpl: typeof fetch = fetch) {
    this.url = isProduction ? SNAP_PRODUCTION_URL : SNAP_SANDBOX_URL;
  }

  async createTransaction(request: SnapTransactionRequest): Promise<SnapTransaction> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", authorization: `Basic ${btoa(`${this.serverKey}:`)}` },
        body: JSON.stringify(snapPayload(request)),
        signal: AbortSignal.timeout(SNAP_TIMEOUT_MS),
      });
    } catch {
      throw new AppError("PAYMENT_GATEWAY_UNAVAILABLE", "Payment gateway is unavailable", 502);
    }
    const body = await response.json().catch(() => null) as { token?: unknown; redirect_url?: unknown } | null;
    if (!response.ok || typeof body?.token !== "string" || typeof body.redirect_url !== "string") {
      throw new AppError("PAYMENT_GATEWAY_UNAVAILABLE", "Payment gateway rejected the transaction", 502);
    }
    return { token: body.token, redirectUrl: body.redirect_url };
  }

  verifyNotification(notification: MidtransNotification): boolean { return verifySignature(notification, this.serverKey); }
}

export class StubPaymentGateway implements PaymentGateway {
  readonly requests: SnapTransactionRequest[] = [];

  constructor(private readonly serverKey = DEVELOPMENT_MIDTRANS_SERVER_KEY) {}

  async createTransaction(request: SnapTransactionRequest): Promise<SnapTransaction> {
    this.requests.push(request);
    const token = `stub-snap-${request.orderId}`;
    return { token, redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}` };
  }

  verifyNotification(notification: MidtransNotification): boolean { return verifySignature(notification, this.serverKey); }
}

export function createPaymentGateway(config: AppConfig): PaymentGateway {
  if (config.midtransServerKey) return new MidtransSnapGateway(config.midtransServerKey, config.midtransIsProduction ?? false);
  if (config.nodeEnv === "production") throw new Error("MIDTRANS_SERVER_KEY is required in production");
  return new StubPaymentGateway();
}

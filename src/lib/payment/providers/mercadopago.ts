import type {
  PaymentCreationRequest,
  PaymentCreationResult,
  PaymentProvider,
  PaymentStatus,
} from "../types";

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "Mercado Pago";
  private accessToken: string;
  private webhookSecret?: string;

  constructor(accessToken?: string, webhookSecret?: string) {
    this.accessToken =
      accessToken || (typeof process !== "undefined" ? process.env.MERCADO_PAGO_ACCESS_TOKEN || "" : "");
    this.webhookSecret =
      webhookSecret || (typeof process !== "undefined" ? process.env.MERCADO_PAGO_WEBHOOK_SECRET : undefined);
  }

  async createPayment(req: PaymentCreationRequest): Promise<PaymentCreationResult> {
    if (!this.accessToken) {
      throw new Error(
        "Mercado Pago não configurado. Defina a variável de ambiente MERCADO_PAGO_ACCESS_TOKEN no servidor."
      );
    }

    if (req.method === "pix") {
      const payload = {
        transaction_amount: Number(req.amount.toFixed(2)),
        description: `Pedido ${req.orderId.slice(0, 8)} — Pantanal Smoke`,
        payment_method_id: "pix",
        payer: {
          email: req.customer.email || "contato@pantanalsmoke.com.br",
          first_name: req.customer.name.split(" ")[0],
          last_name: req.customer.name.split(" ").slice(1).join(" ") || "Cliente",
        },
        metadata: {
          order_id: req.orderId,
          idempotency_key: req.idempotencyKey,
        },
      };

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          "X-Idempotency-Key": req.idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Falha na integração com Mercado Pago (${response.status}): ${JSON.stringify(errorData)}`
        );
      }

      const data = await response.json();
      const pixData = data.point_of_interaction?.transaction_data;

      return {
        paymentId: String(data.id),
        status: this.mapStatus(data.status),
        method: "pix",
        amount: Number(data.transaction_amount),
        pixCode: pixData?.qr_code,
        pixQrCodeBase64: pixData?.qr_code_base64,
        instructions:
          "Escaneie o QR Code ou copie a chave Pix abaixo para finalizar o pagamento no seu banco.",
        isTestMode: false,
        gatewayName: this.name,
        createdAt: data.date_created || new Date().toISOString(),
      };
    }

    throw new Error(
      `Forma de pagamento '${req.method}' requer preenchimento com Mercado Pago Brick ou Checkout Pro no frontend.`
    );
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.accessToken) return "aguardando_pagamento";
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) return "aguardando_pagamento";
    const data = await res.json();
    return this.mapStatus(data.status);
  }

  private mapStatus(mpStatus: string): PaymentStatus {
    switch (mpStatus) {
      case "approved":
        return "aprovado";
      case "rejected":
        return "recusado";
      case "cancelled":
        return "cancelado";
      case "refunded":
      case "charged_back":
        return "cancelado";
      default:
        return "aguardando_pagamento";
    }
  }
}

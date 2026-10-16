import type {
  PaymentCreationRequest,
  PaymentCreationResult,
  PaymentProvider,
  PaymentStatus,
} from "../types";

export class AsaasProvider implements PaymentProvider {
  readonly name = "Asaas";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, isSandbox = true) {
    this.apiKey =
      apiKey || (typeof process !== "undefined" ? process.env.ASAAS_API_KEY || "" : "");
    this.baseUrl = isSandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/api/v3";
  }

  async createPayment(req: PaymentCreationRequest): Promise<PaymentCreationResult> {
    if (!this.apiKey) {
      throw new Error(
        "Asaas não configurado. Defina a variável de ambiente ASAAS_API_KEY no servidor."
      );
    }

    if (req.method === "pix") {
      // 1. Criar cobrança no Asaas
      const paymentResponse = await fetch(`${this.baseUrl}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: this.apiKey,
        },
        body: JSON.stringify({
          customer: req.customer.phone,
          billingType: "PIX",
          value: Number(req.amount.toFixed(2)),
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          description: `Pedido ${req.orderId.slice(0, 8)} — Pantanal Smoke`,
          externalReference: req.orderId,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => ({}));
        throw new Error(
          `Falha na cobrança Asaas (${paymentResponse.status}): ${JSON.stringify(errorData)}`
        );
      }

      const paymentData = await paymentResponse.json();

      // 2. Obter QR Code Pix
      const qrResponse = await fetch(
        `${this.baseUrl}/payments/${paymentData.id}/pixQrCode`,
        {
          headers: { access_token: this.apiKey },
        }
      );

      const qrData = qrResponse.ok ? await qrResponse.json() : null;

      return {
        paymentId: paymentData.id,
        status: this.mapStatus(paymentData.status),
        method: "pix",
        amount: Number(paymentData.value),
        pixCode: qrData?.payload,
        pixQrCodeBase64: qrData?.encodedImage,
        instructions:
          "Escaneie o QR Code ou utilize o Pix Copia e Cola para pagar pelo aplicativo do seu banco.",
        isTestMode: false,
        gatewayName: this.name,
        createdAt: paymentData.dateCreated || new Date().toISOString(),
      };
    }

    throw new Error(`Método '${req.method}' requer configuração de tokenização Asaas.`);
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    if (!this.apiKey) return "aguardando_pagamento";
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: { access_token: this.apiKey },
    });
    if (!res.ok) return "aguardando_pagamento";
    const data = await res.json();
    return this.mapStatus(data.status);
  }

  private mapStatus(asaasStatus: string): PaymentStatus {
    switch (asaasStatus) {
      case "RECEIVED":
      case "CONFIRMED":
      case "RECEIVED_IN_CASH":
        return "aprovado";
      case "OVERDUE":
        return "expirado";
      case "REFUNDED":
        return "cancelado";
      default:
        return "aguardando_pagamento";
    }
  }
}

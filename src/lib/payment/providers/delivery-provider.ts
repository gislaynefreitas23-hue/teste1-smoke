import type {
  PaymentCreationRequest,
  PaymentCreationResult,
  PaymentProvider,
} from "../types";

export class DeliveryPaymentProvider implements PaymentProvider {
  readonly name = "Pagamento na Entrega";

  async createPayment(req: PaymentCreationRequest): Promise<PaymentCreationResult> {
    const isDinheiro = req.deliveryDetails?.type === "dinheiro";
    let instructions = "O pagamento será realizado no ato da entrega.";

    if (isDinheiro) {
      if (req.deliveryDetails?.needsChange && req.deliveryDetails?.changeFor) {
        instructions = `Pagamento em dinheiro na entrega. Entregador levará troco para ${new Intl.NumberFormat(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        ).format(req.deliveryDetails.changeFor)}.`;
      } else {
        instructions = "Pagamento em dinheiro na entrega (sem necessidade de troco).";
      }
    } else {
      instructions =
        "Pagamento via Maquininha (Cartão de Débito/Crédito) diretamente com o entregador.";
    }

    return {
      paymentId: `deliv_${req.orderId.replace(/-/g, "").slice(0, 16)}`,
      status: "aguardando_pagamento",
      method: "delivery",
      amount: req.amount,
      instructions,
      isTestMode: false,
      gatewayName: this.name,
      createdAt: new Date().toISOString(),
    };
  }
}

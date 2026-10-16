import type {
  PaymentCreationRequest,
  PaymentCreationResult,
  PaymentProvider,
} from "../types";

export class TestPaymentProvider implements PaymentProvider {
  readonly name = "Simulador Seguro (Modo de Testes)";

  async createPayment(req: PaymentCreationRequest): Promise<PaymentCreationResult> {
    const isPix = req.method === "pix";
    const timestamp = Date.now();
    const cleanId = req.orderId.replace(/-/g, "").slice(0, 12);

    let pixCode: string | undefined = undefined;
    let instructions = "Aguardando confirmação de pagamento.";

    if (isPix) {
      // Código Pix Copia e Cola formatado em padrão EMVCo para testes
      pixCode = `00020126580014br.gov.bcb.pix0136${cleanId}-pantanal-smoke520400005303986540${req.amount.toFixed(
        2
      )}5802BR5914PANTANAL SMOKE6006CUIABA62070503***6304${timestamp.toString(16).slice(-4).toUpperCase()}`;

      instructions =
        "Abra o app do seu banco, escolha Pix > Copia e Cola e conclua o pagamento. O pedido será processado assim que a confirmação for recebida.";
    } else if (req.method === "credit_card" || req.method === "debit_card") {
      instructions =
        "Transação em modo de testes. Em produção com gateway ativo, o pagamento será enviado ao adquirente com autenticação 3D-Secure.";
    }

    return {
      paymentId: `test_pay_${cleanId}_${timestamp}`,
      status: "aguardando_pagamento", // NUNCA simula aprovação automática
      method: req.method,
      amount: req.amount,
      pixCode,
      instructions,
      isTestMode: true,
      gatewayName: this.name,
      createdAt: new Date().toISOString(),
    };
  }
}

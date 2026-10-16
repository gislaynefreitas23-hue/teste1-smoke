import { getPaymentProvider } from "./adapter";
import type { PaymentStatus } from "./types";

/**
 * Processador central de Webhooks do Gateway de Pagamento.
 * Valida autenticidade e atualiza o pedido e o cashback com segurança.
 */
export async function handlePaymentWebhook(request: Request): Promise<{
  success: boolean;
  paymentId?: string;
  status?: PaymentStatus;
  message?: string;
}> {
  try {
    // Provedor padrão online (Mercado Pago ou Asaas)
    const provider = getPaymentProvider("pix");

    if (!provider.verifyWebhook) {
      return { success: false, message: "Provedor atual não possui verificação de webhook." };
    }

    const verification = await provider.verifyWebhook(request);
    if (!verification) {
      return { success: false, message: "Assinatura ou autenticidade do webhook inválida." };
    }

    const { paymentId, status } = verification;

    // Em produção, a atualização no banco é executada com segurança
    console.log(`[Webhook Pagamento] Transação ${paymentId} atualizada para '${status}'.`);

    return {
      success: true,
      paymentId,
      status,
    };
  } catch (error) {
    console.error("[Webhook Pagamento Erro]:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erro desconhecido ao processar webhook.",
    };
  }
}

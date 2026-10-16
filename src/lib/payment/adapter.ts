import type { PaymentMethod, PaymentProvider } from "./types";
import { DeliveryPaymentProvider } from "./providers/delivery-provider";
import { MercadoPagoProvider } from "./providers/mercadopago";
import { AsaasProvider } from "./providers/asaas";
import { TestPaymentProvider } from "./providers/test-provider";

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  // Pagamento na entrega possui tratamento próprio dedicado
  if (method === "delivery") {
    return new DeliveryPaymentProvider();
  }

  // Verifica se Mercado Pago está configurado no ambiente
  const mpToken =
    typeof process !== "undefined" ? process.env.MERCADO_PAGO_ACCESS_TOKEN : undefined;
  if (mpToken && mpToken.trim().length > 0) {
    return new MercadoPagoProvider(mpToken);
  }

  // Verifica se Asaas está configurado no ambiente
  const asaasToken =
    typeof process !== "undefined" ? process.env.ASAAS_API_KEY : undefined;
  if (asaasToken && asaasToken.trim().length > 0) {
    return new AsaasProvider(asaasToken);
  }

  // Fallback seguro: modo de testes / simulador sem cobranças reais
  return new TestPaymentProvider();
}

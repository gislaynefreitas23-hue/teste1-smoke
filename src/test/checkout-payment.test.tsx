import { describe, expect, it, vi, beforeEach } from "vitest";

import { DeliveryPaymentProvider } from "@/lib/payment/providers/delivery-provider";
import { TestPaymentProvider } from "@/lib/payment/providers/test-provider";
import { getPaymentProvider } from "@/lib/payment/adapter";
import { processCheckout, calculateOrderSummary } from "@/lib/payment/service";

// Mock do supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                id: "prod-1",
                name: "Narguilé Mahina 60cm",
                price: 389.9,
                active: true,
              },
              {
                id: "prod-2",
                name: "Essência Dubaim Apple 50g",
                price: 44.9,
                active: true,
              },
            ],
            error: null,
          })
        ),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: { id: "order-db-uuid-123" }, error: null })),
  },
}));

describe("Payment Architecture & Gateway Layer", () => {
  it("DeliveryPaymentProvider sets status as 'aguardando_pagamento' and formats change instructions", async () => {
    const provider = new DeliveryPaymentProvider();

    const result = await provider.createPayment({
      orderId: "order-123",
      idempotencyKey: "idemp-1",
      amount: 150.0,
      items: [],
      customer: { name: "João", phone: "6599999999" },
      address: {
        cep: "78000-000",
        rua: "Rua A",
        numero: "10",
        bairro: "Centro",
        cidade: "Cuiabá",
        uf: "MT",
      },
      method: "delivery",
      deliveryDetails: { type: "dinheiro", needsChange: true, changeFor: 200 },
    });

    expect(result.status).toBe("aguardando_pagamento");
    expect(result.method).toBe("delivery");
    expect(result.instructions).toContain("troco para");
    expect(result.isTestMode).toBe(false);
  });

  it("TestPaymentProvider creates valid Pix payload without fake automatic approval", async () => {
    const provider = new TestPaymentProvider();

    const result = await provider.createPayment({
      orderId: "order-456",
      idempotencyKey: "idemp-2",
      amount: 89.8,
      items: [],
      customer: { name: "Maria", phone: "6598888888" },
      address: {
        cep: "78000-000",
        rua: "Rua B",
        numero: "20",
        bairro: "Centro",
        cidade: "Cuiabá",
        uf: "MT",
      },
      method: "pix",
    });

    expect(result.status).toBe("aguardando_pagamento");
    expect(result.pixCode).toBeDefined();
    expect(result.pixCode).toContain("br.gov.bcb.pix");
    expect(result.isTestMode).toBe(true);
  });

  it("getPaymentProvider selects delivery provider and falls back safely to test provider", () => {
    const deliveryProvider = getPaymentProvider("delivery");
    expect(deliveryProvider.name).toBe("Pagamento na Entrega");

    const onlineProvider = getPaymentProvider("pix");
    expect(onlineProvider).toBeDefined();
  });
});

describe("Checkout Calculation & Idempotency", () => {
  it("calculates subtotal, delivery fee and cashback accurately", async () => {
    const summary = await calculateOrderSummary(
      [
        { id: "prod-1", qty: 1 },
        { id: "prod-2", qty: 2 },
      ],
      "cuiaba",
      true,
      20.0 // Saldo de cashback
    );

    // Subtotal: 389.90 + (44.90 * 2) = 479.70
    expect(summary.subtotal).toBeCloseTo(479.7);
    // Frete Cuiabá: 10.00
    expect(summary.deliveryFee).toBe(10);
    // Cashback usado: 20.00
    expect(summary.cashbackUsed).toBe(20);
    // Total: 479.70 + 10 - 20 = 469.70
    expect(summary.total).toBeCloseTo(469.7);
  });

  it("rejects empty customer fields defensibly", async () => {
    await expect(
      processCheckout({
        items: [{ id: "prod-1", qty: 1 }],
        customer: { name: "", phone: "" },
        address: {
          cep: "78000-000",
          rua: "Rua A",
          numero: "1",
          bairro: "Centro",
          cidade: "Cuiabá",
          uf: "MT",
        },
        paymentMethod: "pix",
        useCashback: false,
        idempotencyKey: "test-err-1",
      })
    ).rejects.toThrow(/nome completo/i);
  });

  it("enforces idempotency returning existing order for identical key", async () => {
    const key = `idemp_unique_${Date.now()}`;
    const payload = {
      items: [{ id: "prod-1", qty: 1 }],
      customer: { name: "Carlos", phone: "6599991111" },
      address: {
        cep: "78000-000",
        rua: "Av Mato Grosso",
        numero: "500",
        bairro: "Centro",
        cidade: "Cuiabá",
        uf: "MT",
      },
      paymentMethod: "pix" as const,
      useCashback: false,
      idempotencyKey: key,
    };

    const first = await processCheckout(payload);
    const second = await processCheckout(payload);

    expect(first.orderId).toBe(second.orderId);
    expect(first.paymentResult.paymentId).toBe(second.paymentResult.paymentId);
  });
});

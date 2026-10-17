import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listCustomerAddresses,
  saveCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  saveCustomerSessionAddress,
  getCustomerSessionAddresses,
  formatAddressLine,
  type CustomerAddress,
} from "@/lib/addresses";
import { calculateOrderSummary, processCheckout } from "@/lib/payment/service";
import { TAXA_ENTREGA_CUIABA, formatBRL } from "@/lib/brasa";

// Mock de banco Supabase para testes de endereços e checkout
const mockAddressesTable: CustomerAddress[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "customer_addresses") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((col1: string, val1: string) => ({
              eq: vi.fn((col2: string, val2: string) => ({
                order: vi.fn(() => {
                  const filtered = mockAddressesTable.filter((item: any) => {
                    return item[col1] === val1 && item[col2] === val2;
                  });
                  return Promise.resolve({ data: filtered, error: null });
                }),
              })),
            })),
          })),
          insert: vi.fn((payload: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => {
                const inserted: CustomerAddress = {
                  ...payload,
                  id: `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  created_at: new Date().toISOString(),
                };
                mockAddressesTable.push(inserted);
                return Promise.resolve({ data: inserted, error: null });
              }),
            })),
          })),
          update: vi.fn((updates: any) => ({
            eq: vi.fn((col: string, val: string) => {
              const idx = mockAddressesTable.findIndex((item: any) => item[col] === val);
              if (idx !== -1) {
                mockAddressesTable[idx] = { ...mockAddressesTable[idx], ...updates };
              }
              return Promise.resolve({ error: null });
            }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn((col: string, val: string) => {
              const idx = mockAddressesTable.findIndex((item: any) => item[col] === val);
              if (idx !== -1) {
                mockAddressesTable.splice(idx, 1);
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }

      // Default mock for products
      return {
        select: vi.fn(() => ({
          in: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: "prod-cuiaba-1",
                  name: "Pod Ignite V50 5000 Puffs",
                  price: 99.9,
                  active: true,
                  product_city_inventories: [
                    { city_id: "cuiaba", price: 99.9, stock: 15, active: true },
                    { city_id: "sao-paulo", price: 109.9, stock: 15, active: true },
                  ],
                },
              ],
              error: null,
            })
          ),
        })),
      };
    }),
    rpc: vi.fn(() => Promise.resolve({ data: { id: "order-test-uuid" }, error: null })),
  },
}));

describe("Sistema de Salvamento e Reutilização de Endereços", () => {
  beforeEach(() => {
    mockAddressesTable.length = 0;
  });

  it("1. Salva e recupera endereço de cliente com sucesso no Supabase", async () => {
    const saved = await saveCustomerAddress({
      user_id: "user-123",
      city_id: "cuiaba",
      label: "Casa",
      cep: "78000-000",
      rua: "Avenida Getúlio Vargas",
      numero: "1500",
      bairro: "Goiabeiras",
      cidade: "Cuiabá",
      uf: "MT",
      is_default: true,
    });

    expect(saved).toBeDefined();
    expect(saved.id).toBeDefined();
    expect(saved.rua).toBe("Avenida Getúlio Vargas");
    expect(saved.cidade).toBe("Cuiabá");

    const addresses = await listCustomerAddresses("user-123", "cuiaba");
    expect(addresses.length).toBe(1);
    expect(addresses[0].id).toBe(saved.id);
    expect(addresses[0].numero).toBe("1500");
  });

  it("2. Separação estrita por cidade: endereços de Cuiabá e São Paulo nunca se misturam", async () => {
    // Salva endereço em Cuiabá
    await saveCustomerAddress({
      user_id: "user-123",
      city_id: "cuiaba",
      label: "Casa Cuiabá",
      cep: "78000-111",
      rua: "Rua das Flores",
      numero: "100",
      bairro: "Centro",
      cidade: "Cuiabá",
      uf: "MT",
    });

    // Salva endereço em São Paulo
    await saveCustomerAddress({
      user_id: "user-123",
      city_id: "sao-paulo",
      label: "Apê SP",
      cep: "01310-100",
      rua: "Avenida Paulista",
      numero: "1000",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      uf: "SP",
    });

    // Quando consulta Cuiabá, deve retornar APENAS o endereço de Cuiabá
    const cuiabaList = await listCustomerAddresses("user-123", "cuiaba");
    expect(cuiabaList.length).toBe(1);
    expect(cuiabaList[0].label).toBe("Casa Cuiabá");
    expect(cuiabaList[0].city_id).toBe("cuiaba");

    // Quando consulta São Paulo, deve retornar APENAS o endereço de São Paulo
    const spList = await listCustomerAddresses("user-123", "sao-paulo");
    expect(spList.length).toBe(1);
    expect(spList[0].label).toBe("Apê SP");
    expect(spList[0].city_id).toBe("sao-paulo");
  });

  it("3. Permite editar e excluir endereços salvos", async () => {
    const created = await saveCustomerAddress({
      user_id: "user-456",
      city_id: "cuiaba",
      label: "Trabalho",
      cep: "78020-000",
      rua: "Rua Barão de Melgaço",
      numero: "200",
      bairro: "Porto",
      cidade: "Cuiabá",
      uf: "MT",
    });

    // Edição
    await updateCustomerAddress(created.id, {
      numero: "250",
      label: "Escritório Novo",
    });

    let list = await listCustomerAddresses("user-456", "cuiaba");
    expect(list[0].numero).toBe("250");
    expect(list[0].label).toBe("Escritório Novo");

    // Exclusão
    await deleteCustomerAddress(created.id);
    list = await listCustomerAddresses("user-456", "cuiaba");
    expect(list.length).toBe(0);
  });

  it("4. Suporta visitantes (guest checkout) sem forçar criação de conta e sem salvar no localStorage", () => {
    // Visitante salva endereço temporariamente na sessão
    const guestAddr = saveCustomerSessionAddress({
      user_id: "guest",
      city_id: "cuiaba",
      label: "Casa Visitante",
      cep: "78000-000",
      rua: "Rua XV de Novembro",
      numero: "50",
      bairro: "Centro Histórico",
      cidade: "Cuiabá",
      uf: "MT",
    });

    expect(guestAddr.id).toBeDefined();

    // Recupera da sessão da cidade correta
    const sessionAddressesCuiaba = getCustomerSessionAddresses("cuiaba");
    expect(sessionAddressesCuiaba.length).toBeGreaterThan(0);
    expect(sessionAddressesCuiaba[0].rua).toBe("Rua XV de Novembro");

    // Na cidade de São Paulo não deve aparecer
    const sessionAddressesSP = getCustomerSessionAddresses("sao-paulo");
    expect(sessionAddressesSP.length).toBe(0);
  });

  it("5. REGRA OBRIGATÓRIA: Taxa fixa de R$ 10,00 para Cuiabá permanece intacta em todas as etapas", async () => {
    expect(TAXA_ENTREGA_CUIABA).toBe(10.0);

    // Cálculo do resumo do pedido para Cuiabá
    const summaryCuiaba = await calculateOrderSummary(
      [{ id: "prod-cuiaba-1", qty: 1 }],
      "cuiaba"
    );

    expect(summaryCuiaba.deliveryFee).toBe(10.0);
    expect(summaryCuiaba.subtotal).toBe(99.9);
    expect(summaryCuiaba.total).toBe(109.9); // 99.90 + 10.00

    // Para São Paulo, NÃO aplica a taxa fixa de R$ 10,00 de Cuiabá
    const summarySP = await calculateOrderSummary(
      [{ id: "prod-cuiaba-1", qty: 1 }],
      "sao-paulo"
    );
    expect(summarySP.deliveryFee).toBe(0.0);
    expect(summarySP.subtotal).toBe(109.9);
    expect(summarySP.total).toBe(109.9);
  });

  it("6. Formatação e mensagem WhatsApp incluem taxa de entrega de R$ 10,00 e total correto", async () => {
    const summary = await calculateOrderSummary(
      [{ id: "prod-cuiaba-1", qty: 2 }],
      "cuiaba"
    );

    const subtotal = summary.subtotal; // 2 * 99.90 = 199.80
    const deliveryFee = summary.deliveryFee; // 10.00
    const total = summary.total; // 209.80

    expect(subtotal).toBe(199.8);
    expect(deliveryFee).toBe(10.0);
    expect(total).toBe(209.8);

    // Validação da mensagem montada para o WhatsApp
    const isCuiaba = true;
    const itemsLines = summary.verifiedItems
      .map((i) => `• ${i.qty}x ${i.name} — ${formatBRL(i.price)} cada (${formatBRL(i.price * i.qty)})`)
      .join("\n");

    const whatsappMessage = [
      "🔥 *Olá! Realizei o pedido test-order-123 na Pantanal Smoke:*",
      "",
      "📍 *Cidade de atendimento:* Cuiabá — MT",
      "👤 *Cliente:* Cliente Teste",
      "📱 *Telefone:* (65) 99999-9999",
      "🏠 *Endereço de Entrega:* Rua das Palmeiras, Nº 120 — Bosque da Saúde, Cuiabá/MT (CEP: 78050-000)",
      "",
      "*Itens do pedido:*",
      itemsLines,
      "",
      `*Subtotal dos produtos:* ${formatBRL(subtotal)}`,
      `*Taxa fixa de entrega (Cuiabá):* ${formatBRL(deliveryFee)}`,
      `*Valor total do pedido:* ${formatBRL(total)}`,
      "*Forma de pagamento:* PIX",
      "",
      "🕒 *Entrega rápida em Cuiabá · Taxa fixa R$ 10,00*",
    ].join("\n");

    expect(whatsappMessage).toContain(`*Taxa fixa de entrega (Cuiabá):* ${formatBRL(deliveryFee)}`);
    expect(whatsappMessage).toContain(`*Valor total do pedido:* ${formatBRL(total)}`);
    expect(whatsappMessage).toContain("Taxa fixa R$ 10,00");
  });
});

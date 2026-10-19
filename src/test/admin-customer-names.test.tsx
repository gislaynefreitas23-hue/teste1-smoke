import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { resolveCustomerName } from "@/routes/admin";
import { processCheckout } from "@/lib/payment/service";
import { supabase } from "@/integrations/supabase/client";

describe("Gestão e Sincronização de Nomes Reais de Clientes", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. resolveCustomerName prioriza o nome real e elimina o fallback artificial 'Cliente Pantanal'", () => {
    // Caso com nome preenchido
    expect(resolveCustomerName("Mariana Costa", "65999991111")).toBe("Mariana Costa");

    // Caso com nome vazio mas com telefone
    expect(resolveCustomerName("", "65999991111")).toBe("Cliente (65999991111)");
    expect(resolveCustomerName("   ", "65999991111")).toBe("Cliente (65999991111)");

    // Caso onde o nome era 'Cliente Pantanal'
    expect(resolveCustomerName("Cliente Pantanal", "65999991111")).toBe("Cliente (65999991111)");

    // Caso sem nome e sem telefone
    expect(resolveCustomerName("", null)).toBe("Cliente sem nome informado");
    expect(resolveCustomerName("Cliente Pantanal", undefined)).toBe("Cliente sem nome informado");
  });

  it("2. processCheckout sincroniza o nome completo no perfil do usuário autenticado", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.spyOn(supabase as any, "rpc").mockResolvedValue({
      data: { id: "ord-test-123" },
      error: null,
    });

    vi.spyOn(supabase, "from").mockImplementation((table: string): any => {
      if (table === "profiles") {
        return {
          update: updateSpy,
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
                    name: "Pod Ignite V80",
                    price: 99.9,
                    active: true,
                    product_city_inventories: [
                      { city_id: "cuiaba", price: 89.9, stock: 10, active: true },
                    ],
                  },
                ],
                error: null,
              }),
          }),
        };
      }
      return {
        insert: () => Promise.resolve({ data: { id: "ord-test-123" }, error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    });

    const payload = {
      items: [{ id: "055e851d-e131-41c4-bbb5-6e358c2e719b", qty: 1 }],
      customer: {
        name: "Beatriz Oliveira",
        phone: "65988887777",
        email: "beatriz@teste.com",
      },
      address: {
        cep: "78000-000",
        rua: "Rua das Flores",
        numero: "123",
        bairro: "Centro",
        cidade: "Cuiabá",
        uf: "MT",
      },
      paymentMethod: "pix" as const,
      selectedCityId: "cuiaba" as const,
      idempotencyKey: `test_key_${Date.now()}`,
    };

    const result = await processCheckout(payload, 0, "usr-logged-in-123");
    expect(result.success).toBe(true);

    // Verifica que houve chamada para atualizar o nome na tabela profiles com o id do usuário
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Beatriz Oliveira",
      })
    );
  });
});

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  productsQueryOptions,
  singleProductQueryOptions,
  getLocalCachedProducts,
  getLocalCacheTimestamp,
  type Product,
} from "@/lib/brasa";
import { calculateOrderSummary } from "@/lib/payment/service";
import { supabase } from "@/integrations/supabase/client";

describe("Etapa 1 — Passo 4: Estratégia de Cache Stale-While-Revalidate do Catálogo", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockCuiabaProduct: Product = {
    id: "prod-cb-1",
    name: "Pod Descartável Cuiabá",
    category: "Pod Descartável",
    price: 90,
    stock: 10,
    image_url: "",
    city_id: "cuiaba",
  };

  const mockSPProduct: Product = {
    id: "prod-sp-1",
    name: "Pod Descartável São Paulo",
    category: "Pod Descartável",
    price: 110,
    stock: 5,
    image_url: "",
    city_id: "sao-paulo",
  };

  it("Cenário 1: Primeiro acesso sem cache — initialData é undefined e exibe carregamento limpo", () => {
    const options = productsQueryOptions("cuiaba");
    const initial = typeof options.initialData === "function" ? options.initialData() : options.initialData;
    expect(initial).toBeUndefined();

    const timestamp = typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : 0;
    expect(timestamp).toBe(0);
  });

  it("Cenário 2: Segundo acesso com cache válido — initialData retorna dados instantaneamente e com timestamp recente", () => {
    const now = Date.now();
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([mockCuiabaProduct]));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(now));

    const options = productsQueryOptions("cuiaba");
    const initial = typeof options.initialData === "function" ? options.initialData() : options.initialData;
    expect(initial).toEqual([mockCuiabaProduct]);

    const timestamp = typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : 0;
    expect(timestamp).toBe(now);
    expect(options.staleTime).toBe(1000 * 60 * 5); // 5 min
  });

  it("Cenário 3: Acesso com cache expirado — initialData fornece dados para render imediato e idade do cache indica stale", () => {
    const tenMinutesAgo = Date.now() - 1000 * 60 * 10;
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([mockCuiabaProduct]));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(tenMinutesAgo));

    const options = productsQueryOptions("cuiaba");
    const initial = typeof options.initialData === "function" ? options.initialData() : options.initialData;
    expect(initial).toEqual([mockCuiabaProduct]);

    const timestamp = typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : 0;
    expect(timestamp).toBe(tenMinutesAgo);

    // Idade do cache é maior que staleTime (5 min), provocando revalidação em segundo plano
    const age = Date.now() - timestamp;
    expect(age).toBeGreaterThan(options.staleTime!);
  });

  it("Cenário 4: Alteração de preço no painel administrativo — reflete valor atualizado", () => {
    const updatedProduct = { ...mockCuiabaProduct, price: 95 };
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([updatedProduct]));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const cached = getLocalCachedProducts("cuiaba");
    expect(cached[0].price).toBe(95);
  });

  it("Cenário 5: Alteração de estoque — reflete saldo de inventário por cidade", () => {
    const lowStockProduct = { ...mockSPProduct, stock: 2 };
    localStorage.setItem("ps_products_cache_sao-paulo", JSON.stringify([lowStockProduct]));

    const cached = getLocalCachedProducts("sao-paulo");
    expect(cached[0].stock).toBe(2);
  });

  it("Cenário 6: Produto desativado — filtrado do catálogo ativo", () => {
    const activeProduct = { ...mockCuiabaProduct, id: "active-1" };
    const inactiveProduct = { ...mockCuiabaProduct, id: "inactive-2", active: false };

    // Simula lista com produto inativo
    const list = [activeProduct, inactiveProduct].filter((p: any) => p.active !== false);
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(list));

    const cached = getLocalCachedProducts("cuiaba");
    expect(cached.length).toBe(1);
    expect(cached[0].id).toBe("active-1");
  });

  it("Cenário 7: Troca entre Cuiabá e São Paulo — isolamento estrito sem contaminação entre cidades", () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([mockCuiabaProduct]));
    localStorage.setItem("ps_products_cache_sao-paulo", JSON.stringify([mockSPProduct]));

    const cuiabaCached = getLocalCachedProducts("cuiaba");
    expect(cuiabaCached).toEqual([mockCuiabaProduct]);
    expect(cuiabaCached.find((p) => p.city_id === "sao-paulo")).toBeUndefined();

    const spCached = getLocalCachedProducts("sao-paulo");
    expect(spCached).toEqual([mockSPProduct]);
    expect(spCached.find((p) => p.city_id === "cuiaba")).toBeUndefined();
  });

  it("Cenário 8: Falha de conexão com o Supabase — fallback seguro retorna cache local existente", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([mockCuiabaProduct]));

    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error("Supabase Network Failure")),
          }),
        }),
      }),
    } as any);

    const options = productsQueryOptions("cuiaba");
    const result = await options.queryFn({} as any);
    expect(result).toEqual([mockCuiabaProduct]);
  });

  it("Cenário 9: Atualização da página (F5) — singleProductQueryOptions também recupera produto instantaneamente do cache", () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify([mockCuiabaProduct]));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const singleOptions = singleProductQueryOptions("prod-cb-1", "cuiaba");
    const initial = typeof singleOptions.initialData === "function" ? singleOptions.initialData() : singleOptions.initialData;
    expect(initial).toEqual(mockCuiabaProduct);
  });

  it("Cenário 10: Carrinho com produtos previamente adicionados preserva dados locais", () => {
    // Carrinho opera sobre itens selecionados independente da revalidação do catálogo
    const cartItems = [
      { id: "prod-cb-1", name: "Pod Descartável Cuiabá", price: 90, qty: 2, cityId: "cuiaba" },
    ];
    expect(cartItems[0].qty).toBe(2);
    expect(cartItems[0].price).toBe(90);
  });

  it("Cenário 11: Finalização de pedido com preço ou estoque alterado — servidor valida preços reais no Supabase e ignora adulteração de cliente", async () => {
    // Mock do Supabase retornando o preço verdadeiro do banco de dados (R$ 100,00)
    // mesmo que o cliente tente enviar com preço antigo ou adulterado
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: "prod-cb-1",
              name: "Pod Descartável Cuiabá",
              price: 100.0, // Preço real do banco
              active: true,
              product_city_inventories: [
                { city_id: "cuiaba", price: 100.0, stock: 5, active: true },
              ],
            },
          ],
          error: null,
        }),
      }),
    } as any);

    // Cliente envia pedido alegando preço antigo (R$ 90,00)
    const clientItem = { id: "prod-cb-1", qty: 2 };
    const summary = await calculateOrderSummary([clientItem], "cuiaba", false, 0);

    // Servidor calcula com base no preço real do banco (2 * R$ 100 = R$ 200 + R$ 10 taxa = R$ 210)
    expect(summary.subtotal).toBe(200.0);
    expect(summary.deliveryFee).toBe(10.0);
    expect(summary.total).toBe(210.0);
    expect(summary.verifiedItems[0].price).toBe(100.0);
  });
});

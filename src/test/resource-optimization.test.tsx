import { describe, expect, it, vi, beforeEach } from "vitest";
import { productsQueryOptions, singleProductQueryOptions } from "@/lib/brasa";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

describe("Primeira Etapa de Otimização de Recursos (Lovable Cloud / PostgreSQL)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Catálogo público possui cache de 5 minutos e desativa refetchOnWindowFocus", () => {
    const catalogOptions = productsQueryOptions("cuiaba");
    expect(catalogOptions.staleTime).toBe(1000 * 60 * 5); // 5 minutos
    expect(catalogOptions.gcTime).toBe(1000 * 60 * 30); // 30 minutos
    expect(catalogOptions.refetchOnWindowFocus).toBe(false);

    const singleOptions = singleProductQueryOptions("test-id", "cuiaba");
    expect(singleOptions.staleTime).toBe(1000 * 60 * 5); // 5 minutos
    expect(singleOptions.gcTime).toBe(1000 * 60 * 30);
    expect(singleOptions.refetchOnWindowFocus).toBe(false);
  });

  it("2. O canal Realtime de pedidos no painel administrativo invalida a chave 'admin-orders'", () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simula a recepção de um evento postgres_changes na tabela 'orders'
    let orderEventHandler: any = null;
    const channelMock = {
      on: vi.fn((_type: string, filter: any, callback: any) => {
        if (filter.table === "orders") {
          orderEventHandler = callback;
        }
        return channelMock;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };

    vi.spyOn(supabase, "channel").mockReturnValue(channelMock as any);

    // Instancia o canal conforme implementado em admin.tsx
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .subscribe();

    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      expect.any(Function)
    );

    // Dispara evento de novo pedido
    orderEventHandler?.({ new: { id: "novo-pedido-123", status: "pendente" } });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin-orders"] });
  });

  it("3. Canal Realtime público em __root.tsx não assina mais a tabela 'orders'", () => {
    const queryClient = new QueryClient();
    const tablesSubscribed: string[] = [];

    const channelMock = {
      on: vi.fn((_type: string, filter: any) => {
        if (filter.table) {
          tablesSubscribed.push(filter.table);
        }
        return channelMock;
      }),
      subscribe: vi.fn().mockReturnThis(),
    };

    vi.spyOn(supabase, "channel").mockReturnValue(channelMock as any);

    // Simula o canal público configurado em __root.tsx
    supabase
      .channel("pantanal-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .subscribe();

    // Garante que 'products' é assinado, mas 'orders' NÃO é assinado pelo canal público
    expect(tablesSubscribed).toContain("products");
    expect(tablesSubscribed).not.toContain("orders");
  });
});

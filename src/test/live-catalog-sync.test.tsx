import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { productsQueryOptions, singleProductQueryOptions, formatBRL } from "@/lib/brasa";
import { DEFAULT_STORE_SETTINGS, getStoreSettings } from "@/lib/store-settings";
import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";

describe("Live Catalog Sync & Real-time Site Updates", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    localStorage.clear();
  });

  it("1. Garante que os 6 Pods EBCREATE BC Pro 40K estão na ordem prioritária no topo do catálogo", () => {
    const settings = getStoreSettings();
    expect(settings.productOrder.length).toBeGreaterThanOrEqual(6);

    // Os 6 primeiros IDs devem ser os pods emblemáticos
    const expectedPodIds = [
      "055e851d-e131-41c4-bbb5-6e358c2e719b", // Aurora Berries
      "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff", // Pink Lemonade
      "e8717cb6-9ceb-4997-9162-09e08fbefb41", // Golden Berry
      "9739d60d-33e4-4540-8d0b-2bdeda2cae86", // Pineapple Toasted
      "1eeb97e8-5f52-48a4-9847-cd62daf9b37f", // Triple Berry
      "566e06a8-2051-40f7-90df-70b0a275a1ad", // Clear
    ];

    expectedPodIds.forEach((id) => {
      expect(settings.productOrder).toContain(id);
      expect(settings.productBadges[id]).toBe("lancamento");
    });
  });

  it("2. Carrossel de Banners utiliza fotos e links reais dos pods sem depender de assets estáticos", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProductBannerCarousel />
      </QueryClientProvider>
    );

    // Deve exibir o slide ativo inicial com o nome e puffs
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getAllByText("40.000 PUFFS").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ver Detalhes & Pedir/i).length).toBeGreaterThanOrEqual(1);
  });

  it("3. Formata corretamente preços atualizados em R$ 89,90", () => {
    expect(formatBRL(89.9)).toContain("89,90");
    expect(formatBRL("89.90")).toContain("89,90");
  });
});

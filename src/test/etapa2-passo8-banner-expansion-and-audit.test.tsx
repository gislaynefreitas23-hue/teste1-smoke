import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { ProductBannerCarousel, SLIDES } from "@/components/ProductBannerCarousel";
import { CityProvider, CITY_STORAGE_KEY } from "@/lib/city";
import { CART_KEY, AGE_GATE_KEY, productsQueryOptions, type Product } from "@/lib/brasa";
import { getStoreSettings, DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";
import { getTransparentPodAsset } from "@/lib/image-processing";

describe("Etapa 2 — Passo 8: Correção Final do Banner e Auditoria Geral", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(CITY_STORAGE_KEY, "cuiaba");
    localStorage.setItem(AGE_GATE_KEY, "true");
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    if (typeof globalThis.ResizeObserver === "undefined") {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;
    }
  });

  it("1. Banner Mobile: renderiza o botão discreto de expansão 'Ver mais' para descrições longas", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <ProductBannerCarousel />
        </CityProvider>
      </QueryClientProvider>
    );

    // O botão de expansão 'Ver mais' deve estar presente no documento
    const toggleButton = screen.getByRole("button", { name: /Ler descrição completa/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveTextContent("Ver mais");
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("2. Banner Mobile: clicar em 'Ver mais' expande o texto completo e altera o botão para 'Ver menos'", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <ProductBannerCarousel />
        </CityProvider>
      </QueryClientProvider>
    );

    const toggleButton = screen.getByRole("button", { name: /Ler descrição completa/i });

    // Clica para expandir
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // O botão deve alternar para 'Ver menos'
    expect(toggleButton).toHaveTextContent("Ver menos");
    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");

    // Clica novamente para recolher
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(toggleButton).toHaveTextContent("Ver mais");
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("3. Navegação entre slides reseta o estado de expansão de forma limpa", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <ProductBannerCarousel />
        </CityProvider>
      </QueryClientProvider>
    );

    const toggleButton = screen.getByRole("button", { name: /Ler descrição completa/i });
    await act(async () => {
      fireEvent.click(toggleButton);
    });
    expect(toggleButton).toHaveTextContent("Ver menos");

    // Avança para o próximo slide
    const nextBtn = screen.getByRole("button", { name: /Próximo slide/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // No novo slide, a descrição não deve estar expandida
    const nextToggle = screen.getByRole("button", { name: /Ler descrição completa/i });
    expect(nextToggle).toHaveTextContent("Ver mais");
    expect(nextToggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("4. Auditoria de Carregamento: cache local responde no Frame 0 (tempo < 5ms)", () => {
    const mockProducts: Product[] = [
      {
        id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
        name: "EBCREATE BC Pro 40K - Aurora Berries",
        category: "Pod Descartável",
        price: 89.9,
        stock: 10,
        city_id: "cuiaba",
      },
    ];
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(mockProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const start = performance.now();
    const options = productsQueryOptions("cuiaba");
    const cachedData = options.initialData ? (typeof options.initialData === "function" ? (options.initialData as any)() : options.initialData) : null;
    const duration = performance.now() - start;

    expect(cachedData).toBeDefined();
    expect(cachedData.length).toBe(1);
    expect(duration).toBeLessThan(5); // Leitura síncrona instantânea
  });

  it("5. Auditoria de Navegação e Integridade: todos os slides possuem productId e buttonUrl válidos", () => {
    SLIDES.forEach((slide) => {
      expect(slide.productId).toBeDefined();
      expect(slide.buttonUrl).toBe(`/produtos/${slide.productId}`);
    });
  });

  it("6. Auditoria de Imagens: Aurora Berries e Clear resolvem para ativos com transparência comprovada", () => {
    const auroraAsset = getTransparentPodAsset(
      "055e851d-e131-41c4-bbb5-6e358c2e719b",
      "https://whvvxnwrldzyafwiflir.supabase.co/storage/v1/object/sign/products/banners-1792350811460-j7tyf7.png",
      "Aurora Berries"
    );
    expect(auroraAsset).toContain("aurora-berries");

    const clearAsset = getTransparentPodAsset(
      "5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d",
      "https://whvvxnwrldzyafwiflir.supabase.co/storage/v1/object/sign/products/catalog-1792351430319-siqbc4.png",
      "Clear"
    );
    expect(clearAsset).toContain("clear");
  });

  it("7. Auditoria de Carrinho e Checkout: persistência de imagem sem URLs temporárias expiradas", async () => {
    const cartItems = [
      {
        id: "5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d",
        name: "EBCREATE BC Pro 40K - Clear",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 15,
      },
    ];
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });

    // Confirma foto no carrinho
    const cartImg = screen.getByAltText("EBCREATE BC Pro 40K - Clear");
    expect(cartImg).toBeInTheDocument();
    expect(cartImg.getAttribute("src")).toContain("clear");

    // Confirma miniatura no checkout
    await act(async () => {
      await router.navigate({ to: "/checkout" });
    });

    const checkoutImg = screen.getByAltText("EBCREATE BC Pro 40K - Clear");
    expect(checkoutImg).toBeInTheDocument();
    expect(checkoutImg.getAttribute("src")).toContain("clear");
  });
});

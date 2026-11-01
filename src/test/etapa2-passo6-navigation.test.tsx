import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { POD_PRODUCT_IDS, SLIDES } from "@/components/ProductBannerCarousel";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";
import { AGE_GATE_KEY, type Product } from "@/lib/brasa";
import { CITY_STORAGE_KEY } from "@/lib/city";

describe("Etapa 2 — Passo 6: Navegação entre Catálogo, Produtos Individuais e Banners", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(CITY_STORAGE_KEY, "cuiaba");
    localStorage.setItem(AGE_GATE_KEY, "true");
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const sampleProducts: Product[] = [
    {
      id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
      name: "EBCREATE BC Pro 40K - Aurora Berries",
      category: "Pod Descartável",
      description: "Amoras silvestres e menta gelada",
      flavor_profile: "Frutas Roxas e Menta",
      intensity: "Alta",
      price: 89.9,
      stock: 15,
      image_url: "/assets/aurora-berries.png",
      city_id: "cuiaba",
    },
    {
      id: "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff",
      name: "EBCREATE BC Pro 40K - Pink Lemonade",
      category: "Pod Descartável",
      description: "Limão siciliano e frutas vermelhas",
      flavor_profile: "Cítrico",
      intensity: "Média",
      price: 89.9,
      stock: 10,
      image_url: "/assets/pink-lemonade.png",
      city_id: "cuiaba",
    },
    {
      id: "9739d60d-33e4-4540-8d0b-2bdeda2cae86",
      name: "EBCREATE BC Pro 40K - Toasted Pineapple",
      category: "Pod Descartável",
      description: "Abacaxi tostado exclusivo",
      flavor_profile: "Tropical",
      intensity: "Alta",
      price: 89.9,
      stock: 8,
      image_url: "/assets/toasted-pineapple.png",
      city_id: "cuiaba",
    },
  ];

  it("1. Resolução correta dos IDs oficiais nos slides e banners padrão", () => {
    expect(POD_PRODUCT_IDS["Aurora Berries"]).toBe("055e851d-e131-41c4-bbb5-6e358c2e719b");
    expect(POD_PRODUCT_IDS["Pink Lemonade"]).toBe("be4c4ce8-cd8f-4a71-97ef-b6c0775505ff");
    expect(POD_PRODUCT_IDS["Toasted Pineapple"]).toBe("9739d60d-33e4-4540-8d0b-2bdeda2cae86");

    // Confirma que os slides padrão apontam exatamente para os IDs dos produtos
    expect(SLIDES[0].productId).toBe("055e851d-e131-41c4-bbb5-6e358c2e719b");
    expect(SLIDES[0].buttonUrl).toBe("/produtos/055e851d-e131-41c4-bbb5-6e358c2e719b");

    expect(SLIDES[1].productId).toBe("be4c4ce8-cd8f-4a71-97ef-b6c0775505ff");
    expect(SLIDES[1].buttonUrl).toBe("/produtos/be4c4ce8-cd8f-4a71-97ef-b6c0775505ff");

    expect(SLIDES[2].productId).toBe("9739d60d-33e4-4540-8d0b-2bdeda2cae86");
    expect(SLIDES[2].buttonUrl).toBe("/produtos/9739d60d-33e4-4540-8d0b-2bdeda2cae86");
  });

  it("2. DEFAULT_STORE_SETTINGS possui productId e buttonUrl associados aos banners", () => {
    const banners = DEFAULT_STORE_SETTINGS.banners;
    expect(banners[0].productId).toBe("055e851d-e131-41c4-bbb5-6e358c2e719b");
    expect(banners[0].buttonUrl).toBe("/produtos/055e851d-e131-41c4-bbb5-6e358c2e719b");

    expect(banners[1].productId).toBe("be4c4ce8-cd8f-4a71-97ef-b6c0775505ff");
    expect(banners[1].buttonUrl).toBe("/produtos/be4c4ce8-cd8f-4a71-97ef-b6c0775505ff");

    expect(banners[2].productId).toBe("9739d60d-33e4-4540-8d0b-2bdeda2cae86");
    expect(banners[2].buttonUrl).toBe("/produtos/9739d60d-33e4-4540-8d0b-2bdeda2cae86");
  });

  it("3. Navegação ao produto individual via rota /produtos/$productId renderiza ProductDetailPage em vez de retornar ao banner", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(sampleProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // Navega diretamente para um produto específico (Aurora Berries)
    await act(async () => {
      await router.navigate({
        to: "/produtos/$productId",
        params: { productId: "055e851d-e131-41c4-bbb5-6e358c2e719b" },
      });
    });

    // Confirma que a página do produto foi renderizada
    expect(screen.getByText("Voltar ao Catálogo")).toBeInTheDocument();
    expect(screen.getAllByText("EBCREATE BC Pro 40K - Aurora Berries").length).toBeGreaterThan(0);

    // Garante que o carrossel do catálogo NÃO está sendo renderizado no lugar da página de detalhes
    expect(screen.queryByRole("heading", { name: "Catálogo" })).toBeNull();
  });

  it("4. Navegação do CTA do Banner para o produto Aurora Berries abre os detalhes corretos", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(sampleProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // Navega para o link do botão do banner (Slide 1)
    await act(async () => {
      await router.navigate({
        to: SLIDES[0].buttonUrl as any,
      });
    });

    expect(screen.getByText("Voltar ao Catálogo")).toBeInTheDocument();
    expect(screen.getAllByText("EBCREATE BC Pro 40K - Aurora Berries").length).toBeGreaterThan(0);
  });

  it("5. Navegação do CTA do Banner para o produto Pink Lemonade abre os detalhes corretos", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(sampleProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // Navega para o link do botão do banner (Slide 2)
    await act(async () => {
      await router.navigate({
        to: SLIDES[1].buttonUrl as any,
      });
    });

    expect(screen.getByText("Voltar ao Catálogo")).toBeInTheDocument();
    expect(screen.getAllByText("EBCREATE BC Pro 40K - Pink Lemonade").length).toBeGreaterThan(0);
  });

  it("6. Navegação do CTA do Banner para o produto Toasted Pineapple abre os detalhes corretos", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(sampleProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // Navega para o link do botão do banner (Slide 3)
    await act(async () => {
      await router.navigate({
        to: SLIDES[2].buttonUrl as any,
      });
    });

    expect(screen.getByText("Voltar ao Catálogo")).toBeInTheDocument();
    expect(screen.getAllByText("EBCREATE BC Pro 40K - Toasted Pineapple").length).toBeGreaterThan(0);
  });

  it("7. Botão Voltar ao Catálogo retorna para a listagem sem erros", async () => {
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(sampleProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // 1. Está no produto
    await act(async () => {
      await router.navigate({
        to: "/produtos/$productId",
        params: { productId: "055e851d-e131-41c4-bbb5-6e358c2e719b" },
      });
    });
    expect(screen.getByText("Voltar ao Catálogo")).toBeInTheDocument();

    // 2. Volta para /produtos
    await act(async () => {
      await router.navigate({ to: "/produtos" });
    });
    expect(screen.getByRole("heading", { name: "Catálogo" })).toBeInTheDocument();
    expect(screen.queryByText("Voltar ao Catálogo")).toBeNull();
  });

  it("8. Compatibilidade multicidade: navegação em São Paulo respeita a cidade ativa", async () => {
    localStorage.setItem(CITY_STORAGE_KEY, "sao-paulo");
    const spProducts: Product[] = sampleProducts.map((p) => ({ ...p, city_id: "sao-paulo" as const }));
    localStorage.setItem("ps_products_cache_sao-paulo", JSON.stringify(spProducts));
    localStorage.setItem("ps_products_cache_time_sao-paulo", String(Date.now()));

    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    await act(async () => {
      await router.navigate({
        to: "/produtos/$productId",
        params: { productId: "055e851d-e131-41c4-bbb5-6e358c2e719b" },
      });
    });

    expect(screen.getAllByText("EBCREATE BC Pro 40K - Aurora Berries").length).toBeGreaterThan(0);
    expect(screen.getByText("São Paulo — SP")).toBeInTheDocument();
  });
});

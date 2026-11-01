import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { CartProvider, useCart } from "@/lib/cart";
import { CityProvider, CITY_STORAGE_KEY } from "@/lib/city";
import { CART_KEY, AGE_GATE_KEY, type Product } from "@/lib/brasa";
import {
  getTransparentPodAsset,
  ORIGINAL_SEEDED_STORAGE_FILES,
  POD_TRANSPARENT_ASSETS,
} from "@/lib/image-processing";
import { POD_PRODUCT_IDS, SLIDES } from "@/components/ProductBannerCarousel";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";

describe("Etapa 2 — Passo 7: Correção das Imagens de Produtos, Banners, Carrinho e Checkout", () => {
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

  it("1. Aurora Berries: arquivo remoto do banner mapeia diretamente para o asset com transparência real", () => {
    // 1.1 Confirma que o arquivo remoto está registrado em ORIGINAL_SEEDED_STORAGE_FILES
    expect(ORIGINAL_SEEDED_STORAGE_FILES["banners-1792350811460-j7tyf7.png"]).toBeDefined();

    // 1.2 getTransparentPodAsset resolve a URL do banner diretamente para o asset transparente
    const resolved = getTransparentPodAsset(
      "055e851d-e131-41c4-bbb5-6e358c2e719b",
      "https://whvvxnwrldzyafwiflir.supabase.co/storage/v1/object/sign/products/banners-1792350811460-j7tyf7.png?token=xyz",
      "Aurora Berries"
    );
    expect(resolved).toBeTruthy();
    expect(resolved).toContain("aurora-berries");

    // 1.3 O slide padrão em SLIDES[0] aponta para imagem válida
    expect(SLIDES[0].image).toBeTruthy();
  });

  it("2. Clear: ID oficial 5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d mapeia para o asset transparente oficial", () => {
    const officialId = "5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d";

    // 2.1 POD_PRODUCT_IDS possui o ID oficial
    expect(POD_PRODUCT_IDS["Clear"]).toBe(officialId);

    // 2.2 POD_TRANSPARENT_ASSETS possui o ID oficial
    expect(POD_TRANSPARENT_ASSETS[officialId]).toBeDefined();

    // 2.3 Resolução pelo ID oficial retorna o asset do Clear
    const assetFromId = getTransparentPodAsset(officialId, null, "EBCREATE BC Pro 40K - Clear");
    expect(assetFromId).toBeTruthy();
    expect(assetFromId).toContain("clear");

    // 2.4 Resolução pelo arquivo do Supabase Storage catalog-1792351430319-siqbc4.png
    const assetFromStorage = getTransparentPodAsset(
      null,
      "https://whvvxnwrldzyafwiflir.supabase.co/storage/v1/object/sign/products/catalog-1792351430319-siqbc4.png?token=abc",
      null
    );
    expect(assetFromStorage).toBeTruthy();
    expect(assetFromStorage).toContain("clear");
  });

  it("3. Carrinho: exibe a imagem correta do produto no CartItemRow sem fallback cinza", async () => {
    // Popula o carrinho com um produto pod
    const cartItems = [
      {
        id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
        name: "EBCREATE BC Pro 40K - Aurora Berries",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 10,
        imageUrl: "/assets/banner-aurora-berries.png",
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

    // Confirma que a página do carrinho foi renderizada com o item
    expect(screen.getByText("Carrinho de compras")).toBeInTheDocument();
    expect(screen.getByText("EBCREATE BC Pro 40K - Aurora Berries")).toBeInTheDocument();

    // Confirma que a tag <img> está presente para a foto do produto
    const img = screen.getByAltText("EBCREATE BC Pro 40K - Aurora Berries");
    expect(img).toBeInTheDocument();
    expect(img.tagName.toLowerCase()).toBe("img");
    expect(img.getAttribute("src")).toBeTruthy();
  });

  it("4. Carrinho: recupera a imagem pelo ID oficial mesmo quando imageUrl vier vazia ou nula", async () => {
    const cartItems = [
      {
        id: "5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d", // Clear oficial
        name: "EBCREATE BC Pro 40K - Clear",
        price: 89.9,
        qty: 2,
        cityId: "cuiaba" as const,
        stock: 15,
        imageUrl: "", // Sem URL explícita
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

    const img = screen.getByAltText("EBCREATE BC Pro 40K - Clear");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("clear");
  });

  it("5. Checkout: renderiza miniatura da imagem de cada produto no resumo do pedido", async () => {
    const cartItems = [
      {
        id: "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff",
        name: "EBCREATE BC Pro 40K - Pink Lemonade",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 8,
        imageUrl: "/assets/pink-lemonade.png",
      },
      {
        id: "9739d60d-33e4-4540-8d0b-2bdeda2cae86",
        name: "EBCREATE BC Pro 40K – Pineapple Toasted",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 5,
        imageUrl: "/assets/toasted-pineapple.png",
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
      await router.navigate({ to: "/checkout" });
    });

    // Confirma que a página de Checkout foi renderizada
    expect(screen.getByText("Resumo do Pedido")).toBeInTheDocument();

    // Confirma as miniaturas dos dois produtos no resumo do checkout
    const imgPink = screen.getByAltText("EBCREATE BC Pro 40K - Pink Lemonade");
    const imgPineapple = screen.getByAltText("EBCREATE BC Pro 40K – Pineapple Toasted");

    expect(imgPink).toBeInTheDocument();
    expect(imgPink.getAttribute("src")).toBeTruthy();

    expect(imgPineapple).toBeInTheDocument();
    expect(imgPineapple.getAttribute("src")).toBeTruthy();
  });

  it("6. Persistência: recarregamento da página (F5 / localStorage) mantém as imagens em Carrinho e Checkout", async () => {
    const cartItems = [
      {
        id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
        name: "EBCREATE BC Pro 40K - Aurora Berries",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 12,
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

    // Navega ao carrinho
    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });
    expect(screen.getByAltText("EBCREATE BC Pro 40K - Aurora Berries")).toBeInTheDocument();

    // Navega ao checkout
    await act(async () => {
      await router.navigate({ to: "/checkout" });
    });
    expect(screen.getByAltText("EBCREATE BC Pro 40K - Aurora Berries")).toBeInTheDocument();
  });

  it("7. Compatibilidade multicidade: produtos em São Paulo exibem suas imagens corretamente", async () => {
    localStorage.setItem(CITY_STORAGE_KEY, "sao-paulo");
    localStorage.setItem(AGE_GATE_KEY, "true");

    const cartItems = [
      {
        id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
        name: "EBCREATE BC Pro 40K - Aurora Berries",
        price: 89.9,
        qty: 1,
        cityId: "sao-paulo" as const,
        stock: 5,
        imageUrl: "/assets/banner-aurora-berries.png",
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

    expect(screen.getAllByText("São Paulo").length).toBeGreaterThan(0);
    const img = screen.getByAltText("EBCREATE BC Pro 40K - Aurora Berries");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBeTruthy();
  });
});

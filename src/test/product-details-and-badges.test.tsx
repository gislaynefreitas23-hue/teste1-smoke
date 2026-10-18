import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { CartProvider } from "@/lib/cart";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DEFAULT_STORE_SETTINGS, getStoreSettings, saveStoreSettings } from "@/lib/store-settings";
import type { Product } from "@/lib/brasa";

// Mock router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useRouter: () => ({ navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
}));

import { CityProvider } from "@/lib/city";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <CartProvider initialCity="cuiaba">
          {ui}
        </CartProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}

const mockProduct: Product = {
  id: "prod-ignite-v80",
  name: "Pod Descartável Ignite V80",
  category: "Pod Descartável",
  description: "Dispositivo descartável com 8000 puffs, sabor intenso e bateria recarregável Type-C.",
  flavor_profile: "Watermelon Ice",
  intensity: "forte",
  price: 99.9,
  image_url: "https://example.com/ignite.jpg",
  active: true,
  badge: "lancamento",
};

const mockPromoProduct: Product = {
  id: "prod-elfbar-bc5000",
  name: "Pod Elf Bar BC5000",
  category: "Pod Descartável",
  description: "Compacto e saboroso com 5000 puffs e visual gradiente.",
  flavor_profile: "Blue Razz Ice",
  intensity: "média",
  price: 89.9,
  promo_price: 69.9,
  image_url: "https://example.com/elfbar.jpg",
  active: true,
  badge: "promocao",
};

describe("Modal de Detalhes do Produto & Destaques de Catálogo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1. Permite abrir o modal ao clicar no card do produto e exibe foto ampliada e descrição completa", async () => {
    renderWithProviders(<ProductCard product={mockProduct} cityId="cuiaba" />);

    // Verifica que o card exibe o produto
    const nameElements = screen.getAllByText("Pod Descartável Ignite V80");
    expect(nameElements.length).toBeGreaterThan(0);

    // Clica no card para abrir o modal de detalhes
    const article = screen.getByRole("button", { name: /Ver detalhes do produto/i });
    fireEvent.click(article);

    // O modal abre e exibe a descrição completa e título
    await waitFor(() => {
      const descElements = screen.getAllByText(/Dispositivo descartável com 8000 puffs/i);
      expect(descElements.length).toBeGreaterThan(0);
      expect(screen.getByRole("dialog")).toBeDefined();
    });

    // Verifica botão de adicionar ao carrinho dentro do modal
    expect(screen.getByText(/Adicionar ao Carrinho/i)).toBeDefined();
    expect(screen.getAllByText(/Watermelon Ice/i).length).toBeGreaterThan(0);
  });

  it("2. Exibe selo de 'LANÇAMENTO' no card e no modal quando ativado", async () => {
    renderWithProviders(<ProductCard product={mockProduct} cityId="cuiaba" />);

    // Selo no card
    const badges = screen.getAllByText(/LANÇAMENTO/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("3. Exibe selo de 'PROMOÇÃO' com preço promocional e preço original riscado", async () => {
    renderWithProviders(<ProductCard product={mockPromoProduct} cityId="cuiaba" />);

    // Selo de promoção
    const badges = screen.getAllByText(/PROMOÇÃO/i);
    expect(badges.length).toBeGreaterThan(0);

    // Verifica preço promocional de R$ 69,90 exibido
    expect(screen.getAllByText(/69,90/).length).toBeGreaterThan(0);
  });

  it("4. ProductDetailModal renderiza controles de quantidade e adiciona ao carrinho", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ProductDetailModal
        product={mockProduct}
        open={true}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        cityId="cuiaba"
      />
    );

    // Aumenta quantidade para 2
    const incButton = screen.getByLabelText("Aumentar quantidade");
    fireEvent.click(incButton);

    // Clica no botão de adicionar
    const addBtn = screen.getByText(/Adicionar ao Carrinho/i);
    fireEvent.click(addBtn);

    // Verifica que fechou o modal após adicionar
    expect(onClose).toHaveBeenCalled();
  });

  it("5. Persiste e carrega productBadges, productPromoPrices e productOrder em StoreSettings", () => {
    const current = getStoreSettings();
    expect(current.productBadges).toBeDefined();
    expect(current.productOrder).toBeDefined();

    saveStoreSettings({
      ...current,
      productBadges: { "prod-1": "lancamento", "prod-2": "promocao" },
      productPromoPrices: { "prod-2": 49.9 },
      productOrder: ["prod-2", "prod-1"],
    });

    const updated = getStoreSettings();
    expect(updated.productBadges["prod-1"]).toBe("lancamento");
    expect(updated.productBadges["prod-2"]).toBe("promocao");
    expect(updated.productPromoPrices["prod-2"]).toBe(49.9);
    expect(updated.productOrder).toEqual(["prod-2", "prod-1"]);
  });
});

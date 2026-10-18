import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "@/lib/cart";
import { CityProvider } from "@/lib/city";
import { Route as ProductDetailRoute } from "@/routes/produtos.$productId";
import { Route as ProdutoRedirectRoute } from "@/routes/produto.$productId";
import type { Product } from "@/lib/brasa";

const mockNavigate = vi.fn();
let mockRouteParams: { productId: string } = { productId: "prod-pod-ignite" };

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ navigate: mockNavigate }),
    useNavigate: () => mockNavigate,
  };
});

// Mock Supabase para retornar o produto com inventários por cidade
const mockProductDb: Product = {
  id: "prod-pod-ignite",
  name: "Pod Descartável Ignite V80 8000 Puffs",
  category: "Pod Descartável",
  description: "Dispositivo descartável de alta performance com 8000 puffs, sabor marcante e bateria recarregável USB-C.",
  flavor_profile: "Watermelon Ice",
  intensity: "forte",
  price: 99.9,
  promo_price: 84.9,
  badge: "promocao",
  image_url: "https://example.com/ignite-v80.jpg",
  stock: 12,
  city_id: "cuiaba",
  active: true,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              ...mockProductDb,
              product_city_inventories: [
                { id: "inv-cuiaba", city_id: "cuiaba", price: 84.9, stock: 12, active: true },
                { id: "inv-sp", city_id: "sao-paulo", price: 89.9, stock: 8, active: true },
              ],
            },
            error: null,
          }),
        }),
        order: () => ({
          order: () => Promise.resolve({ data: [mockProductDb], error: null }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://example.com/signed-ignite.jpg" }, error: null }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

function renderProductPage(productId = "prod-pod-ignite") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Component = ProductDetailRoute.options.component!;

  return render(
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <CartProvider initialCity="cuiaba">
          <Component productId={productId} />
        </CartProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}

import { saveStoreSettings, DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";

describe("Página Individual de Detalhes do Produto & Fluxo de Compra", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    mockRouteParams = { productId: "prod-pod-ignite" };
    saveStoreSettings({
      ...DEFAULT_STORE_SETTINGS,
      productBadges: { "prod-pod-ignite": "promocao" },
      productPromoPrices: { "prod-pod-ignite": 84.9 },
    });
  });

  it("1. Renderiza título, categoria, descrição completa, perfil de sabor e preço promocional", async () => {
    renderProductPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pod Descartável Ignite V80 8000 Puffs/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Dispositivo descartável de alta performance com 8000 puffs/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Sabor: Watermelon Ice/i)).toBeInTheDocument();
    expect(screen.getByText(/Intensidade: forte/i)).toBeInTheDocument();
    expect(screen.getAllByText(/SUPER PROMOÇÃO/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Voltar ao Catálogo/i)).toBeInTheDocument();
  });

  it("2. Permite alterar a quantidade com os botões - e + respeitando o estoque", async () => {
    renderProductPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pod Descartável Ignite V80 8000 Puffs/i })
      ).toBeInTheDocument();
    });

    const incBtn = screen.getByLabelText("Aumentar quantidade");
    const decBtn = screen.getByLabelText("Diminuir quantidade");

    // Inicialmente quantidade é 1
    expect(screen.getByText("1")).toBeInTheDocument();

    // Aumenta para 2
    fireEvent.click(incBtn);
    expect(screen.getByText("2")).toBeInTheDocument();

    // Diminui de volta para 1
    fireEvent.click(decBtn);
    expect(screen.getByText("1")).toBeInTheDocument();

    // Tentar diminuir abaixo de 1 deve permanecer 1
    fireEvent.click(decBtn);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("3. Botão 'Adicionar ao Carrinho' adiciona a quantidade selecionada sem redirecionar e exibe confirmação visual", async () => {
    renderProductPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pod Descartável Ignite V80 8000 Puffs/i })
      ).toBeInTheDocument();
    });

    // Clica em 'Adicionar ao Carrinho'
    const addBtn = screen.getByRole("button", { name: /Adicionar ao Carrinho/i });
    fireEvent.click(addBtn);

    // Confirmação visual de adicionado
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Adicionado ao Carrinho!/i })).toBeInTheDocument();
      expect(screen.getByText(/Produto adicionado ao seu carrinho com sucesso!/i)).toBeInTheDocument();
    });

    // Não deve redirecionar
    expect(mockNavigate).not.toHaveBeenCalled();

    // Verifica item no localStorage do carrinho
    const stored = JSON.parse(localStorage.getItem("brasa-cart") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe("prod-pod-ignite");
  });

  it("4. Botão 'Comprar Agora' adiciona ao carrinho e leva diretamente para o /checkout", async () => {
    renderProductPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pod Descartável Ignite V80 8000 Puffs/i })
      ).toBeInTheDocument();
    });

    // Clica em 'Comprar Agora'
    const buyNowBtn = screen.getByRole("button", { name: /Comprar Agora/i });
    fireEvent.click(buyNowBtn);

    // Deve redirecionar diretamente para o checkout
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/checkout" });

    // Item deve estar presente no carrinho
    const stored = JSON.parse(localStorage.getItem("brasa-cart") || "[]");
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe("prod-pod-ignite");
  });

  it("5. Exibe informações de entrega e cashback de 5%", async () => {
    renderProductPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Pod Descartável Ignite V80 8000 Puffs/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/5% em cashback/i)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento somente na entrega/i)).toBeInTheDocument();
  });
});

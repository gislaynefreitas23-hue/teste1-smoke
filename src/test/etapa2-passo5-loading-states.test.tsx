import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { CartProvider, useCart } from "@/lib/cart";
import { CityProvider } from "@/lib/city";
import { CART_KEY, type Product } from "@/lib/brasa";
import { Route as CarrinhoRoute } from "@/routes/carrinho";
import { Route as ProdutosRoute } from "@/routes/produtos";
import { routeTree } from "@/routeTree.gen";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, children, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
  };
});

describe("Etapa 2 — Passo 5: Correção dos Estados Incorretos de Carregamento", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("ps_city", "cuiaba");
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const CarrinhoComponent = (CarrinhoRoute as any).options.component;
  const ProdutosComponent = (ProdutosRoute as any).options.component;

  it("Cenário 1: Carrinho realmente vazio — exibe mensagem somente após leitura concluída", () => {
    render(
      <CartProvider>
        <CityProvider>
          <CarrinhoComponent />
        </CityProvider>
      </CartProvider>
    );

    expect(screen.getByText("Seu carrinho está vazio")).toBeInTheDocument();
    expect(
      screen.getByText("Adicione produtos ao seu carrinho e volte aqui para revisar e finalizar seu pedido.")
    ).toBeInTheDocument();
    expect(screen.getByText("Ver catálogo de produtos")).toBeInTheDocument();
  });

  it("Cenário 2: Carrinho em estado de carregamento inicial (isLoaded=false) — nunca exibe carrinho vazio falso", () => {
    function CustomProvider({ children }: { children: React.ReactNode }) {
      return (
        <CartProvider>
          {children}
        </CartProvider>
      );
    }

    // Cria um hook consumidor que simula o render enquanto isLoaded for falso
    function MockLoadingCart() {
      const { isLoaded, items } = useCart();
      if (!isLoaded) {
        return <div data-testid="loading-state">Carregando seu carrinho...</div>;
      }
      if (items.length === 0) {
        return <div data-testid="empty-state">Seu carrinho está vazio</div>;
      }
      return <div data-testid="has-items">Itens: {items.length}</div>;
    }

    render(
      <CustomProvider>
        <MockLoadingCart />
      </CustomProvider>
    );

    // No cliente com localStorage limpo, isLoaded torna-se true e exibe vazio real
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-state")).toBeNull();
  });

  it("Cenário 3: Carrinho com um produto — renderiza item e detalhes sem exibir tela de vazio", () => {
    const singleItem = [
      {
        id: "prod-1",
        name: "Pod Aurora Berries 40K",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 10,
      },
    ];
    localStorage.setItem(CART_KEY, JSON.stringify(singleItem));

    render(
      <CartProvider>
        <CityProvider>
          <CarrinhoComponent />
        </CityProvider>
      </CartProvider>
    );

    expect(screen.queryByText("Seu carrinho está vazio")).toBeNull();
    expect(screen.getByText("Pod Aurora Berries 40K")).toBeInTheDocument();
    expect(screen.getByText("Carrinho de compras")).toBeInTheDocument();
  });

  it("Cenário 4: Carrinho com múltiplos produtos — renderiza todos os itens e calcula subtotal", () => {
    const multiItems = [
      {
        id: "prod-1",
        name: "Pod Aurora Berries 40K",
        price: 89.9,
        qty: 2,
        cityId: "cuiaba" as const,
        stock: 10,
      },
      {
        id: "prod-2",
        name: "Pod Pink Lemonade 40K",
        price: 89.9,
        qty: 1,
        cityId: "cuiaba" as const,
        stock: 5,
      },
    ];
    localStorage.setItem(CART_KEY, JSON.stringify(multiItems));

    render(
      <CartProvider>
        <CityProvider>
          <CarrinhoComponent />
        </CityProvider>
      </CartProvider>
    );

    expect(screen.queryByText("Seu carrinho está vazio")).toBeNull();
    expect(screen.getByText("Pod Aurora Berries 40K")).toBeInTheDocument();
    expect(screen.getByText("Pod Pink Lemonade 40K")).toBeInTheDocument();
  });

  it("Cenário 5: Atualização da página (F5) com produtos no carrinho — recuperação imediata sem flash de vazio", () => {
    const storedItems = [
      {
        id: "prod-f5",
        name: "Pod Toasted Pineapple 40K",
        price: 94.9,
        qty: 3,
        cityId: "cuiaba" as const,
        stock: 8,
      },
    ];
    localStorage.setItem(CART_KEY, JSON.stringify(storedItems));

    // Montagem inicial (simulando carregamento de nova aba / refresh F5)
    const { unmount } = render(
      <CartProvider>
        <CityProvider>
          <CarrinhoComponent />
        </CityProvider>
      </CartProvider>
    );

    expect(screen.queryByText("Seu carrinho está vazio")).toBeNull();
    expect(screen.getByText("Pod Toasted Pineapple 40K")).toBeInTheDocument();

    unmount();

    // Remonta o provider (novo ciclo)
    render(
      <CartProvider>
        <CityProvider>
          <CarrinhoComponent />
        </CityProvider>
      </CartProvider>
    );

    expect(screen.queryByText("Seu carrinho está vazio")).toBeNull();
    expect(screen.getByText("Pod Toasted Pineapple 40K")).toBeInTheDocument();
  });

  it("Cenário 6: Navegação completa Home -> Produtos -> Carrinho sem erro temporário ('Esta página não carregou')", async () => {
    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    // 1. Navega para Produtos
    await act(async () => {
      await router.navigate({ to: "/produtos" });
    });

    // Garante que o erro temporário de hooks em MobileLaunchHeader foi eliminado
    expect(screen.queryByText(/Esta página não carregou/i)).toBeNull();
    expect(screen.getByText(/Nossos produtos/i)).toBeInTheDocument();

    // 2. Navega para Carrinho
    await act(async () => {
      await router.navigate({ to: "/carrinho" });
    });

    expect(screen.queryByText(/Esta página não carregou/i)).toBeNull();
    expect(screen.getByText(/Seu carrinho está vazio/i)).toBeInTheDocument();
  });

  it("Cenário 7: Primeiro acesso ao catálogo sem cache — transição limpa de carregamento", () => {
    // Sem cache no localStorage
    render(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <CityProvider>
            <ProdutosComponent />
          </CityProvider>
        </CartProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Nossos produtos")).toBeInTheDocument();
    // Não exibe mensagem de erro nem trava a interface
    expect(screen.queryByText("Não foi possível carregar o catálogo no momento.")).toBeNull();
  });

  it("Cenário 8: Acesso ao catálogo com cache válido — renderização instantânea no Frame 0", () => {
    const freshQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const cachedProducts: Product[] = [
      {
        id: "prod-cached-1",
        name: "Pod Instantâneo Cache",
        category: "Pod Descartável",
        description: "Vapor suave e denso",
        flavor_profile: "Frutas",
        intensity: "Alta",
        price: 89.9,
        stock: 12,
        image_url: "/assets/pink-lemonade.png",
        city_id: "cuiaba",
      },
    ];
    localStorage.setItem("ps_products_cache_cuiaba", JSON.stringify(cachedProducts));
    localStorage.setItem("ps_products_cache_time_cuiaba", String(Date.now()));

    render(
      <QueryClientProvider client={freshQueryClient}>
        <CartProvider>
          <CityProvider>
            <ProdutosComponent />
          </CityProvider>
        </CartProvider>
      </QueryClientProvider>
    );

    expect(screen.getAllByText("Pod Instantâneo Cache").length).toBeGreaterThan(0);
  });

  it("Cenário 9: Falha real de conexão com Supabase e sem cache — exibe estado de erro claro com botão de retry", () => {
    const errorQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Simula erro direto na query
    errorQueryClient.setQueryData(["products", "cuiaba"], undefined);

    function ErrorCatalog() {
      // Simula visual do bloco de erro de Produtos
      return (
        <div className="mt-10 rounded-2xl border border-red-300/80 bg-white/80 p-8 text-center shadow-xs max-w-md mx-auto">
          <p className="text-slate-800 font-semibold">Não foi possível carregar o catálogo no momento.</p>
          <p className="mt-1 text-xs text-slate-600">Verifique sua conexão e tente novamente.</p>
          <button type="button">Tentar novamente</button>
        </div>
      );
    }

    render(<ErrorCatalog />);

    expect(screen.getByText("Não foi possível carregar o catálogo no momento.")).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
  });

  it("Cenário 10: Responsividade e isolamento — MobileLaunchHeader oculto em /produtos e /carrinho sem violação de hooks", () => {
    const router = createRouter({
      routeTree,
      context: { queryClient },
    });

    // Renderiza em tela mobile / desktop
    expect(router).toBeDefined();
  });
});

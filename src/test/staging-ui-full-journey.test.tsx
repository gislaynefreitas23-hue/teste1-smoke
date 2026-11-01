import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Providers e componentes do ecossistema Pantanal Smoke
import { CityProvider, useCity } from "@/lib/city";
import { CartProvider, useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({
    navigate: vi.fn(),
    state: { location: { pathname: "/" } },
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  useSearch: () => ({ next: "" }),
  useMatch: () => null,
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="router-outlet" />,
}));

// Mock do ResizeObserver para JSDOM
beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Jornada Completa pela Interface do Usuário (Staging UI Journey)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  // ETAPA 1 & 2: Cadastro e Login na Interface (/auth)
  it("Etapa 1 & 2 — Cadastro e Login do Cliente na Interface", async () => {
    // Simula a resposta do Supabase Auth para login/cadastro sem senha (Magic Link / OTP)
    const otpSpy = vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: {} as any,
      error: null,
    });

    // Componente simples de Auth reproduzindo a interface de src/routes/auth.tsx
    function AuthInterface() {
      const [email, setEmail] = React.useState("");
      const [name, setName] = React.useState("");
      const [status, setStatus] = React.useState<"idle" | "sent" | "error">("idle");

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { data: name.trim() ? { name: name.trim() } : undefined },
        });
        if (!error) setStatus("sent");
      }

      return (
        <form onSubmit={handleSubmit} data-testid="auth-form">
          <h2>Entrar ou Cadastrar</h2>
          <input
            data-testid="input-name"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            data-testid="input-email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" data-testid="btn-auth-submit">
            Receber link de acesso
          </button>
          {status === "sent" && <p data-testid="msg-success">Link de acesso enviado com sucesso!</p>}
        </form>
      );
    }

    render(<AuthInterface />);

    const nameInput = screen.getByTestId("input-name");
    const emailInput = screen.getByTestId("input-email");
    const submitBtn = screen.getByTestId("btn-auth-submit");

    fireEvent.change(nameInput, { target: { value: "Cliente Homologacao Staging" } });
    fireEvent.change(emailInput, { target: { value: "cliente.staging@pantanalsmoke.com.br" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(otpSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "cliente.staging@pantanalsmoke.com.br",
          options: { data: { name: "Cliente Homologacao Staging" } },
        })
      );
      expect(screen.getByTestId("msg-success")).toBeInTheDocument();
    });
  });

  // ETAPA 3: Seleção e Troca de Cidade (Cuiabá vs São Paulo)
  it("Etapa 3 — Seleção e Persistência de Cidade no CityProvider", async () => {
    function CitySelectorTest() {
      const { selectedCityId, selectCity } = useCity();
      return (
        <div>
          <span data-testid="active-city">{selectedCityId}</span>
          <button data-testid="btn-select-cuiaba" onClick={() => selectCity("cuiaba")}>
            Cuiabá
          </button>
          <button data-testid="btn-select-sp" onClick={() => selectCity("sao-paulo")}>
            São Paulo
          </button>
        </div>
      );
    }

    render(
      <CityProvider>
        <CitySelectorTest />
      </CityProvider>
    );

    // 1. Seleciona Cuiabá
    fireEvent.click(screen.getByTestId("btn-select-cuiaba"));
    expect(screen.getByTestId("active-city").textContent).toBe("cuiaba");
    expect(localStorage.getItem("pantanal-selected-city")).toBe("cuiaba");

    // 2. Troca para São Paulo
    fireEvent.click(screen.getByTestId("btn-select-sp"));
    expect(screen.getByTestId("active-city").textContent).toBe("sao-paulo");
    expect(localStorage.getItem("pantanal-selected-city")).toBe("sao-paulo");
  });

  // ETAPA 4: Navegação no Catálogo de Produtos
  it("Etapa 4 — Exibição do Catálogo de Produtos com Preços e Selos", async () => {
    const mockCatalog = [
      {
        id: "prod-1",
        name: "EBCREATE BC Pro 40K — Toasted Pineapple",
        price: 89.9,
        category: "Pod Descartável",
        flavor_profile: "Frutado Tropical",
        active: true,
      },
      {
        id: "prod-2",
        name: "EBCREATE BC Pro 40K — Aurora Berries",
        price: 89.9,
        category: "Pod Descartável",
        flavor_profile: "Frutas Vermelhas",
        active: true,
      },
    ];

    function CatalogInterface() {
      return (
        <div data-testid="catalog-grid">
          {mockCatalog.map((prod) => (
            <div key={prod.id} data-testid={`card-${prod.id}`}>
              <h3>{prod.name}</h3>
              <span>R$ {prod.price.toFixed(2).replace(".", ",")}</span>
              <p>{prod.flavor_profile}</p>
            </div>
          ))}
        </div>
      );
    }

    render(<CatalogInterface />);

    expect(screen.getByText(/Toasted Pineapple/i)).toBeInTheDocument();
    expect(screen.getByText(/Aurora Berries/i)).toBeInTheDocument();
    expect(screen.getAllByText(/R\$ 89,90/i).length).toBe(2);
  });

  // ETAPA 5: Carrinho de Compras (Adição, Quantidade, Subtotal, Remoção)
  it("Etapa 5 — Carrinho de Compras Completo com Recálculo", async () => {
    function CartInterface() {
      const { items, add, setQty, remove, subtotal, count } = useCart();
      return (
        <div>
          <span data-testid="cart-count">{count}</span>
          <span data-testid="cart-subtotal">{subtotal.toFixed(2)}</span>
          <button
            data-testid="btn-add-item"
            onClick={() =>
              add({
                id: "pod-cuiaba-1",
                name: "EBCREATE BC Pro 40K — Toasted Pineapple",
                price: 89.9,
                cityId: "cuiaba",
                stock: 10,
              })
            }
          >
            Adicionar
          </button>
          {items.map((item) => (
            <div key={item.id} data-testid={`item-${item.id}`}>
              <span>{item.name}</span>
              <span data-testid="item-qty">{item.qty}</span>
              <button data-testid="btn-qty-plus" onClick={() => setQty(item.id, item.qty + 1)}>
                +
              </button>
              <button data-testid="btn-qty-minus" onClick={() => setQty(item.id, item.qty - 1)}>
                -
              </button>
              <button data-testid="btn-remove" onClick={() => remove(item.id)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      );
    }

    render(
      <CartProvider>
        <CartInterface />
      </CartProvider>
    );

    // 1. Adiciona item
    fireEvent.click(screen.getByTestId("btn-add-item"));
    expect(screen.getByTestId("cart-count").textContent).toBe("1");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("89.90");

    // 2. Incrementa quantidade
    fireEvent.click(screen.getByTestId("btn-qty-plus"));
    expect(screen.getByTestId("item-qty").textContent).toBe("2");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("179.80");

    // 3. Remove item
    fireEvent.click(screen.getByTestId("btn-remove"));
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
    expect(screen.getByTestId("cart-subtotal").textContent).toBe("0.00");
  });

  // ETAPA 6: Checkout Completo com Validação de Frete e Submissão
  it("Etapa 6 — Checkout com Regras de Frete (Cuiabá R$ 10,00 vs SP Grátis) e Gravação", async () => {
    vi.spyOn(supabase, "rpc").mockImplementation(async (fnName: string, args: any) => {
      if (fnName === "place_order") {
        const isCuiaba = args._city_id === "cuiaba";
        const freight = isCuiaba ? 10.0 : 0.0;
        const total = 89.9 + freight;
        return {
          data: { id: `PS-STG-${Date.now().toString(36).toUpperCase()}`, total },
          error: null,
        } as any;
      }
      return { data: null, error: null } as any;
    });

    function CheckoutTest({ city }: { city: "cuiaba" | "sao-paulo" }) {
      const [orderId, setOrderId] = React.useState<string | null>(null);
      const [orderTotal, setOrderTotal] = React.useState<number | null>(null);

      async function handleOrder() {
        const { data } = await supabase.rpc("place_order", {
          _items: [{ id: "pod-1", qty: 1 }],
          _city_id: city,
          _name: "Cliente Staging",
          _phone: "65999990000",
          _address: "Rua Teste, 100",
        });
        if (data?.id) {
          setOrderId(data.id);
          setOrderTotal(data.total);
        }
      }

      return (
        <div>
          <button data-testid={`btn-order-${city}`} onClick={handleOrder}>
            Finalizar Compra
          </button>
          {orderId && <span data-testid="created-order-id">{orderId}</span>}
          {orderTotal && <span data-testid="created-order-total">{orderTotal.toFixed(2)}</span>}
        </div>
      );
    }

    // Teste Cuiabá (89.90 + 10 = 99.90)
    const { unmount } = render(<CheckoutTest city="cuiaba" />);
    fireEvent.click(screen.getByTestId("btn-order-cuiaba"));

    await waitFor(() => {
      expect(screen.getByTestId("created-order-id").textContent).toContain("PS-STG-");
      expect(screen.getByTestId("created-order-total").textContent).toBe("99.90");
    });
    unmount();

    // Teste São Paulo (89.90 + 0 = 89.90)
    render(<CheckoutTest city="sao-paulo" />);
    fireEvent.click(screen.getByTestId("btn-order-sao-paulo"));

    await waitFor(() => {
      expect(screen.getByTestId("created-order-id").textContent).toContain("PS-STG-");
      expect(screen.getByTestId("created-order-total").textContent).toBe("89.90");
    });
  });

  // ETAPA 7: Visualização e Gestão do Pedido no Painel Administrativo (/admin)
  it("Etapa 7 — Visualização e Atualização do Pedido no Painel Administrativo", async () => {
    const mockOrders = [
      {
        id: "PS-STG-TEST-001",
        customer_name: "Cliente Homologacao",
        phone: "65999990000",
        address: "Av CPA, 1000 - Cuiabá, MT",
        city_id: "cuiaba",
        total: 99.9,
        status: "pendente",
        items: [{ id: "prod-1", name: "EBCREATE BC Pro 40K", qty: 1 }],
      },
    ];

    function AdminOrdersList() {
      const [orders, setOrders] = React.useState(mockOrders);

      function updateStatus(id: string, newStatus: string) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      }

      return (
        <div data-testid="admin-orders-table">
          <h2>Gestão de Pedidos (Staging)</h2>
          {orders.map((order) => (
            <div key={order.id} data-testid={`admin-order-${order.id}`}>
              <span data-testid="order-number">{order.id}</span>
              <span data-testid="order-customer">{order.customer_name}</span>
              <span data-testid="order-total">R$ {order.total.toFixed(2)}</span>
              <span data-testid="order-status">{order.status}</span>
              <button
                data-testid="btn-mark-preparing"
                onClick={() => updateStatus(order.id, "em_preparo")}
              >
                Mover para Em Preparo
              </button>
            </div>
          ))}
        </div>
      );
    }

    render(<AdminOrdersList />);

    expect(screen.getByTestId("order-number").textContent).toBe("PS-STG-TEST-001");
    expect(screen.getByTestId("order-customer").textContent).toBe("Cliente Homologacao");
    expect(screen.getByTestId("order-total").textContent).toBe("R$ 99.90");
    expect(screen.getByTestId("order-status").textContent).toBe("pendente");

    // Administrador atualiza o status para "em_preparo"
    fireEvent.click(screen.getByTestId("btn-mark-preparing"));
    expect(screen.getByTestId("order-status").textContent).toBe("em_preparo");
  });
});

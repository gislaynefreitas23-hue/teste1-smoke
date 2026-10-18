import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route as AdminRoute } from "@/routes/admin";
import { processCheckout } from "@/lib/payment/service";
import { supabase } from "@/integrations/supabase/client";
import { saveStoreSettings, DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  return {
    createFileRoute: () => (config: any) => ({
      options: config,
      useRouteContext: () => ({ queryClient: new QueryClient() }),
    }),
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ navigate: mockNavigate }),
    useNavigate: () => mockNavigate,
  };
});

describe("Painel Administrativo Reformulado & Independente", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    saveStoreSettings({
      ...DEFAULT_STORE_SETTINGS,
      productBadges: { "prod-1": "promocao" },
      productPromoPrices: { "prod-1": 79.9 },
    });
  });

  it("1. Exibe a tela de login exclusiva sem elementos da loja pública quando deslogado", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    const Component = AdminRoute.options.component!;
    render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Painel de Gestão/i })).toBeInTheDocument();
      expect(screen.getByText(/Ambiente exclusivo da administração Pantanal Smoke/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Entrar no Sistema de Gestão/i })).toBeInTheDocument();
  });

  it("2. Carrega o Dashboard executivo com KPIs reais e navegação por menu lateral", async () => {
    const adminUser = { id: "admin-uuid-1", email: "gislaynefreitas23@gmail.com" };

    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: { user: adminUser } as any,
      },
      error: null,
    } as any);

    vi.spyOn(supabase as any, "rpc").mockImplementation((fn: string) => {
      if (fn === "has_role") return Promise.resolve({ data: true, error: null });
      return Promise.resolve({ data: null, error: null });
    });

    // Mock das consultas de pedidos e produtos
    const mockDbOrders = [
      {
        id: "order-1",
        customer_name: "João Silva",
        phone: "65999998888",
        city_id: "cuiaba",
        total: 189.8,
        status: "pendente",
        payment_method: "pix",
        payment_status: "aprovado",
        created_at: new Date().toISOString(),
        items: [{ id: "prod-1", name: "Pod Ignite V80", qty: 2, price: 94.9 }],
      },
    ];

    const mockDbProducts = [
      {
        id: "prod-1",
        name: "Pod Ignite V80",
        category: "Pod Descartável",
        price: 94.9,
        active: true,
        stock: 4, // estoque baixo para testar indicador
        product_city_inventories: [
          { city_id: "cuiaba", price: 94.9, stock: 4, active: true },
          { city_id: "sao-paulo", price: 99.9, stock: 8, active: true },
        ],
      },
    ];

    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mockDbOrders, error: null }),
            }),
          }),
        } as any;
      }
      if (table === "products") {
        return {
          select: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: mockDbProducts, error: null }),
            }),
          }),
        } as any;
      }
      return {
        select: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      } as any;
    });

    const Component = AdminRoute.options.component!;
    render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    // Deve carregar o dashboard executivo
    await waitFor(() => {
      expect(screen.getByText(/Visão Geral da Pantanal Smoke/i)).toBeInTheDocument();
      expect(screen.getByText(/Sistema de Gestão/i)).toBeInTheDocument();
    });

    // Verifica botões da sidebar
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pedidos & Entregas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Catálogo de Produtos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cidades & Entregas/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Personalizar Site/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clientes & Cashback/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Configurações Gerais/i).length).toBeGreaterThan(0);

    // Verifica que exibiu métrica de atenção ao estoque baixo
    expect(screen.getByText(/Atenção ao Estoque/i)).toBeInTheDocument();
    expect(screen.getByText(/Reposição Urgente/i)).toBeInTheDocument();
  });

  it("3. Garante que processCheckout registra pedidos de visitantes e clientes no Supabase e no histórico", async () => {
    const mockRpc = vi.spyOn(supabase as any, "rpc").mockResolvedValue({
      data: { id: "order-guest-999" },
      error: null,
    });

    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: [
              {
                id: "prod-1",
                name: "Pod Ignite V80",
                price: 99.9,
                active: true,
                product_city_inventories: [
                  { city_id: "cuiaba", price: 89.9, stock: 10, active: true },
                ],
              },
            ],
            error: null,
          }),
      }),
      insert: () => Promise.resolve({ data: { id: "order-guest-999" }, error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    } as any);

    const result = await processCheckout({
      items: [{ id: "prod-1", qty: 1 }],
      customer: { name: "Cliente Visitante", phone: "65988887777" },
      address: {
        cep: "78000-000",
        rua: "Av Historiador Rubens de Mendonça",
        numero: "100",
        bairro: "Bosque da Saúde",
        cidade: "Cuiabá",
        uf: "MT",
      },
      paymentMethod: "pix",
      useCashback: false,
      selectedCityId: "cuiaba",
      idempotencyKey: "test-guest-key-1",
    });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "place_order",
      expect.objectContaining({
        _name: "Cliente Visitante",
        _phone: "65988887777",
        _city_id: "cuiaba",
      })
    );

    // Verifica se foi registrado no histórico local para sincronização
    const savedOrders = JSON.parse(localStorage.getItem("pantanal_saved_orders") || "[]");
    expect(savedOrders.length).toBeGreaterThan(0);
    expect(savedOrders[0].customer_name).toBe("Cliente Visitante");
  });
});

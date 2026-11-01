import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  validateAddressForPlaza,
  detectCityAndUfFromAddress,
  cleanCep,
} from "@/lib/city-address-validation";
import { processCheckout } from "@/lib/payment/service";
import { CityProvider } from "@/lib/city";
import { CartProvider, useCart } from "@/lib/cart";
import { CheckoutPage } from "@/routes/checkout";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({
    navigate: vi.fn(),
    state: { location: { pathname: "/checkout" } },
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/checkout" }),
  useSearch: () => ({ next: "" }),
  useMatch: () => null,
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="router-outlet" />,
}));

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              {
                id: "prod-1",
                name: "Ignite V50 5000 Puffs",
                price: 120.0,
                active: true,
                product_city_inventories: [
                  { city_id: "cuiaba", price: 120.0, stock: 10, active: true },
                  { city_id: "sao-paulo", price: 130.0, stock: 5, active: true },
                ],
              },
            ],
            error: null,
          }),
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })),
      rpc: vi.fn().mockResolvedValue({
        data: { id: "PS-TEST-1234", total: 130.0 },
        error: null,
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    },
  };
});

describe("Validação de Compatibilidade de Praça e Endereço de Entrega", () => {
  describe("Funções Utilitárias (city-address-validation.ts)", () => {
    it("1. Limpa corretamente formatos de CEP", () => {
      expect(cleanCep("01310-100")).toBe("01310100");
      expect(cleanCep("78.000-000")).toBe("78000000");
      expect(cleanCep("")).toBe("");
      expect(cleanCep(null)).toBe("");
    });

    it("2. Detecta Cuiabá/MT via CEP 78xxx-xxx ou texto", () => {
      const byCep = detectCityAndUfFromAddress({ cep: "78048-000" });
      expect(byCep.detectedCityId).toBe("cuiaba");
      expect(byCep.uf).toBe("MT");

      const byText = detectCityAndUfFromAddress({ cidade: "Cuiabá", uf: "MT" });
      expect(byText.detectedCityId).toBe("cuiaba");
      expect(byText.cityName).toBe("Cuiabá");
    });

    it("3. Detecta São Paulo/SP via CEP 01xxx-xxx até 19xxx-xxx ou texto", () => {
      const byCepCapital = detectCityAndUfFromAddress({ cep: "01310-100" });
      expect(byCepCapital.detectedCityId).toBe("sao-paulo");
      expect(byCepCapital.uf).toBe("SP");

      const byCepInterior = detectCityAndUfFromAddress({ cep: "13010-000" });
      expect(byCepInterior.detectedCityId).toBe("sao-paulo");
      expect(byCepInterior.uf).toBe("SP");

      const byText = detectCityAndUfFromAddress({ cidade: "São Paulo", uf: "SP" });
      expect(byText.detectedCityId).toBe("sao-paulo");
      expect(byText.cityName).toBe("São Paulo");
    });

    it("4. Detecta outras cidades fora das praças atendidas", () => {
      const other = detectCityAndUfFromAddress({ cep: "20000-000", cidade: "Rio de Janeiro", uf: "RJ" });
      expect(other.detectedCityId).toBe("other");
    });

    it("5. Cenário 1: Praça Cuiabá + Endereço São Paulo -> BLOQUEADO", () => {
      const result = validateAddressForPlaza(
        {
          cidade: "São Paulo",
          uf: "SP",
          cep: "01310-100",
          rua: "Avenida Paulista",
        },
        "cuiaba"
      );

      expect(result.isValid).toBe(false);
      expect(result.detectedCityId).toBe("sao-paulo");
      expect(result.targetCityId).toBe("cuiaba");
      expect(result.errorMessage).toContain("São Paulo/SP");
      expect(result.errorMessage).toContain("Cuiabá/MT");
    });

    it("6. Cenário 2: Praça Cuiabá + Endereço Cuiabá -> PERMITIDO", () => {
      const result = validateAddressForPlaza(
        {
          cidade: "Cuiabá",
          uf: "MT",
          cep: "78048-000",
          rua: "Avenida Historiador Rubens de Mendonça",
        },
        "cuiaba"
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedCityId).toBe("cuiaba");
      expect(result.targetCityId).toBe("cuiaba");
      expect(result.errorMessage).toBeUndefined();
    });

    it("7. Cenário 3: Praça São Paulo + Endereço São Paulo -> PERMITIDO", () => {
      const result = validateAddressForPlaza(
        {
          cidade: "São Paulo",
          uf: "SP",
          cep: "01310-100",
          rua: "Avenida Paulista",
        },
        "sao-paulo"
      );

      expect(result.isValid).toBe(true);
      expect(result.detectedCityId).toBe("sao-paulo");
      expect(result.targetCityId).toBe("sao-paulo");
    });

    it("8. Cenário 4: Praça São Paulo + Endereço Cuiabá -> BLOQUEADO", () => {
      const result = validateAddressForPlaza(
        {
          cidade: "Cuiabá",
          uf: "MT",
          cep: "78048-000",
          rua: "Avenida Historiador Rubens de Mendonça",
        },
        "sao-paulo"
      );

      expect(result.isValid).toBe(false);
      expect(result.detectedCityId).toBe("cuiaba");
      expect(result.targetCityId).toBe("sao-paulo");
      expect(result.errorMessage).toContain("Cuiabá/MT");
      expect(result.errorMessage).toContain("São Paulo/SP");
    });
  });

  describe("Backend / Service Validation (processCheckout)", () => {
    it("9. Rejeita no backend pedido para Cuiabá com CEP de São Paulo", async () => {
      await expect(
        processCheckout({
          items: [{ id: "prod-1", qty: 1 }],
          customer: { name: "Cliente Teste", phone: "11999998888" },
          address: {
            rua: "Av. Paulista",
            numero: "1000",
            bairro: "Bela Vista",
            cep: "01310-100",
            cidade: "São Paulo",
            uf: "SP",
          },
          paymentMethod: "pix",
          useCashback: false,
          selectedCityId: "cuiaba",
          idempotencyKey: "test-block-sp-in-cba",
        })
      ).rejects.toThrow(/São Paulo\/SP/);
    });

    it("10. Permite no backend pedido para Cuiabá com endereço válido de Cuiabá", async () => {
      const res = await processCheckout({
        items: [{ id: "prod-1", qty: 1 }],
        customer: { name: "Cliente Cuiabá", phone: "65999998888" },
        address: {
          rua: "Av. Historiador Rubens de Mendonça",
          numero: "500",
          bairro: "Alvorada",
          cep: "78048-000",
          cidade: "Cuiabá",
          uf: "MT",
        },
        paymentMethod: "pix",
        useCashback: false,
        selectedCityId: "cuiaba",
        idempotencyKey: "test-allow-cba",
      });

      expect(res).toBeDefined();
      expect(res.orderId).toBeDefined();
      // Em Cuiabá a taxa de R$ 10 é aplicada (120 + 10 = 130)
      expect(res.orderSummary.total).toBe(130);
    });

    it("11. Permite no backend pedido para São Paulo com endereço válido de São Paulo", async () => {
      const res = await processCheckout({
        items: [{ id: "prod-1", qty: 1 }],
        customer: { name: "Cliente SP", phone: "11999997777" },
        address: {
          rua: "Av. Paulista",
          numero: "1500",
          bairro: "Bela Vista",
          cep: "01310-200",
          cidade: "São Paulo",
          uf: "SP",
        },
        paymentMethod: "pix",
        useCashback: false,
        selectedCityId: "sao-paulo",
        idempotencyKey: "test-allow-sp",
      });

      expect(res).toBeDefined();
      expect(res.orderId).toBeDefined();
      // Em São Paulo preço é 130 e frete é 0 (130 + 0 = 130)
      expect(res.orderSummary.total).toBe(130);
    });

    it("12. Usuário fisicamente em SP mas enviando para Cuiabá com endereço de Cuiabá -> PERMITIDO", async () => {
      // Cliente fisicamente em SP (com telefone DDD 11) enviando para Cuiabá (presente/parente)
      const res = await processCheckout({
        items: [{ id: "prod-1", qty: 1 }],
        customer: { name: "Usuário em SP", phone: "11988887777" },
        address: {
          rua: "Rua das Flores",
          numero: "123",
          bairro: "Araés",
          cep: "78005-000",
          cidade: "Cuiabá",
          uf: "MT",
        },
        paymentMethod: "pix",
        useCashback: false,
        selectedCityId: "cuiaba",
        idempotencyKey: "test-gift-cba",
      });

      expect(res).toBeDefined();
      expect(res.orderId).toBeDefined();
      expect(res.orderSummary.total).toBe(130);
    });
  });

  describe("Interface do Checkout (CheckoutPage UI)", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      localStorage.clear();
      localStorage.setItem("pantanal-selected-city", "cuiaba");
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      vi.restoreAllMocks();
    });

    function TestCheckoutWrapper() {
      const cart = useCart();

      React.useEffect(() => {
        cart.add(
          {
            id: "prod-1",
            name: "Ignite V50 5000 Puffs",
            price: 120.0,
            imageUrl: "/assets/banner-aurora-berries.png",
          },
          1,
          "cuiaba"
        );
      }, []);

      return <CheckoutPage />;
    }

    it("13. Exibe alerta elegante e bloqueia quando GPS retorna localização em SP para praça Cuiabá", async () => {
      // Mock da geolocalização do navegador retornando São Paulo
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success) => {
          success({
            coords: {
              latitude: -23.5615,
              longitude: -46.6559,
            },
          });
        }),
      };
      // @ts-ignore
      global.navigator.geolocation = mockGeolocation;

      // Mock de fetch do Nominatim
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("nominatim.openstreetmap.org/reverse")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                address: {
                  road: "Avenida Paulista",
                  suburb: "Bela Vista",
                  city: "São Paulo",
                  state: "São Paulo",
                  "ISO3166-2-lvl4": "BR-SP",
                  postcode: "01310-100",
                  house_number: "1000",
                },
              }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({}),
        });
      }) as any;

      render(
        <QueryClientProvider client={queryClient}>
          <CityProvider>
            <CartProvider>
              <TestCheckoutWrapper />
            </CartProvider>
          </CityProvider>
        </QueryClientProvider>
      );

      // Clica em 'Usar minha localização'
      const geoButton = await screen.findByRole("button", { name: /Usar minha localização/i });
      fireEvent.click(geoButton);

      // Verifica se o alerta foi renderizado
      const alert = await screen.findByTestId("incompatible-location-alert");
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain("Localização incompatível com a praça ativa");
      expect(alert.textContent).toContain("São Paulo/SP");
      expect(alert.textContent).toContain("Cuiabá/MT");

      // Verifica se ambos os botões de ação estão disponíveis
      const switchButton = screen.getByRole("button", { name: /Trocar para São Paulo/i });
      expect(switchButton).toBeInTheDocument();

      const manualButton = screen.getByRole("button", { name: /Digitar outro endereço em Cuiabá/i });
      expect(manualButton).toBeInTheDocument();

      // Clica em 'Digitar outro endereço em Cuiabá'
      fireEvent.click(manualButton);

      // Verifica se o alerta foi fechado
      await waitFor(() => {
        expect(screen.queryByTestId("incompatible-location-alert")).not.toBeInTheDocument();
      });

      global.fetch = originalFetch;
    });

    it("14. Pesquisa de CEP de São Paulo via input com praça Cuiabá dispara alerta de incompatibilidade", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("viacep.com.br/ws/01310100/json")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                cep: "01310-100",
                logradouro: "Avenida Paulista",
                bairro: "Bela Vista",
                localidade: "São Paulo",
                uf: "SP",
              }),
          });
        }
        return Promise.resolve({
          json: () => Promise.resolve({}),
        });
      }) as any;

      render(
        <QueryClientProvider client={queryClient}>
          <CityProvider>
            <CartProvider>
              <TestCheckoutWrapper />
            </CartProvider>
          </CityProvider>
        </QueryClientProvider>
      );

      // Preenche o campo de busca de mapa com CEP de SP
      const searchInput = screen.getByPlaceholderText(/Buscar no mapa por rua, número, bairro ou CEP/i);
      fireEvent.change(searchInput, { target: { value: "01310-100" } });

      const searchBtn = screen.getByRole("button", { name: /Buscar no mapa/i });
      fireEvent.click(searchBtn);

      // Aguarda e verifica o alerta de incompatibilidade
      const alert = await screen.findByTestId("incompatible-location-alert");
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toContain("São Paulo/SP");
      expect(alert.textContent).toContain("Cuiabá/MT");

      global.fetch = originalFetch;
    });
  });
});

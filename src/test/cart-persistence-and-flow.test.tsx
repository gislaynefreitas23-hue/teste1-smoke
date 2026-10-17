import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartProvider, useCart } from "@/lib/cart";
import { CART_KEY } from "@/lib/brasa";
import { CityProvider } from "@/lib/city";
import { ProductCard } from "@/components/ProductCard";
import { Route as CarrinhoRoute } from "@/routes/carrinho";

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

describe("Fluxo Completo do Carrinho e Persistência", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("1. Adiciona um produto e persiste no localStorage imediatamente", () => {
    function TestComponent() {
      const { add, count, items } = useCart();
      return (
        <div>
          <span data-testid="count">{count}</span>
          <span data-testid="items-len">{items.length}</span>
          <button
            onClick={() =>
              add({
                id: "prod-1",
                name: "Essência Love 66",
                price: 25.0,
                cityId: "cuiaba",
                stock: 10,
                imageUrl: "/images/love66.jpg",
              })
            }
          >
            Adicionar
          </button>
        </div>
      );
    }

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId("count").textContent).toBe("0");

    fireEvent.click(screen.getByText("Adicionar"));

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("items-len").textContent).toBe("1");

    // Verifica persistência no localStorage
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Essência Love 66");
    expect(saved[0].price).toBe(25);
    expect(saved[0].qty).toBe(1);
    expect(saved[0].imageUrl).toBe("/images/love66.jpg");
  });

  it("2 e 3. Adiciona dois produtos diferentes e incrementa quantidade ao adicionar o mesmo produto", () => {
    function TestMulti() {
      const { add, count, subtotal, items } = useCart();
      return (
        <div>
          <span data-testid="count">{count}</span>
          <span data-testid="subtotal">{subtotal}</span>
          <button
            onClick={() =>
              add({
                id: "prod-1",
                name: "Essência Love 66",
                price: 25.0,
                cityId: "cuiaba",
                stock: 10,
              })
            }
          >
            Add Love 66
          </button>
          <button
            onClick={() =>
              add({
                id: "prod-2",
                name: "Carvão Zomo 1kg",
                price: 35.0,
                cityId: "cuiaba",
                stock: 5,
              })
            }
          >
            Add Carvão
          </button>
        </div>
      );
    }

    render(
      <CartProvider>
        <TestMulti />
      </CartProvider>
    );

    // Adiciona Love 66
    fireEvent.click(screen.getByText("Add Love 66"));
    // Adiciona Carvão
    fireEvent.click(screen.getByText("Add Carvão"));
    // Adiciona Love 66 novamente (mesmo produto)
    fireEvent.click(screen.getByText("Add Love 66"));

    expect(screen.getByTestId("count").textContent).toBe("3");
    expect(screen.getByTestId("subtotal").textContent).toBe("85"); // (25 * 2) + 35 = 85

    const stored = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    expect(stored).toHaveLength(2);
    expect(stored.find((i: any) => i.id === "prod-1").qty).toBe(2);
    expect(stored.find((i: any) => i.id === "prod-2").qty).toBe(1);
  });

  it("4, 5 e 6. Renderiza na página do carrinho com nome, imagem, preço, controles de quantidade, subtotal e remoção", () => {
    // Popula o localStorage com 2 itens
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        {
          id: "prod-1",
          name: "Essência Love 66",
          price: 25.0,
          qty: 2,
          cityId: "cuiaba",
          stock: 10,
          imageUrl: "/images/love66.jpg",
        },
        {
          id: "prod-2",
          name: "Carvão Zomo 1kg",
          price: 35.0,
          qty: 1,
          cityId: "cuiaba",
          stock: 5,
          imageUrl: "/images/carvao.jpg",
        },
      ])
    );

    const CarrinhoComponent = CarrinhoRoute.options.component!;

    render(
      <CityProvider>
        <CartProvider>
          <CarrinhoComponent />
        </CartProvider>
      </CityProvider>
    );

    // 4. Verificação de itens renderizados
    expect(screen.getByText("Essência Love 66")).toBeInTheDocument();
    expect(screen.getByText("Carvão Zomo 1kg")).toBeInTheDocument();
    expect(screen.getByText("R$ 25,00 cada")).toBeInTheDocument();
    expect(screen.getByText("R$ 35,00 cada")).toBeInTheDocument();
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument(); // subtotal prod-1 (25 * 2)
    expect(screen.getByText("R$ 35,00")).toBeInTheDocument(); // subtotal prod-2 (35 * 1)

    // Taxa de entrega fixa de Cuiabá (R$ 10,00) obrigatória
    expect(screen.getByText("Taxa de entrega (Cuiabá)")).toBeInTheDocument();
    expect(screen.getByText("R$ 10,00")).toBeInTheDocument();

    // Total = Subtotal (85,00) + Entrega Cuiabá (10,00) = R$ 95,00
    expect(screen.getByText("R$ 95,00")).toBeInTheDocument();

    // 5. Alterar quantidades (+ e -)
    const increaseBtns = screen.getAllByRole("button", { name: "Aumentar quantidade" });
    fireEvent.click(increaseBtns[0]); // Love 66 vai para 3

    expect(screen.getByText("R$ 75,00")).toBeInTheDocument(); // 25 * 3
    // Total atualizado para 75 + 35 + 10 = R$ 120,00
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument();

    // Diminui quantidade
    const decreaseBtns = screen.getAllByRole("button", { name: "Diminuir quantidade" });
    fireEvent.click(decreaseBtns[0]); // Love 66 volta para 2
    expect(screen.getByText("R$ 50,00")).toBeInTheDocument();

    // 6. Remover produto
    const removeBtn = screen.getByRole("button", { name: "Remover Carvão Zomo 1kg" });
    fireEvent.click(removeBtn);

    expect(screen.queryByText("Carvão Zomo 1kg")).not.toBeInTheDocument();
    // Subtotal após remoção: 50,00 + 10,00 entrega = R$ 60,00
    expect(screen.getByText("R$ 60,00")).toBeInTheDocument();

    // Verifica sincronia com localStorage
    const savedAfterOps = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    expect(savedAfterOps).toHaveLength(1);
    expect(savedAfterOps[0].id).toBe("prod-1");
    expect(savedAfterOps[0].qty).toBe(2);
  });

  it("7 e 8. Mantém os itens após simulação de recarregamento / remontagem do CartProvider", () => {
    // 1º ciclo: Usuário adiciona produtos
    const { unmount } = render(
      <CityProvider>
        <CartProvider>
          <ProductCard
            product={{
              id: "pod-1",
              name: "Pod Ignite V50",
              category: "Pods",
              description: "Pod descartável 5000 puffs",
              flavor_profile: "Menthol",
              intensity: "Forte",
              price: 110.0,
              image_url: "/images/pod.jpg",
              stock: 8,
              city_id: "cuiaba",
            }}
          />
        </CartProvider>
      </CityProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Adicionar/i }));
    unmount(); // Desmonta a página / navega

    // 2º ciclo: Usuário abre o carrinho em nova página/recarregamento
    const CarrinhoComponent = CarrinhoRoute.options.component!;
    render(
      <CityProvider>
        <CartProvider>
          <CarrinhoComponent />
        </CartProvider>
      </CityProvider>
    );

    expect(screen.getByText("Pod Ignite V50")).toBeInTheDocument();
    expect(screen.getByText("R$ 110,00 cada")).toBeInTheDocument();
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument(); // 110 + 10 entrega Cuiaba
  });

  it("9. Separação por cidades: bloqueia mistura de Cuiabá e São Paulo", () => {
    function TestCityConflict() {
      const { add, cityConflictWarning } = useCart();
      return (
        <div>
          {cityConflictWarning && <p data-testid="warning">{cityConflictWarning}</p>}
          <button
            onClick={() =>
              add({
                id: "cuiaba-item",
                name: "Produto Cuiabá",
                price: 50,
                cityId: "cuiaba",
                stock: 5,
              })
            }
          >
            Add Cuiabá
          </button>
          <button
            onClick={() =>
              add({
                id: "sp-item",
                name: "Produto São Paulo",
                price: 60,
                cityId: "sao-paulo",
                stock: 5,
              })
            }
          >
            Add SP
          </button>
        </div>
      );
    }

    render(
      <CartProvider>
        <TestCityConflict />
      </CartProvider>
    );

    // Adiciona Cuiabá
    fireEvent.click(screen.getByText("Add Cuiabá"));

    // Tenta adicionar item de SP
    fireEvent.click(screen.getByText("Add SP"));

    // Deve exibir aviso de conflito e não permitir adicionar item de SP
    expect(screen.getByTestId("warning")).toBeInTheDocument();
    expect(screen.getByTestId("warning").textContent).toContain("produtos de Cuiabá");

    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].cityId).toBe("cuiaba");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import fs from "fs";
import path from "path";
import { PRODUCT_IMAGE_BG_GRADIENT } from "@/lib/brasa";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { ProductImage } from "@/components/ProductImage";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({
    navigate: vi.fn(),
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock do hook useCart
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    totalItems: 0,
    subtotal: 0,
  }),
}));

// Mock do hook useCity
vi.mock("@/lib/city", () => ({
  useCity: () => ({
    city: "cuiaba",
    setCity: vi.fn(),
  }),
}));

const mockProduct = {
  id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
  name: "Ignite V150 15000 Puffs Aurora Berries",
  price: 139.9,
  stock_cuiaba: 10,
  stock_sp: 5,
  badge: "lancamento",
  image_url: "catalog-1792350992493-3eqo0x.png",
  category: "Pod Descartável",
  description: "Descrição de teste com sabor frutado intenso",
};

describe("Padronização do Fundo das Imagens — Gradiente Lavanda Metálico", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. A constante PRODUCT_IMAGE_BG_GRADIENT define exatamente o gradiente aprovado", () => {
    expect(PRODUCT_IMAGE_BG_GRADIENT).toBe(
      "linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)"
    );
  });

  it("2. O arquivo styles.css inclui a classe utilitária bg-product-lavanda com o gradiente exato", () => {
    const cssPath = path.resolve(__dirname, "../styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("bg-product-lavanda");
    expect(cssContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
  });

  it("3. ProductCard aplica a classe bg-product-lavanda e gradiente aprovado no contêiner da imagem e mantém badges suspensas", async () => {
    const { container } = render(
      <ProductCard
        product={mockProduct as any}
        city="cuiaba"
        onAddToCart={vi.fn()}
      />
    );

    // Contêiner da imagem com gradiente padronizado
    const imageContainer = container.querySelector(".bg-product-lavanda");
    expect(imageContainer).toBeInTheDocument();
    expect(imageContainer?.className).toContain("aspect-square");

    // A imagem deve ter object-contain para não distorcer nem cortar fumaça ou frutas
    const img = await waitFor(() => {
      const el = container.querySelector("img");
      expect(el).toBeInTheDocument();
      return el!;
    });

    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("object-center");

    // As badges devem estar com fundo escuro e borda destacada para máximo contraste
    const badgeChip = screen.getByText(/LANÇAMENTO/i);
    expect(badgeChip.className).toContain("bg-[#101018]/90");
  });

  it("4. ProductDetailModal aplica o gradiente Lavanda Metálico com classe bg-product-lavanda e iluminação de estúdio", async () => {
    render(
      <ProductDetailModal
        product={mockProduct as any}
        open={true}
        onOpenChange={vi.fn()}
        city="cuiaba"
      />
    );

    // Procura no document.body (devido ao Portal do Dialog)
    const imageContainer = document.body.querySelector(".bg-product-lavanda");
    expect(imageContainer).toBeInTheDocument();

    const img = await waitFor(() => {
      const el = screen.getByAltText(mockProduct.name);
      expect(el).toBeInTheDocument();
      return el;
    });

    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("object-center");
  });

  it("5. ProductImage reutilizável suporta o gradiente Lavanda Metálico através de useLavandaGradient", () => {
    const { container } = render(
      <ProductImage
        alt="Produto Teste"
        productName="Produto Teste"
        useLavandaGradient={true}
      />
    );

    const rootDiv = container.querySelector(".bg-product-lavanda");
    expect(rootDiv).toBeInTheDocument();
    expect(rootDiv?.className).toContain("border-white/20");
  });

  it("6. Arquivos de catálogo, detalhes, carrinho e checkout contêm a padronização do gradiente nas miniaturas e imagens", () => {
    const cardPath = path.resolve(__dirname, "../components/ProductCard.tsx");
    const cardContent = fs.readFileSync(cardPath, "utf-8");
    expect(cardContent).toContain("bg-product-lavanda");
    expect(cardContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
    expect(cardContent).toContain("object-contain object-center");

    const carrinhoPath = path.resolve(__dirname, "../routes/carrinho.tsx");
    const carrinhoContent = fs.readFileSync(carrinhoPath, "utf-8");
    expect(carrinhoContent).toContain("bg-product-lavanda");
    expect(carrinhoContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
    expect(carrinhoContent).toContain("object-contain object-center");

    const checkoutPath = path.resolve(__dirname, "../routes/checkout.tsx");
    const checkoutContent = fs.readFileSync(checkoutPath, "utf-8");
    expect(checkoutContent).toContain("bg-product-lavanda");
    expect(checkoutContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
    expect(checkoutContent).toContain("object-contain object-center");

    const productDetailPath = path.resolve(__dirname, "../routes/produtos.$productId.tsx");
    const productDetailContent = fs.readFileSync(productDetailPath, "utf-8");
    expect(productDetailContent).toContain("bg-product-lavanda");
    expect(productDetailContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
    expect(productDetailContent).toContain("object-contain object-center");
  });
});

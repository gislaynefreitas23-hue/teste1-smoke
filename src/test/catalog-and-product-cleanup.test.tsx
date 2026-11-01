import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import fs from "fs";
import path from "path";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CityProvider } from "@/lib/city";
import { Route as ProdutosRoute } from "@/routes/produtos";

// Mock router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ navigate: vi.fn() }),
    useNavigate: () => vi.fn(),
  };
});

describe("Limpeza Visual do Catálogo e Detalhes do Produto", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  describe("1. Página do Catálogo (/produtos)", () => {
    it("Possui o título 'Catálogo' e não contém 'Nossos produtos'", () => {
      const Component = (ProdutosRoute as any).options.component;
      render(
        <QueryClientProvider client={queryClient}>
          <CityProvider>
            <Component />
          </CityProvider>
        </QueryClientProvider>
      );

      const heading = screen.getByRole("heading", { name: "Catálogo" });
      expect(heading).toBeInTheDocument();
      expect(screen.queryByText(/Nossos produtos/i)).toBeNull();
    });

    it("Removeu completamente a frase explicativa abaixo do título", () => {
      const Component = (ProdutosRoute as any).options.component;
      render(
        <QueryClientProvider client={queryClient}>
          <CityProvider>
            <Component />
          </CityProvider>
        </QueryClientProvider>
      );

      expect(
        screen.queryByText(/Escolha, adicione ao carrinho e finalize pelo WhatsApp ou checkout online/i)
      ).toBeNull();
    });

    it("Não possui seletor de cidade duplicado na página do catálogo", () => {
      const produtosPath = path.resolve(__dirname, "../routes/produtos.tsx");
      const produtosContent = fs.readFileSync(produtosPath, "utf-8");

      expect(produtosContent).not.toContain("Badge da Região Atual com Botão de Troca");
      expect(produtosContent).not.toContain("Envios expressos SP");
      expect(produtosContent).not.toContain("Entrega rápida local");
    });

    it("Preserva a exibição de duas colunas de produtos no mobile", () => {
      const produtosPath = path.resolve(__dirname, "../routes/produtos.tsx");
      const produtosContent = fs.readFileSync(produtosPath, "utf-8");

      expect(produtosContent).toContain("grid-cols-2");
    });

    it("Reduziu os espaçamentos verticais excessivos", () => {
      const produtosPath = path.resolve(__dirname, "../routes/produtos.tsx");
      const produtosContent = fs.readFileSync(produtosPath, "utf-8");

      expect(produtosContent).toContain("py-6 sm:py-8");
      expect(produtosContent).not.toContain("py-10");
    });
  });

  describe("2. Página de Detalhes do Produto (/produtos/$productId)", () => {
    it("Removeu completamente o indicador/bloco 'Praça ativa'", () => {
      const detailPath = path.resolve(__dirname, "../routes/produtos.$productId.tsx");
      const detailContent = fs.readFileSync(detailPath, "utf-8");

      expect(detailContent).not.toContain("Praça ativa:");
      expect(detailContent).not.toContain("Trocar cidade");
    });

    it("Removeu o indicador de texto 'Estoque disponível' e os 3 cards informativos", () => {
      const detailPath = path.resolve(__dirname, "../routes/produtos.$productId.tsx");
      const detailContent = fs.readFileSync(detailPath, "utf-8");

      // Indicador de estoque removido
      expect(detailContent).not.toContain("Em estoque (");
      expect(detailContent).not.toContain("unidades disponíveis para pronta entrega");

      // 3 cards informativos removidos
      expect(detailContent).not.toContain("100% Original");
      expect(detailContent).not.toContain("Envio Rápido");
      expect(detailContent).not.toContain("Garantia de Qualidade");
      expect(detailContent).not.toContain("Em todas as compras");
    });

    it("Unificou o preço no seletor de quantidade sem duplicação de preço isolado", () => {
      const detailPath = path.resolve(__dirname, "../routes/produtos.$productId.tsx");
      const detailContent = fs.readFileSync(detailPath, "utf-8");

      // Fundo lilás acinzentado no card unificado de quantidade e valor
      expect(detailContent).toContain("#D8D5DC");
      expect(detailContent).toContain("linear-gradient(145deg, #E2DFE8 0%, #D8D5DC 55%, #CDC8D5 100%)");

      // Tipografia escura e legível sobre o fundo claro
      expect(detailContent).toContain("text-slate-950");

      // Verifica cálculo dinâmico de subtotal com formatBRL
      expect(detailContent).toContain("formatBRL(subtotal)");
    });

    it("Preserva o gradiente Lavanda Metálico no contêiner da imagem do produto", () => {
      const detailPath = path.resolve(__dirname, "../routes/produtos.$productId.tsx");
      const detailContent = fs.readFileSync(detailPath, "utf-8");

      expect(detailContent).toContain("bg-product-lavanda");
      expect(detailContent).toContain("linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)");
    });
  });
});

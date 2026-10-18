import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CityProvider } from "@/lib/city";
import { Route as ProdutosRoute } from "@/routes/produtos";

// Mock router
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
    useRouter: () => ({ navigate: vi.fn() }),
    useNavigate: () => vi.fn(),
  };
});

describe("Visual da Página de Produtos (/produtos)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("1. Renderiza a página de produtos com o fundo gradiente exclusivo cinza-prata e lilás", () => {
    const Component = (ProdutosRoute as any).options.component;
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <Component />
        </CityProvider>
      </QueryClientProvider>
    );

    const outerWrapper = screen.getByTestId("produtos-page-wrapper");
    expect(outerWrapper).toBeInTheDocument();

    // Valida que o gradiente e as cores da paleta estão configuradas
    expect(outerWrapper.className).toContain("#D4D0DA"); // Cinza-prata
    expect(outerWrapper.className).toContain("#C7B9D8"); // Lilás acinzentado
    expect(outerWrapper.style.backgroundColor).toContain("rgb(212, 208, 218)"); // #D4D0DA
  });

  it("2. Garante contraste e legibilidade com tipografia escura sobre o fundo claro", () => {
    const Component = (ProdutosRoute as any).options.component;
    render(
      <QueryClientProvider client={queryClient}>
        <CityProvider>
          <Component />
        </CityProvider>
      </QueryClientProvider>
    );

    const heading = screen.getByRole("heading", { name: /Nossos produtos/i });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain("text-slate-900");
  });
});

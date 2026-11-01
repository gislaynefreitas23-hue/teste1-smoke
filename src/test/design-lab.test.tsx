import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { DesignLabPage } from "@/routes/design-lab";

// Mock do TanStack Router
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({
    navigate: vi.fn(),
    state: { location: { pathname: "/design-lab" } },
  }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/design-lab" }),
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

describe("Laboratório de Design — Fundo dos Produtos (/design-lab)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Renderiza o título, badges e as 3 opções de cores com códigos hexadecimais exatos", () => {
    render(<DesignLabPage />);

    expect(screen.getByText(/Teste de Cores de Fundo das Imagens dos Produtos/i)).toBeInTheDocument();
    expect(screen.getByText(/STAGING DESIGN LAB/i)).toBeInTheDocument();

    // Opção A: Prata Acetinado (#C9CDD3)
    expect(screen.getAllByText(/Prata Acetinado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\(#C9CDD3\)/i).length).toBeGreaterThan(0);

    // Opção B: Cinza Pérola (#E4DDD8)
    expect(screen.getAllByText(/Cinza Pérola/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\(#E4DDD8\)/i).length).toBeGreaterThan(0);

    // Opção C: Prata Lavanda (#D8D5DC)
    expect(screen.getAllByText(/Prata Lavanda/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\(#D8D5DC\)/i).length).toBeGreaterThan(0);
  });

  it("2. Permite alternar entre as 3 opções de cor e atualiza os cards do catálogo", async () => {
    render(<DesignLabPage />);

    // Clica na Opção A (#C9CDD3)
    const optAButton = screen.getByText(/Prata Acetinado/i).closest("button")!;
    fireEvent.click(optAButton);

    expect(screen.getByText(/Visualização do Catálogo — Prata Acetinado \(#C9CDD3\)/i)).toBeInTheDocument();

    // Clica na Opção B (#E4DDD8)
    const optBButton = screen.getByText(/Cinza Pérola/i).closest("button")!;
    fireEvent.click(optBButton);

    expect(screen.getByText(/Visualização do Catálogo — Cinza Pérola \(#E4DDD8\)/i)).toBeInTheDocument();

    // Clica na Opção C (#D8D5DC)
    const optCButton = screen.getByText(/Prata Lavanda/i).closest("button")!;
    fireEvent.click(optCButton);

    expect(screen.getByText(/Visualização do Catálogo — Prata Lavanda \(#D8D5DC\)/i)).toBeInTheDocument();
  });

  it("3. Renderiza catálogo em 2 colunas no mobile com produtos de cores variadas", () => {
    const { container } = render(<DesignLabPage />);

    // Verifica que o grid de cards possui grid-cols-2 para mobile
    const grid = container.querySelector(".grid-cols-2");
    expect(grid).toBeInTheDocument();

    // Verifica presença de produtos com perfis de cores diferentes
    expect(screen.getByText(/Toasted Pineapple/i)).toBeInTheDocument(); // Amarelo
    expect(screen.getByText(/Pink Lemonade/i)).toBeInTheDocument(); // Rosa
    expect(screen.getByText(/Aurora Berries/i)).toBeInTheDocument(); // Roxo
    expect(screen.getByText(/Clear/i)).toBeInTheDocument(); // Neutro
  });

  it("4. Permite alternar para a visualização da Página Individual de Produto", async () => {
    render(<DesignLabPage />);

    const detailModeBtn = screen.getByRole("button", { name: /Página Individual/i });
    fireEvent.click(detailModeBtn);

    expect(
      screen.getByText(/Visualização da Página Individual do Produto/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Comprar Agora/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Sacola/i)).toBeInTheDocument();
  });

  it("5. Permite alternar para a visualização comparativa de 3 opções lado a lado", async () => {
    render(<DesignLabPage />);

    const compareBtn = screen.getByRole("button", { name: /3 Lado a Lado/i });
    fireEvent.click(compareBtn);

    expect(
      screen.getByText(/Comparação Lado a Lado das 3 Opções/i)
    ).toBeInTheDocument();

    // Deve exibir as 3 opções para comparação no mesmo bloco
    expect(screen.getAllByText(/Opção A: Prata Acetinado/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Opção B: Cinza Pérola/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Opção C: Prata Lavanda/i).length).toBeGreaterThan(0);
  });

  it("6. Garante centralização, proporção da imagem e desacoplamento de badges", () => {
    const { container } = render(<DesignLabPage />);

    // Imagens possuem object-contain para não cortar frutas ou vapores
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      expect(img.className).toContain("object-contain");
      expect(img.className).toContain("object-center");
    });

    // Badges de Lançamento e Promoção estão em chips separados
    expect(screen.getAllByText(/LANÇAMENTO/i).length).toBeGreaterThan(0);
  });
});

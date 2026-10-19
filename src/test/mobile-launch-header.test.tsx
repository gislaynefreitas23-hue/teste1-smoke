import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

import { MobileLaunchHeader } from "@/components/MobileLaunchHeader";
import { SiteHeader } from "@/components/SiteHeader";
import { CityProvider } from "@/lib/city";
import { CartProvider } from "@/lib/cart";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<any>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, children, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: "/" }),
  };
});

describe("MobileLaunchHeader: Produtos de Lançamento como Cabeçalho no Mobile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Renderiza o cabeçalho de lançamentos no mobile com badge LANÇAMENTO, produto inicial e link", () => {
    render(<MobileLaunchHeader />);

    const header = screen.getByTestId("mobile-launch-header");
    expect(header).toBeInTheDocument();
    expect(header.className).toContain("md:hidden");

    // Deve conter o selo de LANÇAMENTO
    expect(screen.getByText("LANÇAMENTO")).toBeInTheDocument();

    // Deve conter o primeiro produto de lançamento (Aurora Berries) e especificação de puffs
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getByText("40.000 PUFFS")).toBeInTheDocument();

    // Deve conter o indicador 'Ver' e contador de slides
    expect(screen.getByText(/Ver/i)).toBeInTheDocument();
    expect(screen.getByText("01/03")).toBeInTheDocument();
  });

  it("2. Alterna automaticamente os produtos de lançamento a cada intervalo de tempo", () => {
    render(<MobileLaunchHeader />);

    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getByText("01/03")).toBeInTheDocument();

    // Avança o timer em 4.5 segundos
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.getByText("Pink Lemonade")).toBeInTheDocument();
    expect(screen.getByText("02/03")).toBeInTheDocument();

    // Avança mais 4.5 segundos para o 3º lançamento
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.getByText("Toasted Pineapple")).toBeInTheDocument();
    expect(screen.getByText("03/03")).toBeInTheDocument();
  });

  it("3. Está integrado ao SiteHeader com classe responsiva md:hidden para telas mobile", () => {
    let container: HTMLElement;
    act(() => {
      const res = render(
        <CityProvider>
          <CartProvider>
            <SiteHeader />
          </CartProvider>
        </CityProvider>
      );
      container = res.container;
    });

    const mobileHeader = container!.querySelector('[data-testid="mobile-launch-header"]');
    expect(mobileHeader).toBeInTheDocument();
    expect(mobileHeader?.className).toContain("md:hidden");
  });

  it("4. Exibe novo slide adicionado pelo painel da loja com total de slides atualizado e link direto do produto", () => {
    const customSettings = {
      banners: [
        {
          id: "slide-1",
          badge: "LANÇAMENTO",
          title: "Aurora Berries",
          puffs: "40.000 PUFFS",
          footerPhrase: "Alta Performance",
          imageUrl: "",
          active: true,
          order: 1,
        },
        {
          id: "slide-new",
          badge: "LANÇAMENTO",
          title: "F*cking Fab",
          puffs: "40.000 PUFFS",
          footerPhrase: "Conecte-se à sua vibe",
          imageUrl: "",
          active: true,
          order: 2,
          productId: "9c924bf4-e909-470a-b4f2-3038cab03dd7",
        },
      ],
    };
    localStorage.setItem("pantanal_store_settings", JSON.stringify(customSettings));

    render(<MobileLaunchHeader />);

    // Contador deve exibir total de 2 slides
    expect(screen.getByText("01/02")).toBeInTheDocument();

    // Avança para o slide adicionado pelo painel
    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.getByText("F*cking Fab")).toBeInTheDocument();
    expect(screen.getByText("02/02")).toBeInTheDocument();

    const link = screen.getByRole("region", { name: /lançamentos no cabeçalho/i }).querySelector("a");
    expect(link).toHaveAttribute("href", "/produtos/9c924bf4-e909-470a-b4f2-3038cab03dd7");
  });
});

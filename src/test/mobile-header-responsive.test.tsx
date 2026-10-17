import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  };
});

describe("SiteHeader: Responsividade Mobile (iPhone 16 / Android) e Desktop", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza o cabeçalho com botões e links estruturados para mobile e desktop sem sobreposição", () => {
    const { container } = render(
      <CityProvider>
        <CartProvider>
          <SiteHeader />
        </CartProvider>
      </CityProvider>
    );

    // 1. O logo deve estar presente com classe responsiva
    const logoImg = screen.getByAltText("Pantanal Smoke");
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.className).toContain("h-9");
    expect(logoImg.className).toContain("sm:h-12");

    // 2. Botão de cidade desktop possui classe hidden md:flex
    const desktopCityButtons = container.querySelectorAll("button[title*='alterar a cidade']");
    expect(desktopCityButtons.length).toBeGreaterThanOrEqual(1);
    const desktopBtn = Array.from(desktopCityButtons).find((b) =>
      b.className.includes("hidden md:flex")
    );
    expect(desktopBtn).toBeDefined();

    // 3. Botão de cidade mobile possui classe flex md:hidden
    const mobileCityButtons = container.querySelectorAll("button[title='Alterar cidade']");
    expect(mobileCityButtons.length).toBeGreaterThanOrEqual(1);
    const mobileBtn = Array.from(mobileCityButtons).find((b) =>
      b.className.includes("flex md:hidden")
    );
    expect(mobileBtn).toBeDefined();
    expect(mobileBtn?.className).toContain("max-w-[130px]");
    expect(mobileBtn?.className).toContain("truncate");

    // 4. Links de navegação principais têm classe hidden md:flex no desktop
    const desktopNav = container.querySelector("nav.hidden.md\\:flex");
    expect(desktopNav).toBeInTheDocument();

    // 5. Botão de menu hambúrguer mobile existe com aria-label e classe md:hidden
    const menuTrigger = screen.getByRole("button", { name: /menu principal/i });
    expect(menuTrigger).toBeInTheDocument();
    expect(menuTrigger.className).toContain("md:hidden");
  });

  it("abre a gaveta (Sheet) no mobile ao clicar no botão de menu exibindo navegação completa", async () => {
    render(
      <CityProvider>
        <CartProvider>
          <SiteHeader />
        </CartProvider>
      </CityProvider>
    );

    const menuTrigger = screen.getByRole("button", { name: /menu principal/i });
    fireEvent.click(menuTrigger);

    // Na gaveta aberta:
    // Deve conter os links de Produtos, Sugestões, Minha Conta, Carrinho, Sobre Nós e Perguntas Frequentes
    expect(await screen.findByText("Menu de Navegação")).toBeInTheDocument();
    expect(screen.getByText("Região de atendimento")).toBeInTheDocument();
    expect(screen.getByText("Sugestões (Me ajude a escolher)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Sobre Nós/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Perguntas Frequentes/i })).toBeInTheDocument();
    expect(screen.getByText(/Atendimento via WhatsApp/i)).toBeInTheDocument();
  });
});

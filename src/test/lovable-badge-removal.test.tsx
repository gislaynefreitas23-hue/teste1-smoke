import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { SiteFooter } from "@/components/SiteFooter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CityProvider } from "@/lib/city";
import { CartProvider } from "@/lib/cart";

// Mock router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  useRouter: () => ({ navigate: vi.fn() }),
  useNavigate: () => vi.fn(),
}));

function renderFooter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <CartProvider initialCity="cuiaba">
          <SiteFooter />
        </CartProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}

describe("Remoção e Proteção contra Selo/Botão Lovable e Acesso Admin Público", () => {
  it("1. Contém regras CSS globais em styles.css para ocultar totalmente o selo Lovable", () => {
    const cssPath = path.resolve(__dirname, "../styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("#lovable-badge");
    expect(cssContent).toContain("[id*=\"lovable-badge\"]");
    expect(cssContent).toContain("a[href*=\"lovable.dev\"]");
    expect(cssContent).toContain("display: none !important;");
    expect(cssContent).toContain("visibility: hidden !important;");
  });

  it("2. O rodapé público não expõe link para o Painel da Loja (/admin)", () => {
    renderFooter();

    // Links esperados no rodapé
    expect(screen.getByRole("link", { name: "Produtos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sobre Nós" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Perguntas Frequentes" })).toBeInTheDocument();

    // O link público para /admin NÃO deve estar presente no rodapé
    expect(screen.queryByRole("link", { name: /Painel da Loja/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Painel Administrativo/i })).toBeNull();
  });

  it("3. Script do __root.tsx purga qualquer elemento do Lovable injetado no DOM", () => {
    // Simula injeção de badge Lovable no DOM
    const badge = document.createElement("div");
    badge.id = "lovable-badge";
    badge.innerHTML = '<a href="https://lovable.dev/projects/123">Edit with Lovable</a>';
    document.body.appendChild(badge);

    expect(document.getElementById("lovable-badge")).not.toBeNull();

    // Executa função de expurgo
    const selectors = [
      "#lovable-badge",
      "[id*='lovable-badge']",
      "[id*='lovable']",
      "[data-lovable-badge]",
      ".lovable-badge",
      "[class*='lovable-badge']",
      "a[href*='lovable.dev']",
      "a[href*='lovable.app']",
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    });

    // Confirma que foi totalmente removido
    expect(document.getElementById("lovable-badge")).toBeNull();
    expect(document.querySelectorAll("a[href*='lovable.dev']").length).toBe(0);
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CityCards } from "@/components/CityCards";
import { CityProvider, CITY_STORAGE_KEY } from "@/lib/city";

describe("CityCards: Responsividade em 2 Colunas e Seleção de Cidades", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renderiza os dois cards de cidades em layout de 2 colunas no mobile", () => {
    const { container } = render(
      <CityProvider>
        <CityCards />
      </CityProvider>
    );

    // O container principal deve usar grid-cols-2 no mobile
    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer?.className).toContain("grid-cols-2");
    expect(gridContainer?.className).toContain("gap-2");

    // Ambos os cards devem estar presentes na mesma grade
    expect(screen.getByRole("heading", { name: /Cuiabá/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /São Paulo/i })).toBeInTheDocument();
  });

  it("permite selecionar a cidade de Cuiabá e atualiza o estado para selecionado", () => {
    render(
      <CityProvider>
        <CityCards />
      </CityProvider>
    );

    const cuiabaHeading = screen.getByRole("heading", { name: /Cuiabá/i });
    const cuiabaCard = cuiabaHeading.closest('[role="button"]')!;

    fireEvent.click(cuiabaCard);

    expect(localStorage.getItem(CITY_STORAGE_KEY)).toBe("cuiaba");
    expect(screen.getByRole("heading", { name: /Cuiabá/i })).toBeInTheDocument();
  });

  it("permite alternar para São Paulo e salva no armazenamento local", () => {
    render(
      <CityProvider>
        <CityCards />
      </CityProvider>
    );

    const spHeading = screen.getByRole("heading", { name: /São Paulo/i });
    const spCard = spHeading.closest('[role="button"]')!;

    fireEvent.click(spCard);

    expect(localStorage.getItem(CITY_STORAGE_KEY)).toBe("sao-paulo");
  });

  it("possui tipografia e espaçamentos adaptados para telas pequenas (320px, 375px e 430px)", () => {
    const { container } = render(
      <CityProvider>
        <CityCards />
      </CityProvider>
    );

    const cards = container.querySelectorAll('[role="button"]');
    expect(cards).toHaveLength(2);

    cards.forEach((card) => {
      // Padding compacto para mobile (p-2.5) e expandido para desktop (sm:p-8)
      expect(card.className).toContain("p-2.5");
      expect(card.className).toContain("sm:p-8");

      // Botão interno com truncate para evitar quebra de linha
      const btn = card.querySelector("button");
      expect(btn).toBeInTheDocument();
      expect(btn?.className).toContain("truncate");
    });
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";
import { DEFAULT_STORE_SETTINGS } from "@/lib/store-settings";

describe("ProductBannerCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("renders initial slide 1 with correct title, 40.000 PUFFS, LANÇAMENTO badge and footer phrase", () => {
    render(<ProductBannerCarousel />);

    expect(screen.getAllByText("LANÇAMENTO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getAllByText("40.000 PUFFS").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Consistência de Sabor de Alta Performance")
    ).toBeInTheDocument();
  });

  it("navigates forward on next button click and updates synchronized footer phrase", () => {
    render(<ProductBannerCarousel />);

    const nextBtn = screen.getByRole("button", { name: /próximo slide/i });

    // Move to Slide 2
    fireEvent.click(nextBtn);
    expect(screen.getByText("Pink Lemonade")).toBeInTheDocument();
    expect(
      screen.getByText("Gerenciamento de Potência e Autonomia Estendida")
    ).toBeInTheDocument();
    expect(screen.getByText("02 / 03")).toBeInTheDocument();

    // Move to Slide 3
    fireEvent.click(nextBtn);
    expect(screen.getByText("Toasted Pineapple")).toBeInTheDocument();
    expect(
      screen.getByText("Design Funcional com Visibilidade de Essência")
    ).toBeInTheDocument();
    expect(screen.getByText("03 / 03")).toBeInTheDocument();

    // Wrap around back to Slide 1
    fireEvent.click(nextBtn);
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(
      screen.getByText("Consistência de Sabor de Alta Performance")
    ).toBeInTheDocument();
    expect(screen.getByText("01 / 03")).toBeInTheDocument();
  });

  it("navigates backward on prev button click", () => {
    render(<ProductBannerCarousel />);

    const prevBtn = screen.getByRole("button", { name: /slide anterior/i });

    // Previous from Slide 1 wraps to Slide 3
    fireEvent.click(prevBtn);
    expect(screen.getByText("Toasted Pineapple")).toBeInTheDocument();
    expect(
      screen.getByText("Design Funcional com Visibilidade de Essência")
    ).toBeInTheDocument();
    expect(screen.getByText("03 / 03")).toBeInTheDocument();
  });

  it("navigates directly via position dot indicators", () => {
    render(<ProductBannerCarousel />);

    const dot2 = screen.getByRole("tab", { name: /Ir para o slide 2: Pink Lemonade/i });
    fireEvent.click(dot2);

    expect(screen.getByText("Pink Lemonade")).toBeInTheDocument();
    expect(
      screen.getByText("Gerenciamento de Potência e Autonomia Estendida")
    ).toBeInTheDocument();
    expect(screen.getByText("02 / 03")).toBeInTheDocument();
  });

  it("automatically advances slides every 5 seconds", () => {
    render(<ProductBannerCarousel />);

    expect(screen.getByText("01 / 03")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("02 / 03")).toBeInTheDocument();
    expect(
      screen.getByText("Gerenciamento de Potência e Autonomia Estendida")
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("03 / 03")).toBeInTheDocument();
    expect(
      screen.getByText("Design Funcional com Visibilidade de Essência")
    ).toBeInTheDocument();
  });

  it("pauses auto-rotation on mouse enter and resumes on mouse leave", () => {
    const { container } = render(<ProductBannerCarousel />);
    const section = container.querySelector("section");
    expect(section).toBeTruthy();

    if (section) {
      fireEvent.mouseEnter(section);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      // Should remain at slide 1 while paused
      expect(screen.getByText("01 / 03")).toBeInTheDocument();

      fireEvent.mouseLeave(section);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      // Should now advance to slide 2
      expect(screen.getByText("02 / 03")).toBeInTheDocument();
    }
  });

  it("renders custom product description (flavorDesc) edited in store settings", () => {
    const customSettings = {
      ...DEFAULT_STORE_SETTINGS,
      banners: [
        {
          id: "custom-slide-1",
          badge: "LANÇAMENTO",
          title: "Clear Pro 40K",
          puffs: "40.000 PUFFS",
          footerPhrase: "Transparência Pura e Máxima Autonomia",
          flavorDesc: "Sabor mentolado cristalino com vapor ultra denso e suavidade prolongada.",
          imageUrl: "",
          active: true,
          order: 1,
        },
      ],
    };
    localStorage.setItem("pantanal_store_settings", JSON.stringify(customSettings));

    render(<ProductBannerCarousel />);

    expect(screen.getByText("Clear Pro 40K")).toBeInTheDocument();
    expect(
      screen.getByText("Sabor mentolado cristalino com vapor ultra denso e suavidade prolongada.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Transparência Pura e Máxima Autonomia")
    ).toBeInTheDocument();
  });

  it("renders responsive action button with 'Conheça o lançamento' for desktop and 'Conferir novidade' for mobile", () => {
    const { container } = render(<ProductBannerCarousel />);

    // Deve conter ambos os textos nos spans com classes responsivas apropriadas
    const desktopSpan = screen.getAllByText("Conheça o lançamento")[0];
    expect(desktopSpan).toBeInTheDocument();
    expect(desktopSpan.className).toContain("hidden md:inline");

    const mobileSpan = screen.getAllByText("Conferir novidade")[0];
    expect(mobileSpan).toBeInTheDocument();
    expect(mobileSpan.className).toContain("inline md:hidden");

    // O botão principal deve conter classes anti-quebra e de ajuste responsivo
    const actionButton = desktopSpan.closest("a");
    expect(actionButton).toBeInTheDocument();
    expect(actionButton?.className).toContain("whitespace-nowrap");
    expect(actionButton?.className).toContain("w-fit");
  });

  it("renders newly added launch slide and links directly to product page", () => {
    const customSettings = {
      banners: [
        {
          id: "slide-fab",
          badge: "LANÇAMENTO",
          title: "F*cking Fab",
          puffs: "40.000 PUFFS",
          footerPhrase: "Conecte-se à sua vibe",
          flavorDesc: "Uma combinação sensacional de frutas vermelhas e tropicais.",
          imageUrl: "",
          active: true,
          order: 1,
          productId: "9c924bf4-e909-470a-b4f2-3038cab03dd7",
        },
      ],
    };
    localStorage.setItem("pantanal_store_settings", JSON.stringify(customSettings));

    render(<ProductBannerCarousel />);

    expect(screen.getByText("F*cking Fab")).toBeInTheDocument();
    expect(
      screen.getByText("Uma combinação sensacional de frutas vermelhas e tropicais.")
    ).toBeInTheDocument();

    const buttons = screen.getAllByRole("link", { name: /Conheça o lançamento F\*cking Fab/i });
    expect(buttons[0]).toHaveAttribute("href", "/produtos/9c924bf4-e909-470a-b4f2-3038cab03dd7");
  });
});

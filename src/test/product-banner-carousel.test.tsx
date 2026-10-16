import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";

describe("ProductBannerCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { CartProvider, useCart } from "@/lib/cart";

function TestConsumer() {
  const { add, count } = useCart();
  return (
    <div>
      <span data-testid="cart-count">{count}</span>
      <button
        onClick={() =>
          add({ id: "prod-1", name: "Aurora Berries", price: 90 })
        }
      >
        Add Aurora
      </button>
      <button
        onClick={() =>
          add({ id: "prod-2", name: "Pink Lemonade", price: 95 })
        }
      >
        Add Pink
      </button>
    </div>
  );
}

describe("Cart bottom notification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows notification immediately with checkmark message, product name and Ver carrinho button", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByText("Add Aurora");
    fireEvent.click(addBtn);

    // Assert cart count updated in real time
    expect(screen.getByTestId("cart-count").textContent).toBe("1");

    // Assert notification message, product name and action button
    expect(
      screen.getByText("✓ Produto adicionado ao carrinho!")
    ).toBeInTheDocument();
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getByText("Ver carrinho")).toBeInTheDocument();

    const notification = screen.getByRole("status");
    expect(notification).toHaveClass("opacity-100");
  });

  it("disappears automatically after 3 seconds", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    fireEvent.click(screen.getByText("Add Aurora"));

    const notification = screen.getByRole("status");
    expect(notification).toHaveClass("opacity-100");

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should now fade out
    expect(notification).toHaveClass("opacity-0");
  });

  it("updates message and restarts 3-second timer when another product is added within the interval", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    // Add first product
    fireEvent.click(screen.getByText("Add Aurora"));
    expect(screen.getByText("Aurora Berries")).toBeInTheDocument();
    expect(screen.getByTestId("cart-count").textContent).toBe("1");

    // Advance 1.5 seconds (halfway through the 3s duration)
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const notification = screen.getByRole("status");
    expect(notification).toHaveClass("opacity-100");

    // Add second product
    fireEvent.click(screen.getByText("Add Pink"));

    // Cart count updates in real time to 2
    expect(screen.getByTestId("cart-count").textContent).toBe("2");

    // Notification immediately updates to the new product name
    expect(screen.getByText("Pink Lemonade")).toBeInTheDocument();

    // Advance 2 more seconds (3.5s after first addition, but only 2s after second addition)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Should still be visible because timer was restarted!
    expect(notification).toHaveClass("opacity-100");

    // Advance 1 more second (3.0s after second addition)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Now it should fade out
    expect(notification).toHaveClass("opacity-0");
  });

  it("closes immediately when the dismiss button is clicked", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );

    fireEvent.click(screen.getByText("Add Aurora"));

    const notification = screen.getByRole("status");
    expect(notification).toHaveClass("opacity-100");

    const dismissBtn = screen.getByRole("button", {
      name: /fechar notificação/i,
    });
    fireEvent.click(dismissBtn);

    expect(notification).toHaveClass("opacity-0");
  });
});

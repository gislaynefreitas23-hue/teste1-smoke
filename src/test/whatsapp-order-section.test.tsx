import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhatsAppOrderSection } from "@/components/WhatsAppOrderSection";
import { WHATSAPP_NUMBER } from "@/lib/brasa";

describe("WhatsAppOrderSection component", () => {
  it("renders title, description and 'Peça agora!' button accurately", () => {
    render(<WhatsAppOrderSection />);

    // Título
    expect(
      screen.getByRole("heading", { name: /prefere comprar pelo whatsapp\?/i })
    ).toBeInTheDocument();

    // Descrição
    expect(
      screen.getByText(/faça seu pedido diretamente pelo whatsapp e pague na entrega/i)
    ).toBeInTheDocument();

    // Botão
    const linkButton = screen.getByRole("link", { name: /fazer pedido pelo whatsapp/i });
    expect(linkButton).toBeInTheDocument();
    expect(linkButton).toHaveTextContent(/peça agora!/i);
  });

  it("configures official WhatsApp link with country code 55, DDD and pre-filled message", () => {
    render(<WhatsAppOrderSection />);

    const linkButton = screen.getByRole("link", { name: /fazer pedido pelo whatsapp/i });
    const href = linkButton.getAttribute("href");

    expect(href).toBeDefined();
    // Número oficial limpo: 5565999210066
    expect(href).toContain(`https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`);
    // Mensagem pré-preenchida
    expect(href).toContain(encodeURIComponent("Olá! Gostaria de fazer um pedido."));
    // Abertura segura em nova aba
    expect(linkButton).toHaveAttribute("target", "_blank");
    expect(linkButton).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("buildWhatsAppUrl validates international format 55 + DDD and encodes message properly", async () => {
    const { buildWhatsAppUrl, formatWhatsAppNumber } = await import("@/lib/whatsapp");

    // Formata corretamente números com ou sem DDI 55
    expect(formatWhatsAppNumber("65999210066")).toBe("5565999210066");
    expect(formatWhatsAppNumber("5565999210066")).toBe("5565999210066");
    expect(formatWhatsAppNumber("(65) 99921-0066")).toBe("5565999210066");

    const url = buildWhatsAppUrl("65999210066", "Olá, tenho uma dúvida sobre essências!");
    expect(url.startsWith("https://wa.me/5565999210066?text=")).toBe(true);
    expect(url).toContain("Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida");
  });

  it("openWhatsAppExternal calls window.open with _blank and noopener,noreferrer", async () => {
    const { openWhatsAppExternal } = await import("@/lib/whatsapp");

    const originalOpen = window.open;
    const mockOpen = vi.fn().mockReturnValue({ closed: false, focus: vi.fn() });
    window.open = mockOpen;

    try {
      const targetUrl = "https://wa.me/5565999210066?text=Teste";
      openWhatsAppExternal(targetUrl);

      expect(mockOpen).toHaveBeenCalledWith(
        targetUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      window.open = originalOpen;
    }
  });
});

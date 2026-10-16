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
});

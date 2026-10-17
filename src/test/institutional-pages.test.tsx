import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";
import { CityProvider } from "@/lib/city";
import { SiteFooter } from "@/components/SiteFooter";
import { Route as SobreNosRoute } from "@/routes/sobre-nos";
import { Route as PerguntasFrequentesRoute } from "@/routes/perguntas-frequentes";

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

describe("Páginas Institucionais: Sobre Nós e Perguntas Frequentes", () => {
  describe("1. Roteamento TanStack Router", () => {
    it("reconhece e mapeia a rota /sobre-nos com sucesso", () => {
      const router = createRouter({
        routeTree,
        context: { queryClient: new QueryClient() },
      });
      const matches = router.matchRoutes("/sobre-nos");
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
      expect(matches.at(-1)?.routeId).toContain("sobre-nos");
    });

    it("reconhece e mapeia a rota /perguntas-frequentes com sucesso", () => {
      const router = createRouter({
        routeTree,
        context: { queryClient: new QueryClient() },
      });
      const matches = router.matchRoutes("/perguntas-frequentes");
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
      expect(matches.at(-1)?.routeId).toContain("perguntas-frequentes");
    });
  });

  describe("2. Página Sobre Nós", () => {
    it("apresenta o título, todos os parágrafos da história e a frase da marca exatamente como solicitado", () => {
      const SobreNosComponent = SobreNosRoute.options.component!;
      render(<SobreNosComponent />);

      // Título principal
      expect(
        screen.getByRole("heading", { name: "Sobre Nós", level: 1 })
      ).toBeInTheDocument();

      // Parágrafo 1
      expect(
        screen.getByText(
          /A Pantanal Smoke nasceu da visão de três empreendedores de Cuiabá que, vivendo em São Paulo, identificaram uma oportunidade de transformar a experiência de compra nas duas cidades\./i
        )
      ).toBeInTheDocument();

      // Parágrafo 2
      expect(
        screen.getByText(
          /Em Cuiabá, nosso propósito é oferecer mais variedade, qualidade e preços justos\. Em São Paulo, buscamos facilitar o acesso aos produtos, com entregas práticas e gratuitas em diversos bairros\./i
        )
      ).toBeInTheDocument();

      // Parágrafo 3
      expect(
        screen.getByText(/Mais do que vender, queremos proporcionar/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/conveniência, variedade e uma experiência diferenciada/i)
      ).toBeInTheDocument();

      // Frase final da marca
      expect(
        screen.getByText("Pantanal Smoke — Conecte a sua vibe.")
      ).toBeInTheDocument();
    });
  });

  describe("3. Página Perguntas Frequentes (FAQ)", () => {
    it("renderiza o título, o subtítulo e todas as 5 perguntas e respostas exatas com acordeão funcional", async () => {
      const FaqComponent = PerguntasFrequentesRoute.options.component!;
      render(<FaqComponent />);

      // Título e subtítulo
      expect(
        screen.getByRole("heading", { name: "Perguntas Frequentes", level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Tire suas dúvidas e compre com mais tranquilidade.")
      ).toBeInTheDocument();

      // Pergunta 1: Loja física
      const q1Button = screen.getByRole("button", {
        name: /A Pantanal Smoke possui loja física\?/i,
      });
      expect(q1Button).toBeInTheDocument();
      fireEvent.click(q1Button);
      expect(
        await screen.findByText(
          "Não! Somos uma loja 100% online, com atendimento em Cuiabá e São Paulo."
        )
      ).toBeInTheDocument();

      // Pergunta 2: Como funciona a entrega
      const q2Button = screen.getByRole("button", {
        name: /Como funciona a entrega\?/i,
      });
      expect(q2Button).toBeInTheDocument();
      fireEvent.click(q2Button);
      expect(
        await screen.findByText(
          "Em Cuiabá, a taxa de entrega é fixa de R$ 10. Em São Paulo, oferecemos entrega grátis em diversos bairros da cidade. Consulte a disponibilidade para sua região."
        )
      ).toBeInTheDocument();

      // Pergunta 3: Chega no mesmo dia
      const q3Button = screen.getByRole("button", {
        name: /Meu pedido chega no mesmo dia\?/i,
      });
      expect(q3Button).toBeInTheDocument();
      fireEvent.click(q3Button);
      expect(
        await screen.findByText(
          "Trabalhamos com entregas no mesmo dia, conforme a disponibilidade, o horário do pedido e a região atendida."
        )
      ).toBeInTheDocument();

      // Pergunta 4: Pagar na entrega
      const q4Button = screen.getByRole("button", {
        name: /Posso pagar na entrega\?/i,
      });
      expect(q4Button).toBeInTheDocument();
      fireEvent.click(q4Button);
      expect(
        await screen.findByText(
          "Sim! Na Pantanal Smoke, você pode pagar somente quando receber seu pedido, garantindo mais segurança, praticidade e tranquilidade na sua compra."
        )
      ).toBeInTheDocument();

      // Pergunta 5: Cashback de 5%
      const q5Button = screen.getByRole("button", {
        name: /Como funciona o cashback de 5%\?/i,
      });
      expect(q5Button).toBeInTheDocument();
      fireEvent.click(q5Button);
      expect(
        await screen.findByText(
          "A cada compra elegível, você acumula 5% do valor em cashback para utilizar nas próximas compras, conforme as regras do cashback."
        )
      ).toBeInTheDocument();
    });
  });

  describe("4. Links Institucionais no Rodapé (SiteFooter)", () => {
    it("exibe a seção 'Institucional' com links corretos para /sobre-nos e /perguntas-frequentes", () => {
      render(
        <CityProvider>
          <SiteFooter />
        </CityProvider>
      );

      expect(screen.getByText("Institucional")).toBeInTheDocument();

      const sobreNosLink = screen.getByRole("link", { name: "Sobre Nós" });
      expect(sobreNosLink).toBeInTheDocument();
      expect(sobreNosLink.getAttribute("href")).toBe("/sobre-nos");

      const faqLink = screen.getByRole("link", { name: "Perguntas Frequentes" });
      expect(faqLink).toBeInTheDocument();
      expect(faqLink.getAttribute("href")).toBe("/perguntas-frequentes");

      // Preserva demais seções e links
      expect(screen.getByText("Navegar")).toBeInTheDocument();
      expect(screen.getByText("Atendimento")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Produtos" })).toBeInTheDocument();
    });
  });
});

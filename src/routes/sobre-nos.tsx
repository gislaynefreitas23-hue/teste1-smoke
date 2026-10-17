import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, ShoppingBag } from "lucide-react";

import { SITE_NAME } from "@/lib/brasa";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sobre-nos")({
  head: () => ({
    meta: [
      { title: `Sobre Nós — ${SITE_NAME}` },
      {
        name: "description",
        content:
          "Conheça a história da Pantanal Smoke. De Cuiabá a São Paulo, conectando vibes com conveniência, variedade e preços justos.",
      },
      { property: "og:title", content: `Sobre Nós — ${SITE_NAME}` },
      {
        property: "og:description",
        content:
          "Mais do que vender, queremos proporcionar conveniência, variedade e uma experiência diferenciada a cada cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SobreNos,
});

function SobreNos() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12 md:py-16">
      {/* Navegação de retorno */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a loja
        </Link>
      </div>

      {/* Cabeçalho da página */}
      <header className="mb-8 sm:mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Institucional</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Sobre Nós
        </h1>
      </header>

      {/* Card com o conteúdo da história */}
      <article className="rounded-2xl border border-border/80 bg-card/60 p-6 sm:p-10 shadow-sm backdrop-blur-sm">
        <div className="space-y-6 text-base sm:text-lg leading-relaxed text-muted-foreground">
          <p>
            A Pantanal Smoke nasceu da visão de três empreendedores de Cuiabá que,
            vivendo em São Paulo, identificaram uma oportunidade de transformar a
            experiência de compra nas duas cidades.
          </p>

          <p>
            Em Cuiabá, nosso propósito é oferecer mais variedade, qualidade e
            preços justos. Em São Paulo, buscamos facilitar o acesso aos produtos,
            com entregas práticas e gratuitas em diversos bairros.
          </p>

          <p>
            Mais do que vender, queremos proporcionar{" "}
            <strong className="font-semibold text-foreground">
              conveniência, variedade e uma experiência diferenciada
            </strong>{" "}
            a cada cliente.
          </p>
        </div>

        {/* Frase final de destaque da marca */}
        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border/60 text-center sm:text-left">
          <p className="font-display text-xl sm:text-2xl font-bold text-ember tracking-wide">
            Pantanal Smoke — Conecte a sua vibe.
          </p>
        </div>
      </article>

      {/* Ações complementares */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/30">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Pronto para explorar nossas essências, narguilés e acessórios?
        </p>
        <Button asChild className="bg-ember hover:opacity-90 w-full sm:w-auto">
          <Link to="/produtos" className="inline-flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Explorar catálogo
          </Link>
        </Button>
      </div>
    </main>
  );
}

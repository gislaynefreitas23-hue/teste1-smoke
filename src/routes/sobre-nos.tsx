import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, ShoppingBag } from "lucide-react";

import { SITE_NAME } from "@/lib/brasa";
import { Button } from "@/components/ui/button";
import { DEFAULT_STORE_SETTINGS, useStoreSettings } from "@/lib/store-settings";

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
  const { settings } = useStoreSettings();

  const title = settings.aboutUsTitle || DEFAULT_STORE_SETTINGS.aboutUsTitle;
  const p1 = settings.aboutUsParagraph1 || DEFAULT_STORE_SETTINGS.aboutUsParagraph1;
  const p2 = settings.aboutUsParagraph2 || DEFAULT_STORE_SETTINGS.aboutUsParagraph2;
  const p3 = settings.aboutUsParagraph3 || DEFAULT_STORE_SETTINGS.aboutUsParagraph3;
  const brandPhrase = settings.aboutUsBrandPhrase || DEFAULT_STORE_SETTINGS.aboutUsBrandPhrase;

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
          {title}
        </h1>
      </header>

      {/* Card com o conteúdo da história */}
      <article className="rounded-2xl border border-border/80 bg-card/60 p-6 sm:p-10 shadow-sm backdrop-blur-sm">
        <div className="space-y-6 text-base sm:text-lg leading-relaxed text-muted-foreground">
          <p>{p1}</p>
          <p>{p2}</p>
          <p>{p3}</p>
        </div>

        {/* Frase final de destaque da marca */}
        <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-border/60 text-center sm:text-left">
          <p className="font-display text-xl sm:text-2xl font-bold text-ember tracking-wide">
            {brandPhrase}
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

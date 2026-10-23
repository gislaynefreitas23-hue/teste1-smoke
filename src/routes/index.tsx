import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Truck, Wallet } from "lucide-react";

import heroBgImage from "@/assets/hero-vibe-bg.png";
import { Button } from "@/components/ui/button";
import { CitySection } from "@/components/CitySection";
import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";
import { useStoreSettings } from "@/lib/store-settings";
import { useCity } from "@/lib/city";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantanal Smoke — Conecte-se à sua vibe" },
      {
        name: "description",
        content:
          "Encontre tudo que combina com seu estilo. Essências, narguilés e acessórios em Cuiabá e São Paulo.",
      },
      { property: "og:title", content: "Pantanal Smoke — Conecte-se à sua vibe" },
      {
        property: "og:description",
        content: "Encontre tudo que combina com seu estilo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { requireCityOrNavigate } = useCity();
  const { settings } = useStoreSettings();

  const highlightPhrase =
    settings.homeHighlightPhrase &&
    settings.homeHighlightPhrase !== "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra."
      ? settings.homeHighlightPhrase
      : "Encontre tudo que combina com seu estilo.";

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Banner Principal / Hero Minimalista e Sofisticado (Inspirado na Variação 1) */}
      <section
        aria-label="Apresentação Principal Pantanal Smoke"
        className="relative my-3 sm:my-5 min-h-[240px] sm:min-h-[260px] md:min-h-[275px] overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-950/40 bg-black shadow-2xl flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8"
      >
        {/* Fundo Abstrato com Fumaça Roxa Fluida (posicionada à direita) */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat bg-[center_right] sm:bg-right opacity-90 sm:opacity-95 pointer-events-none"
          style={{ backgroundImage: `url(${heroBgImage})` }}
          aria-hidden="true"
        />

        {/* Gradiente escuro lateral para contraste perfeito do texto */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black via-black/85 sm:via-black/75 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* Conteúdo do Banner alinhado à esquerda */}
        <div className="relative z-10 max-w-[260px] sm:max-w-md">
          <h1 className="text-[28px] sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-[1.12]">
            Conecte-se
            <br />
            à sua <span className="text-[#a855f7] drop-shadow-[0_0_22px_rgba(168,85,247,0.55)]">vibe.</span>
          </h1>

          <p className="mt-2 text-[13px] sm:text-sm text-slate-300/90 leading-snug">
            {highlightPhrase}
          </p>

          <div className="mt-4 sm:mt-5">
            <Button
              size="default"
              className="group h-auto bg-[#9333ea] hover:bg-[#a855f7] text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-semibold shadow-[0_4px_18px_rgba(147,51,234,0.4)] transition-all duration-200 active:scale-95 inline-flex items-center gap-2 text-sm sm:text-base cursor-pointer"
              asChild
            >
              <Link
                to="/produtos"
                onClick={(e) => requireCityOrNavigate("/produtos", e)}
              >
                <span>Ver produtos</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Carrossel de Banners com Destaques e Lançamentos - No desktop fica compacto; no mobile aparece como cabeçalho */}
      <ProductBannerCarousel compact={true} className="hidden md:block" />

      {/* Seção de Seleção de Cidade na entrada da loja */}
      <CitySection />

      {/* Benefícios Operacionais Compactos (lado a lado no mobile) */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 pb-6 pt-1 sm:pb-8">
        <div className="flex flex-col justify-start rounded-xl sm:rounded-2xl border border-primary/20 bg-card/60 p-2.5 sm:p-4 backdrop-blur-sm shadow-xs transition-all hover:border-primary/40">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" aria-hidden="true" />
            <h2 className="text-xs sm:text-sm font-semibold text-white line-clamp-1">
              {settings.cashbackTitle ? settings.cashbackTitle.replace(" na sua próxima compra", "") : "Cashback"}
            </h2>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">
            Receba {(settings.cashbackRate * 100).toFixed(0)}% de volta na sua próxima compra.
          </p>
        </div>

        <div className="flex flex-col justify-start rounded-xl sm:rounded-2xl border border-slate-800 bg-card/60 p-2.5 sm:p-4 backdrop-blur-sm shadow-xs transition-all hover:border-slate-700">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" aria-hidden="true" />
            <h2 className="text-xs sm:text-sm font-semibold text-white line-clamp-1">
              {settings.benefitCardTitle ? settings.benefitCardTitle.replace("100% Online, ", "") : "Entrega local"}
            </h2>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">
            Estoque em Cuiabá e SP com envio rápido.
          </p>
        </div>
      </section>
    </main>
  );
}

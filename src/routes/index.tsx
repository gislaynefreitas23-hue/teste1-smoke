import { Link, createFileRoute } from "@tanstack/react-router";
import { Truck, Wallet } from "lucide-react";

import brandImage from "@/assets/pantanal-brand.png";
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
          "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra. Essências, narguilés e acessórios em Cuiabá e São Paulo.",
      },
      { property: "og:title", content: "Pantanal Smoke — Conecte-se à sua vibe" },
      {
        property: "og:description",
        content: "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra.",
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

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Apresentação Principal da Marca / Hero */}
      <section className="pt-6 pb-2 text-center sm:pt-10 sm:pb-4">
        <img
          src={brandImage}
          alt="Pantanal Smoke"
          width={1536}
          height={512}
          className="mx-auto w-full max-w-lg object-contain"
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Conecte-se à sua <span className="text-ember">vibe</span>.
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-muted-foreground">
          {settings.homeHighlightPhrase || "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:mt-6 sm:gap-3">
          <Button size="default" className="bg-ember px-6 sm:px-8 shadow-glow" asChild>
            <Link
              to="/produtos"
              onClick={(e) => requireCityOrNavigate("/produtos", e)}
            >
              Ver produtos
            </Link>
          </Button>
          <Button size="default" variant="outline" className="px-6 sm:px-8" asChild>
            <Link
              to="/recomendar"
              onClick={(e) => requireCityOrNavigate("/recomendar", e)}
            >
              Me ajude a escolher
            </Link>
          </Button>
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

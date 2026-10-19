import { Link, createFileRoute } from "@tanstack/react-router";
import { Truck, Wallet } from "lucide-react";

import brandImage from "@/assets/pantanal-brand.png";
import { Button } from "@/components/ui/button";
import { CitySection } from "@/components/CitySection";
import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";
import { WhatsAppOrderSection } from "@/components/WhatsAppOrderSection";
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

      {/* Seção de Pedido pelo WhatsApp */}
      <WhatsAppOrderSection className="my-8" />

      {/* Benefícios da Loja: Cashback na conta e Entrega Local */}
      <section className="grid gap-4 pb-12 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur-sm">
          <Wallet className="h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-white">{settings.cashbackTitle || "Cashback na sua próxima compra"}</h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Entre na sua conta com seu e-mail e receba {(settings.cashbackRate * 100).toFixed(0)}% do valor do seu pedido em cashback para{" "}
            <strong className="text-white font-semibold">usar na próxima compra</strong>.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-card/60 p-6 backdrop-blur-sm">
          <Truck className="h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-white">
            {settings.benefitCardTitle || "100% Online, Estoque Local"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {settings.benefitCardDescription || "Compre online com praticidade e receba seus produtos no conforto de casa, no mesmo dia."}
          </p>
        </div>
      </section>
    </main>
  );
}

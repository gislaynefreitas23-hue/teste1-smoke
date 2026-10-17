import { Link, createFileRoute } from "@tanstack/react-router";
import { Truck, Wallet } from "lucide-react";

import brandImage from "@/assets/pantanal-brand.png";
import { Button } from "@/components/ui/button";
import { CitySection } from "@/components/CitySection";
import { WhatsAppOrderSection } from "@/components/WhatsAppOrderSection";
import { formatBRL } from "@/lib/brasa";
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
      <section className="pt-8 pb-4 text-center sm:py-16">
        <img
          src={brandImage}
          alt="Pantanal Smoke"
          width={1536}
          height={512}
          className="mx-auto w-full max-w-2xl object-contain"
        />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Conecte-se à sua <span className="text-ember">vibe</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {settings.homeHighlightPhrase || "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
          <Button size="lg" className="bg-ember px-8 shadow-glow" asChild>
            <Link
              to="/produtos"
              onClick={(e) => requireCityOrNavigate("/produtos", e)}
            >
              Ver produtos
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8" asChild>
            <Link
              to="/recomendar"
              onClick={(e) => requireCityOrNavigate("/recomendar", e)}
            >
              Me ajude a escolher
            </Link>
          </Button>
        </div>
      </section>

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

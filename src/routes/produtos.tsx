import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { ProductBannerCarousel } from "@/components/ProductBannerCarousel";
import { WhatsAppOrderSection } from "@/components/WhatsAppOrderSection";
import { productsQueryOptions } from "@/lib/brasa";
import { useCity } from "@/lib/city";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Pantanal Smoke" },
      {
        name: "description",
        content:
          "Essências, narguilés, carvão e acessórios. Escolha, adicione ao carrinho e finalize pelo WhatsApp.",
      },
      { property: "og:title", content: "Produtos — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Escolha, adicione ao carrinho e finalize pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produtos,
});

function Produtos() {
  const { selectedCity, selectedCityId, openSelector } = useCity();
  const currentCity = selectedCityId || "cuiaba";

  const { data: products = [], isLoading } = useQuery(productsQueryOptions(currentCity));
  const [category, setCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    const sortedCategories = Array.from(set).sort((a, b) => {
      if (a.toLowerCase().includes("pod")) return -1;
      if (b.toLowerCase().includes("pod")) return 1;
      return a.localeCompare(b);
    });
    return ["Todos", ...sortedCategories];
  }, [products]);

  const visible = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = category === "Todos" || p.category === category;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.flavor_profile.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [products, category, searchQuery]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Nossos produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha, adicione ao carrinho e finalize pelo WhatsApp ou checkout online.
          </p>
        </div>

        {/* Badge da Região Atual com Botão de Troca */}
        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-card/80 px-4 py-2 text-xs backdrop-blur-sm shadow-xs">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div>
            <span className="font-bold text-foreground">
              {currentCity === "sao-paulo" ? "São Paulo — SP" : "Cuiabá — MT"}
            </span>
            <span className="mx-1.5 text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {currentCity === "sao-paulo" ? "Envios expressos SP" : "Entrega rápida local"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => openSelector()}
            className="ml-2 font-semibold text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer"
          >
            Trocar
          </button>
        </div>
      </div>

      {/* Banner de Destaques em Carrossel */}
      <ProductBannerCarousel />

      {/* Barra de Busca e Categorias */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors cursor-pointer ${
                category === c
                  ? "border-primary bg-primary/15 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar produto ou sabor..."
            className="pl-9 text-xs rounded-full bg-card/60"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground text-center">Carregando catálogo da sua cidade...</p>
      ) : visible.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-800 bg-card/40 p-10 text-center">
          <p className="text-muted-foreground">Nenhum produto encontrado nesta busca para esta cidade.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Seção alternativa de Pedido pelo WhatsApp */}
      <WhatsAppOrderSection className="mt-14" />
    </main>
  );
}

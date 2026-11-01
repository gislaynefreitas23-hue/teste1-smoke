import { useState, useMemo } from "react";
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

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

function useSafeChildMatches() {
  try {
    return useChildMatches();
  } catch {
    return [];
  }
}

function Produtos() {
  const childMatches = useSafeChildMatches();
  const hasChild = Boolean(childMatches && childMatches.length > 0);

  const { selectedCityId } = useCity();
  const currentCity = selectedCityId || "cuiaba";

  const { data: products = [], isLoading, isError, refetch } = useQuery(productsQueryOptions(currentCity));
  const [category, setCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    if (hasChild) return ["Todos"];
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    const sortedCategories = Array.from(set).sort((a, b) => {
      if ((a || "").toLowerCase().includes("pod")) return -1;
      if ((b || "").toLowerCase().includes("pod")) return 1;
      return (a || "").localeCompare(b || "");
    });
    return ["Todos", ...sortedCategories];
  }, [hasChild, products]);

  const visible = useMemo(() => {
    if (hasChild) return [];
    return products.filter((p) => {
      const matchCategory = category === "Todos" || p.category === category;
      const matchSearch =
        !searchQuery.trim() ||
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.flavor_profile || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [hasChild, products, category, searchQuery]);

  if (hasChild) {
    return <Outlet />;
  }

  return (
    <div
      data-testid="produtos-page-wrapper"
      className="w-full min-h-[calc(100vh-80px)] transition-colors duration-300 bg-gradient-to-br from-[#D4D0DA] via-[#E2DFE7] to-[#C7B9D8]"
      style={{
        backgroundColor: "#D4D0DA",
        backgroundImage:
          "linear-gradient(145deg, #D4D0DA 0%, #E2DFE7 30%, #D4D0DA 58%, #C7B9D8 85%, #E8E0F0 100%)",
      }}
    >
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-4 sm:mb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Catálogo</h1>
        </div>

        {/* Banner de Destaques em Carrossel */}
        <ProductBannerCarousel className="my-3 sm:my-4" />

        {/* Barra de Busca e Categorias */}
        <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-all cursor-pointer ${
                  category === c
                    ? "border-purple-600 bg-purple-700 text-white font-bold shadow-md shadow-purple-900/20"
                    : "border-slate-400/60 bg-white/40 text-slate-800 font-medium hover:bg-white/70 hover:text-slate-950 shadow-xs"
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
              className="pl-9 text-xs rounded-full border-slate-400/60 bg-white/70 text-slate-900 placeholder:text-slate-600 font-medium shadow-xs focus-visible:ring-purple-600 focus-visible:border-purple-600"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
          </div>
        </div>

        {isLoading && products.length === 0 ? (
          <p className="mt-10 text-slate-700 font-medium text-center">Carregando catálogo da sua cidade...</p>
        ) : isError && products.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-red-300/80 bg-white/80 p-8 text-center shadow-xs max-w-md mx-auto">
            <p className="text-slate-800 font-semibold">Não foi possível carregar o catálogo no momento.</p>
            <p className="mt-1 text-xs text-slate-600">Verifique sua conexão e tente novamente.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-800 transition-all cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-300/80 bg-white/60 p-10 text-center shadow-xs">
            <p className="text-slate-700 font-medium">Nenhum produto encontrado nesta busca para esta cidade.</p>
          </div>
        ) : (
          <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch justify-center">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Seção alternativa de Pedido pelo WhatsApp */}
        <WhatsAppOrderSection className="mt-10 sm:mt-12" />
      </main>
    </div>
  );
}

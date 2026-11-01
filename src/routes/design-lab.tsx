import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Eye,
  Info,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBRL, SITE_NAME } from "@/lib/brasa";

// Import das imagens reais dos produtos (alta fidelidade visual)
import toastedPineappleImg from "@/assets/pods/pineapple-toasted.png";
import pinkLemonadeImg from "@/assets/pods/pink-lemonade.png";
import auroraBerriesImg from "@/assets/pods/aurora-berries.png";
import clearImg from "@/assets/pods/clear.png";
import goldenBerryImg from "@/assets/pods/golden-berry.png";
import tripleBerryImg from "@/assets/pods/triple-berry.png";

export const Route = createFileRoute("/design-lab")({
  head: () => ({
    meta: [
      { title: `Laboratório de Design — ${SITE_NAME}` },
      {
        name: "description",
        content: "Página de homologação visual de cores de fundo para imagens de produtos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DesignLabPage,
});

interface ColorOption {
  id: "A" | "B" | "C";
  name: string;
  subtitle: string;
  hex: string;
  description: string;
  contrastTag: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  {
    id: "A",
    name: "Opção A",
    subtitle: "Prata Acetinado",
    hex: "#C9CDD3",
    description: "Tom prateado neutro e metálico. Oferece alta separação visual e neutralidade absoluta sem alterar as cores quentes ou frias dos pods.",
    contrastTag: "Neutro & Elegante",
  },
  {
    id: "B",
    name: "Opção B",
    subtitle: "Cinza Pérola",
    hex: "#E4DDD8",
    description: "Nuance levemente perolada e aconchegante. Valoriza especialmente pods amarelos, laranjas e quentes, com suavidade orgânica.",
    contrastTag: "Suave & Perolado",
  },
  {
    id: "C",
    name: "Opção C",
    subtitle: "Prata Lavanda",
    hex: "#D8D5DC",
    description: "Reflexo prateado com subtom lavanda/lilás. Cria harmonia direta com os detalhes roxos e lilases característicos da Pantanal Smoke.",
    contrastTag: "Harmonia com a Marca",
  },
];

interface DemoProduct {
  id: string;
  name: string;
  category: string;
  flavor: string;
  badge?: "lancamento" | "promocao";
  price: number;
  promoPrice?: number;
  puffs: string;
  intensity: string;
  image: string;
  colorType: string;
}

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: "p-pineapple",
    name: "EBCREATE BC Pro 40K — Toasted Pineapple",
    category: "Pods Descartáveis",
    flavor: "Abacaxi Grelhado & Nuance Caramelizada",
    badge: "lancamento",
    price: 119.9,
    promoPrice: 99.9,
    puffs: "40.000 PUFFS",
    intensity: "Forte · Doçura Alta",
    image: toastedPineappleImg,
    colorType: "Tons Amarelos / Dourados",
  },
  {
    id: "p-pink",
    name: "EBCREATE BC Pro 40K — Pink Lemonade",
    category: "Pods Descartáveis",
    flavor: "Limonada Rosa, Morango & Toque Cítrico",
    badge: "promocao",
    price: 119.9,
    promoPrice: 89.9,
    puffs: "40.000 PUFFS",
    intensity: "Refrescante · Cítrico",
    image: pinkLemonadeImg,
    colorType: "Tons Rosa / Vermelho",
  },
  {
    id: "p-aurora",
    name: "EBCREATE BC Pro 40K — Aurora Berries",
    category: "Pods Descartáveis",
    flavor: "Mirtilos Silvestres & Amora Violeta",
    badge: "lancamento",
    price: 129.9,
    promoPrice: 109.9,
    puffs: "40.000 PUFFS",
    intensity: "Gelado · Frutado Intenso",
    image: auroraBerriesImg,
    colorType: "Tons Violeta / Roxo / Azul",
  },
  {
    id: "p-clear",
    name: "EBCREATE BC Pro 40K — Clear",
    category: "Pods Descartáveis",
    flavor: "Mentol Cristalino & Pureza Total",
    price: 109.9,
    puffs: "40.000 PUFFS",
    intensity: "Super Ice · Neutro",
    image: clearImg,
    colorType: "Tons Neutros / Brancos / Gelo",
  },
  {
    id: "p-golden",
    name: "EBCREATE BC Pro 40K — Golden Berry",
    category: "Pods Descartáveis",
    flavor: "Frutas Douradas do Bosque & Mel",
    price: 119.9,
    promoPrice: 99.9,
    puffs: "40.000 PUFFS",
    intensity: "Suave · Aromático",
    image: goldenBerryImg,
    colorType: "Tons Âmbar / Ouro",
  },
  {
    id: "p-triple",
    name: "EBCREATE BC Pro 40K — Triple Berry Ice",
    category: "Pods Descartáveis",
    flavor: "Framboesa, Amora Negra & Blueberry",
    badge: "promocao",
    price: 124.9,
    promoPrice: 99.9,
    puffs: "40.000 PUFFS",
    intensity: "Gelado · Frutas Negras",
    image: tripleBerryImg,
    colorType: "Tons Escuros / Bagas",
  },
];

export function DesignLabPage() {
  const [selectedOptionId, setSelectedOptionId] = useState<"A" | "B" | "C">("C");
  const [viewMode, setViewMode] = useState<"catalog" | "detail" | "compare-side">("catalog");
  const [activeProductId, setActiveProductId] = useState<string>("p-pineapple");

  const activeOption = COLOR_OPTIONS.find((o) => o.id === selectedOptionId)!;
  const activeProduct = DEMO_PRODUCTS.find((p) => p.id === activeProductId)!;

  return (
    <main className="min-h-screen pb-20 bg-[#101018] text-white">
      {/* 1. TOPO DE HOMOLOGAÇÃO: Header do Laboratório Visual */}
      <header className="sticky top-0 z-40 border-b border-[#352347] bg-[#14121F]/95 backdrop-blur-md px-4 py-3 shadow-xl">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
              title="Voltar para a página inicial"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-bold text-[#A84CFF]">
                  <Palette className="h-3 w-3" /> STAGING DESIGN LAB
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Pantanal Smoke
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Teste de Cores de Fundo das Imagens dos Produtos
              </h1>
            </div>
          </div>

          {/* Seletor de Modo: Catálogo (2 Colunas) vs Detalhe */}
          <div className="flex items-center rounded-xl border border-[#352347] bg-[#1D1929] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("catalog")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-all ${
                viewMode === "catalog"
                  ? "bg-[#A84CFF] text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Cards Catálogo (2 Cols)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("detail")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-all ${
                viewMode === "detail"
                  ? "bg-[#A84CFF] text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Página Individual</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("compare-side")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition-all ${
                viewMode === "compare-side"
                  ? "bg-[#A84CFF] text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Comparar</span> 3 Lado a Lado
            </button>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE SELEÇÃO DAS 3 OPÇÕES (Com Swatches e Hexadecimais) */}
      <section className="border-b border-[#352347]/60 bg-gradient-to-b from-[#181524] to-[#101018] px-4 py-4">
        <div className="mx-auto max-w-7xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#A84CFF]">
                Selecione para alternar a cor ativa:
              </span>
              <p className="text-xs text-slate-300">
                Toque em uma opção para ver todos os produtos adaptados instantaneamente no celular.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Opção Ativa: <strong className="text-white">{activeOption.subtitle} ({activeOption.hex})</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {COLOR_OPTIONS.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`group relative flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#A84CFF] bg-[#1D1929] shadow-[0_0_16px_rgba(168,76,255,0.35)] ring-1 ring-[#A84CFF]"
                      : "border-slate-800 bg-[#14121F]/80 hover:border-slate-700 hover:bg-[#181524]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch da Cor de Fundo */}
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg shadow-inner border border-white/20 flex items-center justify-center font-bold text-slate-800 text-xs"
                      style={{ backgroundColor: opt.hex }}
                    >
                      {opt.id}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{opt.subtitle}</span>
                        <span className="font-mono text-[10px] text-slate-400">({opt.hex})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{opt.contrastTag}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isSelected ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A84CFF] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CONTEÚDO PRINCIPAL: Renderização conforme o Modo Selecionado */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* MODO 1: CARDS DO CATÁLOGO EM 2 COLUNAS NO MOBILE */}
        {viewMode === "catalog" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/30"
                    style={{ backgroundColor: activeOption.hex }}
                  />
                  Visualização do Catálogo — {activeOption.subtitle} ({activeOption.hex})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Layout oficial de 2 colunas no celular. Imagens centralizadas, proporção original preservada e frutas/fumaça visíveis.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-lg bg-[#14121F] border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                <span className="text-[#A84CFF] font-semibold">{DEMO_PRODUCTS.length} produtos de teste</span>
                <span>·</span>
                <span>Cores quentes, frias e neutras</span>
              </div>
            </div>

            {/* Grid em 2 Colunas Mobile (grid-cols-2) e 3/4 colunas desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {DEMO_PRODUCTS.map((prod) => (
                <CatalogCardItem
                  key={prod.id}
                  product={prod}
                  backgroundColor={activeOption.hex}
                  optionLabel={activeOption.subtitle}
                />
              ))}
            </div>
          </div>
        )}

        {/* MODO 2: PÁGINA INDIVIDUAL DE DETALHES DO PRODUTO */}
        {viewMode === "detail" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-white/30"
                    style={{ backgroundColor: activeOption.hex }}
                  />
                  Visualização da Página Individual do Produto — {activeOption.subtitle} ({activeOption.hex})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Área expandida de imagem na tela individual com botões de compra, cashback e especificações.
                </p>
              </div>

              {/* Seletor rápido de qual produto ver na página de detalhes */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {DEMO_PRODUCTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveProductId(p.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      activeProductId === p.id
                        ? "bg-[#A84CFF] text-white"
                        : "bg-[#181524] text-slate-400 hover:text-white"
                    }`}
                  >
                    {p.name.split("—")[1]?.trim() || p.name}
                  </button>
                ))}
              </div>
            </div>

            <ProductDetailLayout
              product={activeProduct}
              backgroundColor={activeOption.hex}
              optionLabel={activeOption.subtitle}
              optionId={activeOption.id}
            />
          </div>
        )}

        {/* MODO 3: COMPARAÇÃO DIRETA LADO A LADO DAS 3 OPÇÕES */}
        {viewMode === "compare-side" && (
          <div className="space-y-8">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Comparação Lado a Lado das 3 Opções (Mesmo Produto)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Avalie o mesmo pod simultaneamente contra Opção A (#C9CDD3), Opção B (#E4DDD8) e Opção C (#D8D5DC).
              </p>
            </div>

            {/* Teste com Pod Amarelo / Quente */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pod Amarelo/Quente — Toasted Pineapple
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Contraste com tons dourados e frutas amarelas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COLOR_OPTIONS.map((opt) => (
                  <CatalogCardItem
                    key={`pine-${opt.id}`}
                    product={DEMO_PRODUCTS[0]}
                    backgroundColor={opt.hex}
                    optionLabel={`${opt.name}: ${opt.subtitle} (${opt.hex})`}
                    isComparison
                  />
                ))}
              </div>
            </div>

            {/* Teste com Pod Rosa / Cítrico */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pod Rosa/Vermelho — Pink Lemonade
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Contraste com tons cítricos e framboesa</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COLOR_OPTIONS.map((opt) => (
                  <CatalogCardItem
                    key={`pink-${opt.id}`}
                    product={DEMO_PRODUCTS[1]}
                    backgroundColor={opt.hex}
                    optionLabel={`${opt.name}: ${opt.subtitle} (${opt.hex})`}
                    isComparison
                  />
                ))}
              </div>
            </div>

            {/* Teste com Pod Roxo / Violeta (Cor da Marca) */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#A84CFF] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pod Violeta/Roxo — Aurora Berries
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Contraste com mirtilos e fumaça violeta</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COLOR_OPTIONS.map((opt) => (
                  <CatalogCardItem
                    key={`aurora-${opt.id}`}
                    product={DEMO_PRODUCTS[2]}
                    backgroundColor={opt.hex}
                    optionLabel={`${opt.name}: ${opt.subtitle} (${opt.hex})`}
                    isComparison
                  />
                ))}
              </div>
            </div>

            {/* Teste com Pod Neutro / Branco / Gelo */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Pod Neutro/Gelo — Clear
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Contraste com corpo transparente e cristais de gelo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COLOR_OPTIONS.map((opt) => (
                  <CatalogCardItem
                    key={`clear-${opt.id}`}
                    product={DEMO_PRODUCTS[3]}
                    backgroundColor={opt.hex}
                    optionLabel={`${opt.name}: ${opt.subtitle} (${opt.hex})`}
                    isComparison
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. GUIA DE ANÁLISE E INSTRUÇÕES */}
        <section className="mt-12 rounded-2xl border border-slate-800 bg-[#14121F] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-[#A84CFF] border border-purple-500/30">
              <Info className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Critérios Técnicos Aplicados na Correção das Imagens
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Todas as três opções foram configuradas com as correções de apresentação solicitadas:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-300 pt-2 border-t border-slate-800/60">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
              <strong className="text-white block font-semibold">1. Proporção e Sem Cortes</strong>
              <p className="text-[11px] text-slate-400">
                Imagens renderizadas com <code className="text-[#A84CFF]">object-contain</code> e margens seguras (<code className="text-[#A84CFF]">max-h-[88%]</code>), garantindo frutas ao redor e fumaça sem cortes nas bordas.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
              <strong className="text-white block font-semibold">2. Badges Desacoplados</strong>
              <p className="text-[11px] text-slate-400">
                As etiquetas de Lançamento e Promoção ficam suspensas em chip com fundo escuro translúcido no canto superior, sem encobrir o bocal do pod.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 space-y-1">
              <strong className="text-white block font-semibold">3. Estrutura Oficial Preservada</strong>
              <p className="text-[11px] text-slate-400">
                O corpo do card e o fundo geral mantêm o grafite profundo (#101018, #1D1929), o lilás acinzentado (#C9C3D5) e os botões roxos (#A84CFF).
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Componente do Card do Catálogo com fundo personalizável
 */
function CatalogCardItem({
  product,
  backgroundColor,
  optionLabel,
  isComparison = false,
}: {
  product: DemoProduct;
  backgroundColor: string;
  optionLabel: string;
  isComparison?: boolean;
}) {
  const currentPrice = product.promoPrice || product.price;
  const originalPrice = product.promoPrice ? product.price : null;
  const cashback = currentPrice * 0.05;

  return (
    <article className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-[#352347] bg-[#1D1929] shadow-[0_8px_24px_rgba(16,16,24,0.45)] transition-all duration-300 hover:border-[#A84CFF]/70 hover:shadow-[0_12px_32px_rgba(168,76,255,0.22)]">
      {/* IDENTIFICADOR DA OPÇÃO (Visível no modo comparação) */}
      {isComparison && (
        <div className="bg-[#14121F] border-b border-slate-800 px-2.5 py-1 text-[10px] font-mono text-center text-slate-300 truncate">
          {optionLabel}
        </div>
      )}

      {/* ÁREA DA IMAGEM: Aplicação exclusiva da cor de teste (A: #C9CDD3, B: #E4DDD8, C: #D8D5DC) */}
      <div
        className="relative w-full aspect-square overflow-hidden flex items-center justify-center p-2.5 sm:p-3 transition-colors duration-300"
        style={{ backgroundColor }}
      >
        {/* Iluminação suave e radial para toque acetinado de estúdio fotográfico */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255, 255, 255, 0.45) 0%, transparent 75%)",
          }}
          aria-hidden="true"
        />

        {/* Badges de Lançamento / Promoção no canto superior esquerdo (fora da área nobre do produto) */}
        {product.badge && (
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 pointer-events-none">
            {product.badge === "lancamento" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-amber-400/50 px-2 py-0.5 text-[8.5px] sm:text-[10px] font-bold text-amber-300 shadow-md backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                LANÇAMENTO
              </span>
            )}
            {product.badge === "promocao" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-rose-400/50 px-2 py-0.5 text-[8.5px] sm:text-[10px] font-bold text-rose-300 shadow-md backdrop-blur-md">
                <Zap className="h-2.5 w-2.5 text-rose-400" />
                PROMOÇÃO
              </span>
            )}
          </div>
        )}

        {/* Tag indicativa do tipo de cor no canto inferior direito */}
        <span className="absolute bottom-1.5 right-1.5 z-20 rounded-md bg-[#101018]/80 px-1.5 py-0.5 text-[8px] font-mono text-slate-300 backdrop-blur-xs">
          {product.colorType}
        </span>

        {/* Imagem do Produto: Centralização perfeita, proporção mantida, sem cortes de frutas/fumaça */}
        <div className="relative z-10 flex h-full w-full items-center justify-center p-1">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            width={500}
            height={500}
            className="h-full w-full max-h-[88%] max-w-[88%] object-contain object-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.40)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      {/* CORPO DO CARD: Estrutura oficial grafite violeta da Pantanal Smoke */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3.5 justify-between bg-gradient-to-b from-[#1D1929] to-[#14121F] border-t border-[#352347]/60">
        <div className="space-y-1">
          {/* Categoria + Puffs */}
          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
            <span className="font-bold uppercase tracking-wider text-[#A84CFF] truncate">
              {product.category}
            </span>
            <span className="font-semibold text-slate-400 shrink-0 font-mono">
              {product.puffs}
            </span>
          </div>

          {/* Nome do Produto */}
          <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-[#A84CFF] transition-colors">
            {product.name}
          </h3>

          {/* Perfil de Sabor / Benefício */}
          <p className="text-[10.5px] sm:text-xs text-[#C9C3D5] line-clamp-1">
            {product.flavor}
          </p>
        </div>

        {/* Preço e Cashback */}
        <div className="mt-3 pt-2 border-t border-[#352347]/40 space-y-1.5">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white font-mono">
                {formatBRL(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-[10px] text-slate-500 line-through font-mono">
                  {formatBRL(originalPrice)}
                </span>
              )}
            </div>

            {/* Badge de Cashback Verde */}
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
              +{formatBRL(cashback)}
            </span>
          </div>

          {/* Botão de Adicionar (Apenas ilustrativo no design lab) */}
          <Button
            type="button"
            size="sm"
            className="w-full bg-[#A84CFF] hover:bg-[#A84CFF]/90 text-white font-bold text-xs h-7 sm:h-8 gap-1 shadow-[0_0_12px_rgba(168,76,255,0.35)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * Layout da Página de Detalhes do Produto com a cor de teste
 */
function ProductDetailLayout({
  product,
  backgroundColor,
  optionLabel,
  optionId,
}: {
  product: DemoProduct;
  backgroundColor: string;
  optionLabel: string;
  optionId: string;
}) {
  const currentPrice = product.promoPrice || product.price;
  const originalPrice = product.promoPrice ? product.price : null;
  const cashback = currentPrice * 0.05;

  return (
    <div className="rounded-3xl border border-[#352347] bg-[#14121F] p-4 sm:p-6 lg:p-8 shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        {/* COLUNA ESQUERDA: Área de Apresentação da Imagem */}
        <div className="space-y-3">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/20 p-6 flex items-center justify-center shadow-2xl transition-colors duration-300"
            style={{ backgroundColor }}
          >
            {/* Iluminação suave e radial */}
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 75%)",
              }}
              aria-hidden="true"
            />

            {/* Badges superiores */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
              {product.badge === "lancamento" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#101018]/90 border border-amber-400/50 px-3 py-1 text-xs font-bold text-amber-300 shadow-lg backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  LANÇAMENTO OFICIAL
                </span>
              )}
              {product.badge === "promocao" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#101018]/90 border border-rose-400/50 px-3 py-1 text-xs font-bold text-rose-300 shadow-lg backdrop-blur-md">
                  <Zap className="h-3.5 w-3.5 text-rose-400" />
                  PREÇO PROMOCIONAL
                </span>
              )}
            </div>

            {/* Imagem em Destaque: Proporção ampla, centralização perfeita e sem sobreposições */}
            <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full max-h-[90%] max-w-[90%] object-contain object-center drop-shadow-[0_16px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:scale-105"
              />
            </div>

            {/* Indicador de Cor Testada */}
            <div className="absolute bottom-3 left-4 z-20 rounded-full bg-[#101018]/85 border border-white/10 px-3 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-md">
              Fundo Testado: <strong className="text-white">{optionLabel} ({backgroundColor})</strong>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400">
            Imagens com frutas e fumaça preservadas com contorno nítido sobre o fundo {optionLabel}.
          </p>
        </div>

        {/* COLUNA DIREITA: Informações do Produto, Preço e Compra */}
        <div className="space-y-5">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#A84CFF]">
                {product.category}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-slate-300">
                {product.puffs}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              {product.name}
            </h2>

            <p className="text-sm text-[#C9C3D5]">{product.flavor}</p>
          </div>

          {/* Preços e Cashback */}
          <div className="rounded-2xl border border-slate-800 bg-[#1D1929]/70 p-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {formatBRL(currentPrice)}
              </span>
              {originalPrice && (
                <span className="text-sm text-slate-500 line-through font-mono">
                  {formatBRL(originalPrice)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 font-bold text-emerald-400">
                +{formatBRL(cashback)} de volta
              </span>
              <span className="text-slate-400">em saldo de cashback na sua conta</span>
            </div>
          </div>

          {/* Especificações do Pod */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capacidade</span>
              <span className="text-sm font-bold text-white font-mono">40.000 Puffs</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Intensidade</span>
              <span className="text-sm font-bold text-white">{product.intensity}</span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              className="flex-1 bg-[#A84CFF] hover:bg-[#A84CFF]/90 text-white font-bold h-11 text-sm shadow-[0_0_20px_rgba(168,76,255,0.4)]"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Comprar Agora
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#352347] hover:bg-[#1D1929] text-slate-200 h-11 text-sm"
            >
              Adicionar à Sacola
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

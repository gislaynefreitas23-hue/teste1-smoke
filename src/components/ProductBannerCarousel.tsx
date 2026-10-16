import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Zap } from "lucide-react";

import imgAurora from "@/assets/banner-aurora-berries.jpg";
import imgPinkLemonade from "@/assets/banner-pink-lemonade.jpg";
import imgToastedPineapple from "@/assets/banner-toasted-pineapple.jpg";

type SlideItem = {
  id: number;
  name: string;
  puffs: string;
  image: string;
  footerPhrase: string;
  flavorDesc: string;
  tagColor: string;
  glowColor: string;
};

const SLIDES: SlideItem[] = [
  {
    id: 1,
    name: "Aurora Berries",
    puffs: "40K PUFFS",
    image: imgAurora,
    footerPhrase: "Consistência de Sabor de Alta Performance",
    flavorDesc: "Fusão marcante de frutas silvestres com frescor intenso e vapor denso.",
    tagColor: "border-cyan-400/40 text-cyan-300 bg-cyan-950/40",
    glowColor: "rgba(56, 189, 248, 0.25)",
  },
  {
    id: 2,
    name: "Pink Lemonade",
    puffs: "40K PUFFS",
    image: imgPinkLemonade,
    footerPhrase: "Gerenciamento de Potência e Autonomia Estendida",
    flavorDesc: "Notas cítricas e vibrantes de limão siciliano com frutas vermelhas selecionadas.",
    tagColor: "border-pink-400/40 text-pink-300 bg-pink-950/40",
    glowColor: "rgba(244, 114, 182, 0.25)",
  },
  {
    id: 3,
    name: "Toasted Pineapple",
    puffs: "40K PUFFS",
    image: imgToastedPineapple,
    footerPhrase: "Design Funcional com Visibilidade de Essência",
    flavorDesc: "Perfil tropical com notas doces e levemente tostadas de abacaxi premium.",
    tagColor: "border-amber-400/40 text-amber-300 bg-amber-950/40",
    glowColor: "rgba(251, 191, 36, 0.25)",
  },
];

export function ProductBannerCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Transição automática a cada 5 segundos
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const activeSlide = SLIDES[current];

  return (
    <section
      aria-label="Destaques Pantanal Smoke"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="group relative my-8 overflow-hidden rounded-3xl border border-slate-700/60 shadow-2xl transition-all duration-300"
      style={{
        background:
          "linear-gradient(135deg, #1c1e24 0%, #252831 45%, #191b20 100%)",
      }}
    >
      {/* Camadas de fumaça roxa contínua animada (roxo neon) */}
      <div
        className="animate-smoke-1 pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(147, 51, 234, 0.15) 60%, transparent 80%)",
        }}
        aria-hidden="true"
      />
      <div
        className="animate-smoke-2 pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(192, 132, 252, 0.35) 0%, rgba(126, 34, 206, 0.15) 60%, transparent 80%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/3 top-1/4 h-64 w-64 rounded-full blur-2xl opacity-20"
        style={{
          background: "radial-gradient(circle, #a855f7 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Brilho neon roxo sutil na borda superior */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        aria-hidden="true"
      />

      {/* Conteúdo principal do slide */}
      <div className="relative z-10 grid min-h-[360px] grid-cols-1 items-center gap-6 p-6 sm:p-8 md:min-h-[390px] md:grid-cols-12 md:p-10">
        {/* Coluna de Textos e Especificações */}
        <div className="flex flex-col justify-center space-y-4 md:col-span-7 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Badge de Destaque 40K PUFFS */}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/20 px-3.5 py-1 text-xs font-bold tracking-wider text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.4)] backdrop-blur-sm uppercase">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {activeSlide.puffs}
            </span>

            {/* Tag sutil de tecnologia */}
            <span className="rounded-xl border border-slate-600/40 bg-slate-800/60 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-300 backdrop-blur-xs">
              Série Especial Turbo
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white transition-all duration-300 sm:text-4xl md:text-5xl">
              {activeSlide.name}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {activeSlide.flavorDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Tela Digital Integrada
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Bateria Recarregável
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Modo Turbo Ativo
            </span>
          </div>
        </div>

        {/* Coluna da Imagem (Showcase que preserva proporção, nitidez e detalhes) */}
        <div className="flex items-center justify-center md:col-span-5 lg:col-span-4">
          <div className="relative flex h-64 w-full max-w-[240px] items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-2 shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition-all duration-500 sm:h-72 sm:max-w-[260px] md:h-80">
            {/* Halo de luz neon atrás da embalagem */}
            <div
              className="pointer-events-none absolute inset-0 opacity-15 blur-xl transition-all duration-500"
              style={{ background: activeSlide.glowColor }}
              aria-hidden="true"
            />
            <img
              src={activeSlide.image}
              alt={`${activeSlide.name} — ${activeSlide.puffs}`}
              className="relative z-10 h-full w-full object-contain transition-transform duration-500 hover:scale-105"
              loading="eager"
            />
          </div>
        </div>
      </div>

      {/* Setas de navegação manual laterais */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Slide anterior"
        className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600/50 bg-[#16181d]/80 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:border-primary hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Próximo slide"
        className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600/50 bg-[#16181d]/80 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:border-primary hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Faixa inferior (Rodapé do Banner) com frase sincronizada e indicadores */}
      <div className="relative z-20 flex flex-col items-center justify-between gap-3 border-t border-slate-700/60 bg-[#13151a]/90 px-6 py-3.5 backdrop-blur-md sm:flex-row">
        {/* Frase sincronizada com o slide correspondente */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs font-semibold tracking-wide text-slate-200 sm:text-sm">
            {activeSlide.footerPhrase}
          </p>
        </div>

        {/* Indicadores de posição (Dots clicáveis + paginação) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides do banner">
            {SLIDES.map((slide, idx) => {
              const isActive = idx === current;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Ir para o slide ${idx + 1}: ${slide.name}`}
                  onClick={() => setCurrent(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "w-7 bg-primary shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                      : "w-2 bg-slate-600/60 hover:bg-slate-400"
                  }`}
                />
              );
            })}
          </div>

          <span className="text-xs font-mono font-medium text-slate-400">
            0{current + 1} / 0{SLIDES.length}
          </span>
        </div>
      </div>
    </section>
  );
}

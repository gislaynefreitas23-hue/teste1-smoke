import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Zap, Gauge, ArrowRight } from "lucide-react";

import imgAurora from "@/assets/banner-aurora-berries.png";
import imgPinkLemonade from "@/assets/banner-pink-lemonade.png";
import imgToastedPineapple from "@/assets/banner-toasted-pineapple.png";
import { resolveProductImage } from "@/lib/brasa";
import { useStoreSettings } from "@/lib/store-settings";

import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";

const POD_PRODUCT_IDS: Record<string, string> = {
  "Aurora Berries": "055e851d-e131-41c4-bbb5-6e358c2e719b",
  "Pink Lemonade": "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff",
  "Toasted Pineapple": "9739d60d-33e4-4540-8d0b-2bdeda2cae86",
  "Pineapple Toasted": "9739d60d-33e4-4540-8d0b-2bdeda2cae86",
  "Golden Berry": "e8717cb6-9ceb-4997-9162-09e08fbefb41",
  "Triple Berry": "1eeb97e8-5f52-48a4-9847-cd62daf9b37f",
  "Clear": "566e06a8-2051-40f7-90df-70b0a275a1ad",
};

function CarouselSlideImage({
  imageUrl,
  alt,
  isEager,
  productId,
  productName,
}: {
  imageUrl: string;
  alt: string;
  isEager: boolean;
  productId?: string;
  productName?: string;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(() => {
    return getTransparentPodAsset(productId, imageUrl, productName || alt) || imageUrl;
  });

  useEffect(() => {
    let active = true;
    const fastAsset = getTransparentPodAsset(productId, imageUrl, productName || alt);
    if (fastAsset) {
      setResolvedUrl(fastAsset);
      return;
    }

    if (imageUrl) {
      resolveProductImage(imageUrl).then(async (url) => {
        if (active && url) {
          try {
            const clean = await removeWhiteBackgroundClientSide(url);
            if (active) setResolvedUrl(clean);
          } catch {
            if (active) setResolvedUrl(url);
          }
        }
      });
    }
    return () => {
      active = false;
    };
  }, [imageUrl, productId, productName, alt]);

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className="relative z-10 h-full w-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.55)] transition-transform duration-500 hover:scale-105"
      loading={isEager ? "eager" : "lazy"}
    />
  );
}

type SlideItem = {
  id: number;
  productId?: string;
  name: string;
  puffs: string;
  image: string;
  footerPhrase: string;
  flavorDesc: string;
  subtitle: string;
  features: string[];
  glowColor: string;
};

const SLIDES: SlideItem[] = [
  {
    id: 1,
    name: "Aurora Berries",
    puffs: "40.000 PUFFS",
    image: imgAurora,
    subtitle: "Série Especial Turbo",
    footerPhrase: "Consistência de Sabor de Alta Performance",
    flavorDesc:
      "Fusão equilibrada de amoras silvestres e framboesas com toque refrescante de menta gelada e vapor denso.",
    features: ["Tela Digital Integrada", "Bateria Recarregável", "Modo Turbo Ativo"],
    glowColor: "rgba(168, 85, 247, 0.45)",
  },
  {
    id: 2,
    name: "Pink Lemonade",
    puffs: "40.000 PUFFS",
    image: imgPinkLemonade,
    subtitle: "Série Especial Turbo",
    footerPhrase: "Gerenciamento de Potência e Autonomia Estendida",
    flavorDesc:
      "Notas cítricas marcantes de limão siciliano harmonizadas com frutas vermelhas selecionadas e vapor suave.",
    features: ["Controle de Voltagem", "Mesh Coil Duplo", "Carregamento Rápido"],
    glowColor: "rgba(244, 114, 182, 0.45)",
  },
  {
    id: 3,
    name: "Toasted Pineapple",
    puffs: "40.000 PUFFS",
    image: imgToastedPineapple,
    subtitle: "Série Especial Turbo",
    footerPhrase: "Design Funcional com Visibilidade de Essência",
    flavorDesc:
      "Perfil tropical exclusivo com nuances doces e tostadas de abacaxi maduro, proporcionando sabor encorpado.",
    features: ["Visor de Líquido", "Fluxo de Ar Ajustável", "Autonomia Máxima"],
    glowColor: "rgba(251, 191, 36, 0.4)",
  },
];

export function ProductBannerCarousel() {
  const { settings } = useStoreSettings();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const activeBanners = settings.banners.filter((b) => b.active);
  const slides: SlideItem[] =
    activeBanners.length > 0
      ? activeBanners.map((b, idx) => {
          const cleanTitle = (b.title || "").trim();
          const shortTitle = cleanTitle.replace(/^EBCREATE BC Pro 40K\s*[-–]\s*/i, "").trim();
          const matchedProdId = POD_PRODUCT_IDS[cleanTitle] || POD_PRODUCT_IDS[shortTitle];

          return {
            id: idx + 1,
            productId: matchedProdId,
            name: b.title,
            puffs: b.puffs,
            image: b.imageUrl || SLIDES[idx % SLIDES.length]?.image || imgAurora,
            subtitle: "Série Especial Turbo",
            footerPhrase: b.footerPhrase,
            flavorDesc:
              SLIDES[idx % SLIDES.length]?.flavorDesc ||
              "Perfil refinado e vapor denso de alta durabilidade.",
            features:
              SLIDES[idx % SLIDES.length]?.features || [
                "Alta Performance",
                "Bateria Recarregável",
                "Modo Turbo",
              ],
            glowColor:
              SLIDES[idx % SLIDES.length]?.glowColor || "rgba(168, 85, 247, 0.45)",
          };
        })
      : SLIDES;

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Transição automática a cada 5 segundos (5000ms)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  // Suporte a gestos touch/swipe no celular
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 45;
      if (diff > minSwipeDistance) {
        nextSlide();
      } else if (diff < -minSwipeDistance) {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
    setIsPaused(false);
  };

  return (
    <section
      aria-label="Carrossel de Destaques Pantanal Smoke"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="group relative my-6 w-full overflow-hidden rounded-3xl border border-[#34313B]/30 shadow-[0_20px_45px_rgba(52,49,59,0.18)] transition-all duration-300"
      style={{
        background:
          "radial-gradient(110% 90% at 50% 45%, #E9E0D6 0%, #E4E1E5 38%, #D5D3D8 68%, #C9C0C1 86%, #34313B 100%)",
      }}
    >
      {/* Camadas visuais de fumaça roxa contínua integradas com transparência difusa */}
      <div
        className="animate-smoke-1 pointer-events-none absolute -left-20 -top-24 h-96 w-96 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(168, 85, 247, 0.32) 0%, rgba(147, 51, 234, 0.12) 50%, transparent 75%)",
        }}
        aria-hidden="true"
      />
      <div
        className="animate-smoke-2 pointer-events-none absolute -right-20 -bottom-20 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(192, 132, 252, 0.28) 0%, rgba(168, 85, 247, 0.14) 55%, transparent 80%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-2xl opacity-20"
        style={{
          background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Filete superior com brilho roxo neon sofisticado */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#A855F7]/80 to-transparent"
        aria-hidden="true"
      />

      {/* Trilho horizontal do carrossel */}
      <div className="relative z-10 w-full overflow-hidden">
        <div
          className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, index) => {
            const isSlideActive = index === current;
            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} de ${totalSlides}: ${slide.name}`}
                aria-hidden={!isSlideActive}
                className="w-full shrink-0 px-6 py-7 sm:px-12 sm:py-8 md:px-14 md:py-10"
              >
                <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 md:min-h-[370px] md:grid-cols-12">
                  {/* Coluna 1: Informações e Destaques */}
                  <div className="flex flex-col justify-center space-y-4 md:col-span-7 lg:col-span-8">
                    {/* Linha Superior: Selo LANÇAMENTO + Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Selo LANÇAMENTO destacado em roxo neon com brilho elegante */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-[#A855F7] px-3.5 py-1 text-[11px] font-black tracking-[0.25em] uppercase text-white shadow-[0_0_16px_rgba(168,85,247,0.5)] sm:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        LANÇAMENTO
                      </span>

                      {/* Identificação 40.000 PUFFS */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-600/40 bg-[#25222B] px-3.5 py-1 text-xs font-bold tracking-wider text-purple-200 shadow-sm backdrop-blur-sm">
                        <Zap className="h-3.5 w-3.5 text-purple-400" />
                        {slide.puffs}
                      </span>

                      {/* Tag de Tecnologia Turbo */}
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/40 bg-slate-900/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#34313B]">
                        <Gauge className="h-3 w-3 text-slate-600" />
                        {slide.subtitle}
                      </span>
                    </div>

                    {/* Nome do Produto com Tipografia Escura Forte sobre fundo luminoso */}
                    <div>
                      <h2 className="text-3xl font-black tracking-tight text-[#221F28] sm:text-4xl md:text-5xl">
                        {slide.name}
                      </h2>
                      <p className="mt-2.5 max-w-xl text-xs font-medium leading-relaxed text-[#4A4652] sm:text-sm md:text-base">
                        {slide.flavorDesc}
                      </p>
                    </div>

                    {/* Recursos e Performance */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-medium text-[#423E4B] sm:text-xs">
                      {slide.features.map((feature, fIdx) => (
                        <div key={feature} className="flex items-center gap-1.5">
                          {fIdx > 0 && <span className="text-[#8B8694]">•</span>}
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] shadow-[0_0_6px_rgba(168,85,247,0.9)]" />
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Botão de ação direta para o produto */}
                    <div className="pt-2 flex items-center gap-3">
                      <a
                        href={slide.productId ? `/produtos/${slide.productId}` : "/produtos"}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#A855F7] to-[#7E22CE] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(168,85,247,0.35)] transition-all hover:scale-105 hover:shadow-[0_6px_20px_rgba(168,85,247,0.55)] cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        Ver Detalhes & Pedir
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Coluna 2: Produto com Fumaça Roxa Integrada (Sem Caixa Branca) */}
                  <div className="flex items-center justify-center md:col-span-5 lg:col-span-4">
                    <a
                      href={slide.productId ? `/produtos/${slide.productId}` : "/produtos"}
                      className="group/img relative flex h-64 w-full max-w-[260px] items-center justify-center sm:h-72 sm:max-w-[280px] md:h-84 cursor-pointer"
                      aria-label={`Ver detalhes de ${slide.name}`}
                    >
                      {/* Iluminação difusa roxa projetada atrás da imagem original do produto */}
                      <div
                        className="pointer-events-none absolute inset-0 -m-6 rounded-full opacity-40 blur-2xl transition-all duration-500 group-hover/img:opacity-65"
                        style={{ background: slide.glowColor }}
                        aria-hidden="true"
                      />
                      <CarouselSlideImage
                        imageUrl={slide.image}
                        alt={`${slide.name} — ${slide.puffs}`}
                        isEager={index === 0}
                        productId={slide.productId}
                        productName={slide.name}
                      />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setas de navegação manual com visual refinado */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Slide anterior"
        className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#C9C0C1] bg-white/80 text-[#34313B] shadow-md backdrop-blur-md transition-all duration-200 hover:border-[#A855F7] hover:bg-[#A855F7] hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer sm:left-3 sm:h-10 sm:w-10"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Próximo slide"
        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#C9C0C1] bg-white/80 text-[#34313B] shadow-md backdrop-blur-md transition-all duration-200 hover:border-[#A855F7] hover:bg-[#A855F7] hover:text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] cursor-pointer sm:right-3 sm:h-10 sm:w-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Faixa inferior (Rodapé do Banner): base sólida em grafite com frase sincronizada + indicadores */}
      <div className="relative z-20 flex flex-col items-center justify-between gap-3 border-t border-[#34313B]/30 bg-[#25222B]/95 px-6 py-3.5 backdrop-blur-md sm:flex-row">
        {/* Frase sincronizada exclusivamente com o slide ativo */}
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Sparkles className="h-4 w-4 shrink-0 text-[#A855F7] drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]" aria-hidden="true" />
          <div className="relative h-5 overflow-hidden sm:h-6 flex items-center">
            {slides.map((slide, idx) => (
              <span
                key={slide.id}
                className={`transition-all duration-500 text-xs sm:text-sm font-semibold tracking-wide text-slate-100 ${
                  idx === current
                    ? "block opacity-100 translate-y-0"
                    : "hidden opacity-0 -translate-y-2"
                }`}
              >
                {slide.footerPhrase}
              </span>
            ))}
          </div>
        </div>

        {/* Indicadores de posição (Dots com destaque roxo neon e contador) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Navegação dos slides">
            {slides.map((slide, idx) => {
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
                      ? "w-7 bg-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.9)]"
                      : "w-2 bg-slate-500/60 hover:bg-slate-300"
                  }`}
                />
              );
            })}
          </div>

          <span className="text-xs font-mono font-medium text-slate-300">
            0{current + 1} / 0{totalSlides}
          </span>
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Zap } from "lucide-react";

import { useStoreSettings } from "@/lib/store-settings";
import {
  POD_PRODUCT_IDS,
  SLIDES,
  type SlideItem,
} from "./ProductBannerCarousel";
import {
  getCachedCleanImage,
  getTransparentPodAsset,
  removeWhiteBackgroundClientSide,
} from "@/lib/image-processing";
import { resolveProductImage } from "@/lib/brasa";
import imgAurora from "@/assets/banner-aurora-berries.png";

export function MobileLaunchHeader({ className = "" }: { className?: string }) {
  const { settings } = useStoreSettings();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Verificação defensiva de rota para evitar renderizar no checkout ou admin
  let pathname = "/";
  try {
    const loc = useLocation();
    pathname = loc.pathname;
  } catch {
    pathname = "/";
  }

  // Não renderiza em páginas de checkout ou no painel admin
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) {
    return null;
  }

  const activeBanners = settings.banners
    .filter((b) => b.active)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const slides: SlideItem[] =
    activeBanners.length > 0
      ? activeBanners.map((b, idx) => {
          const cleanTitle = (b.title || "").trim();
          const shortTitle = cleanTitle.replace(/^EBCREATE BC Pro 40K\s*[-–]\s*/i, "").trim();
          const matchedProdId = b.productId || POD_PRODUCT_IDS[cleanTitle] || POD_PRODUCT_IDS[shortTitle];

          return {
            id: idx + 1,
            productId: matchedProdId,
            name: b.title,
            puffs: b.puffs || "40.000 PUFFS",
            image: b.imageUrl || SLIDES[idx % SLIDES.length]?.image || imgAurora,
            subtitle: "Série Especial Turbo",
            footerPhrase: b.footerPhrase || "Alta Performance",
            flavorDesc:
              b.flavorDesc ||
              b.description ||
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

  useEffect(() => {
    if (current >= totalSlides && totalSlides > 0) {
      setCurrent(0);
    }
  }, [totalSlides, current]);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

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
      const minSwipeDistance = 35;
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

  const activeSlide = slides[current] || slides[0];
  const targetUrl = activeSlide.productId
    ? `/produtos/${activeSlide.productId}`
    : "/produtos";

  const instantThumb =
    getTransparentPodAsset(activeSlide.productId, activeSlide.image, activeSlide.name) ||
    getCachedCleanImage(activeSlide.image);

  const [resolvedThumb, setResolvedThumb] = useState<string>(() => instantThumb || activeSlide.image);
  const [isThumbReady, setIsThumbReady] = useState<boolean>(!!instantThumb);

  useEffect(() => {
    let active = true;
    const fastAsset =
      getTransparentPodAsset(activeSlide.productId, activeSlide.image, activeSlide.name) ||
      getCachedCleanImage(activeSlide.image);

    if (fastAsset) {
      setResolvedThumb(fastAsset);
      setIsThumbReady(true);
      return;
    }

    if (activeSlide.image) {
      resolveProductImage(activeSlide.image).then(async (url) => {
        if (!active) return;
        const target = url || activeSlide.image;
        try {
          const clean = await removeWhiteBackgroundClientSide(target);
          if (active) {
            setResolvedThumb(clean);
            setIsThumbReady(true);
          }
        } catch {
          if (active) {
            setResolvedThumb(target);
            setIsThumbReady(true);
          }
        }
      });
    }

    return () => {
      active = false;
    };
  }, [activeSlide.productId, activeSlide.image, activeSlide.name]);

  return (
    <div
      data-testid="mobile-launch-header"
      role="region"
      aria-label="Lançamentos no cabeçalho"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full border-t border-purple-500/20 bg-gradient-to-r from-[#17141E] via-[#221B2E] to-[#17141E] px-3 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden ${className}`}
    >
      <Link
        to={targetUrl}
        className="group flex items-center justify-between gap-2 overflow-hidden"
      >
        {/* Esquerda: Selo LANÇAMENTO com indicador neon pulsante */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/40 bg-[#A855F7] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-white shadow-[0_0_8px_rgba(168,85,247,0.7)]">
            <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
            LANÇAMENTO
          </span>
        </div>

        {/* Centro: Miniatura com iluminação difusa + Nome + Puffs */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Miniatura do Pod transparente */}
          <div className="relative h-7 w-7 shrink-0 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-60"
              style={{ background: activeSlide.glowColor }}
              aria-hidden="true"
            />
            <img
              src={resolvedThumb}
              alt={activeSlide.name}
              className={`relative z-10 h-7 w-7 object-contain drop-shadow-[0_2px_6px_rgba(168,85,247,0.4)] transition-opacity duration-300 group-hover:scale-110 ${
                isThumbReady ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
            />
          </div>

          {/* Nome e Puffs */}
          <div className="flex items-baseline gap-1.5 min-w-0 truncate">
            <span className="text-xs font-bold text-slate-100 truncate tracking-tight group-hover:text-purple-300 transition-colors">
              {activeSlide.name}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-300 shrink-0">
              <Zap className="h-2.5 w-2.5 text-purple-400" />
              {activeSlide.puffs}
            </span>
          </div>
        </div>

        {/* Direita: Ação direta Ver + Contador */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center text-[10px] font-bold text-primary transition-transform duration-200 group-hover:translate-x-0.5">
            Ver
            <ChevronRight className="h-3 w-3" />
          </span>
          <span className="font-mono text-[9px] font-medium text-slate-400">
            0{current + 1}/0{totalSlides}
          </span>
        </div>
      </Link>
    </div>
  );
}

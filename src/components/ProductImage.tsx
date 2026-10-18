import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveProductImage } from "@/lib/brasa";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  productId?: string;
  productName?: string;
  className?: string;
  containerClassName?: string;
  glowEffect?: boolean;
  glowColor?: string;
  priority?: boolean;
  aspectRatio?: "square" | "video" | "auto" | "banner";
  showPlaceholderName?: boolean;
}

/**
 * Componente padronizado e reutilizável para exibição de imagens na Pantanal Smoke.
 * Garante que produtos e montagens visuais se integrem naturalmente ao fundo escuro e roxo,
 * sem molduras brancas artificiais, sem caixas e preservando a qualidade e proporção original.
 */
export function ProductImage({
  src,
  alt,
  productId,
  productName,
  className,
  containerClassName,
  glowEffect = true,
  glowColor = "rgba(168, 85, 247, 0.25)",
  priority = false,
  aspectRatio = "square",
  showPlaceholderName = true,
}: ProductImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    async function load() {
      // 1. Tenta recuperar versão derivada com transparência já otimizada
      const podTransparent = getTransparentPodAsset(productId, src, productName || alt);
      if (podTransparent) {
        if (active) {
          setResolvedSrc(podTransparent);
          setIsLoading(false);
        }
        return;
      }

      if (!src) {
        if (active) {
          setResolvedSrc(null);
          setIsLoading(false);
        }
        return;
      }

      // 2. Se for base64 ou blob já transparente
      if (src.startsWith("data:") || src.startsWith("blob:")) {
        if (active) {
          setResolvedSrc(src);
          setIsLoading(false);
        }
        return;
      }

      // 3. Resolve URL assinada caso esteja no Supabase Storage
      const rawUrl = await resolveProductImage(src);
      if (!active) return;

      if (!rawUrl) {
        setResolvedSrc(null);
        setIsLoading(false);
        return;
      }

      // 4. Se a imagem contiver fundo branco incorporado, processa a transparência dinamicamente
      try {
        const cleanTransparent = await removeWhiteBackgroundClientSide(rawUrl);
        if (active) {
          setResolvedSrc(cleanTransparent);
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setResolvedSrc(rawUrl);
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [src, productId, productName, alt]);

  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "banner"
      ? "h-64 sm:h-72 md:h-84"
      : "";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden flex items-center justify-center select-none",
        aspectClass,
        containerClassName
      )}
    >
      {/* Brilho neon difuso roxo de fundo integrado, sem quadrado ou caixa sólida */}
      {glowEffect && (
        <div
          className="pointer-events-none absolute inset-0 -m-4 rounded-full opacity-40 blur-2xl transition-all duration-500"
          style={{ background: glowColor }}
          aria-hidden="true"
        />
      )}

      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onError={() => setHasError(true)}
          className={cn(
            "relative z-10 h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] transition-transform duration-300",
            className
          )}
        />
      ) : (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
          <Package className="h-10 w-10 mb-1 text-primary/40 stroke-[1.5]" />
          {showPlaceholderName && (
            <span className="text-xs font-medium text-slate-400 line-clamp-2 max-w-[180px]">
              {productName || alt}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Eye, Package, Plus, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, resolveProductImage, type Product } from "@/lib/brasa";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";

export function ProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  const { add } = useCart();
  const { selectedCityId } = useCity();
  const [image, setImage] = useState<string | null>(() => {
    const fastAsset = getTransparentPodAsset(product.id, product.image_url, product.name);
    if (fastAsset) return fastAsset;
    if (
      product.image_url?.startsWith("data:") ||
      product.image_url?.startsWith("blob:") ||
      product.image_url?.startsWith("http")
    ) {
      return product.image_url;
    }
    return null;
  });

  const targetCity = product.city_id || selectedCityId || "cuiaba";
  const stock = typeof product.stock === "number" ? product.stock : 15;
  const isOutOfStock = stock <= 0;

  const currentPrice = product.promo_price ? Number(product.promo_price) : Number(product.price);
  const originalPrice = product.promo_price ? Number(product.price) : null;

  useEffect(() => {
    let active = true;
    const fastAsset = getTransparentPodAsset(product.id, product.image_url, product.name);
    if (fastAsset) {
      setImage(fastAsset);
      return;
    }

    if (!product.image_url) {
      setImage(null);
      return;
    }

    resolveProductImage(product.image_url).then(async (url) => {
      if (active && url) {
        try {
          const clean = await removeWhiteBackgroundClientSide(url);
          if (active) setImage(clean);
        } catch {
          if (active) setImage(url);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [product.id, product.image_url, product.name]);

  const handleOpenProduct = () => {
    navigate({
      to: "/produtos/$productId",
      params: { productId: product.id },
    });
  };

  return (
    <>
      <article
        onClick={handleOpenProduct}
        className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border bg-card transition-all duration-300 hover:border-primary/60 hover:shadow-glow cursor-pointer"
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenProduct();
          }
        }}
        aria-label={`Ver detalhes do produto ${product.name}`}
      >
        <div className="aspect-square w-full bg-slate-950/40 relative overflow-hidden flex items-center justify-center">
          {/* Brilho neon difuso roxo de fundo integrado, sem quadrado ou caixa sólida */}
          <div
            className="pointer-events-none absolute inset-0 -m-4 rounded-full opacity-35 blur-2xl transition-all duration-500 group-hover:opacity-60"
            style={{ background: "rgba(168, 85, 247, 0.22)" }}
            aria-hidden="true"
          />

          {/* Badge de Destaque: Lançamento ou Promoção */}
          <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10 flex flex-col gap-1">
            {product.badge === "lancamento" && (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-ember/30 border border-amber-500/50 px-1.5 py-0.5 sm:px-2 text-[8px] sm:text-[10px] font-bold text-amber-300 shadow-glow backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-ember" />
                LANÇAMENTO
              </span>
            )}
            {product.badge === "promocao" && (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full bg-gradient-to-r from-rose-500/20 to-orange-500/30 border border-rose-500/50 px-1.5 py-0.5 sm:px-2 text-[8px] sm:text-[10px] font-bold text-rose-300 shadow-glow backdrop-blur-md">
                <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-400" />
                PROMOÇÃO
              </span>
            )}
          </div>

          {/* Badge da cidade ativa */}
          <div className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card/90 px-1.5 py-0.5 sm:px-2 text-[8px] sm:text-[10px] font-semibold text-primary backdrop-blur-md shadow-xs max-w-[75px] sm:max-w-none truncate">
              {targetCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}
            </span>
          </div>

          {/* Imagem do Produto com Efeito Hover */}
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              width={600}
              height={600}
              className="relative z-10 h-full w-full object-contain p-2 sm:p-3 drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="relative z-10 flex h-full w-full items-center justify-center px-2 text-center text-xs sm:text-sm text-muted-foreground">
              {product.name}
            </div>
          )}

          {/* Dica visual suave de "Clique para ver detalhes" no hover (apenas desktop) */}
          <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-primary/40 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Ver Detalhes
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-2.5 sm:p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold truncate">
              {product.category}
            </p>
            <span className={`text-[9px] sm:text-[10px] font-medium shrink-0 ${isOutOfStock ? "text-rose-400" : "text-emerald-400"}`}>
              {isOutOfStock ? (
                <>
                  <span className="sm:hidden">Esgotado</span>
                  <span className="hidden sm:inline">Esgotado nesta cidade</span>
                </>
              ) : (
                <>
                  {stock} un.<span className="hidden sm:inline"> disponíveis</span>
                </>
              )}
            </span>
          </div>

          <h3 className="mt-1 text-xs sm:text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {product.description}
            </p>
          )}

          {(product.flavor_profile || product.intensity) && (
            <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5">
              {product.flavor_profile && (
                <Badge variant="secondary" className="text-[9px] sm:text-xs px-1.5 py-0">
                  {product.flavor_profile}
                </Badge>
              )}
              {product.intensity && (
                <Badge variant="secondary" className="text-[9px] sm:text-xs px-1.5 py-0">
                  {product.intensity}
                </Badge>
              )}
            </div>
          )}

          <div className="mt-auto pt-2 sm:pt-4 flex items-center justify-between gap-1.5 border-t border-border/40">
            <div className="flex flex-col min-w-0">
              {originalPrice && (
                <span className="text-[9px] sm:text-[11px] text-muted-foreground line-through leading-none">
                  {formatBRL(originalPrice)}
                </span>
              )}
              <span className="text-sm sm:text-lg font-bold text-ember truncate leading-tight">
                {formatBRL(currentPrice)}
              </span>
            </div>

            <Button
              size="sm"
              disabled={isOutOfStock}
              className={`h-7 px-2 sm:h-9 sm:px-3 text-[11px] sm:text-sm shrink-0 gap-1 ${isOutOfStock ? "opacity-50 cursor-not-allowed" : "bg-ember"}`}
              onClick={(e) => {
                e.stopPropagation();
                add({
                  id: product.id,
                  name: product.name,
                  price: currentPrice,
                  cityId: targetCity,
                  stock,
                  imageUrl: product.image_url,
                });
              }}
              aria-label={`Adicionar ${product.name} ao carrinho`}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              <span>{isOutOfStock ? "Esgotado" : "Adicionar"}</span>
            </Button>
          </div>
        </div>
      </article>
    </>
  );
}

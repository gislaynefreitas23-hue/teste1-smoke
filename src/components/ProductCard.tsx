import { useEffect, useState } from "react";
import { Check, Eye, Package, Plus, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, resolveProductImage, type Product } from "@/lib/brasa";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { ProductDetailModal } from "@/components/ProductDetailModal";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { selectedCityId } = useCity();
  const [image, setImage] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const targetCity = product.city_id || selectedCityId || "cuiaba";
  const stock = typeof product.stock === "number" ? product.stock : 15;
  const isOutOfStock = stock <= 0;

  const currentPrice = product.promo_price ? Number(product.promo_price) : Number(product.price);
  const originalPrice = product.promo_price ? Number(product.price) : null;

  useEffect(() => {
    let active = true;
    resolveProductImage(product.image_url).then((url) => {
      if (active) setImage(url);
    });
    return () => {
      active = false;
    };
  }, [product.image_url]);

  return (
    <>
      <article
        onClick={() => setDetailOpen(true)}
        className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:border-primary/60 hover:shadow-glow cursor-pointer"
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
        aria-label={`Ver detalhes do produto ${product.name}`}
      >
        <div className="aspect-square w-full bg-slate-950/60 relative overflow-hidden flex items-center justify-center">
          {/* Badge de Destaque: Lançamento ou Promoção */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
            {product.badge === "lancamento" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-ember/30 border border-amber-500/50 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-glow backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-ember" />
                LANÇAMENTO
              </span>
            )}
            {product.badge === "promocao" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500/20 to-orange-500/30 border border-rose-500/50 px-2 py-0.5 text-[10px] font-bold text-rose-300 shadow-glow backdrop-blur-md">
                <Zap className="h-3 w-3 text-orange-400" />
                PROMOÇÃO
              </span>
            )}
          </div>

          {/* Badge da cidade ativa */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-md shadow-xs">
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
              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {product.name}
            </div>
          )}

          {/* Dica visual suave de "Clique para ver detalhes" no hover */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-primary/40 px-3 py-1 text-xs font-semibold text-white shadow-lg">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Ver Detalhes
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {product.category}
            </p>
            <span className={`text-[10px] font-medium ${isOutOfStock ? "text-rose-400" : "text-emerald-400"}`}>
              {isOutOfStock ? "Esgotado nesta cidade" : `${stock} un. disponíveis`}
            </span>
          </div>

          <h3 className="mt-1 font-semibold leading-snug group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.flavor_profile && <Badge variant="secondary">{product.flavor_profile}</Badge>}
            {product.intensity && <Badge variant="secondary">{product.intensity}</Badge>}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="flex flex-col">
              {originalPrice && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatBRL(originalPrice)}
                </span>
              )}
              <span className="text-lg font-bold text-ember">
                {formatBRL(currentPrice)}
              </span>
            </div>

            <Button
              size="sm"
              disabled={isOutOfStock}
              className={isOutOfStock ? "opacity-50 cursor-not-allowed" : "bg-ember"}
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
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {isOutOfStock ? "Esgotado" : "Adicionar"}
            </Button>
          </div>
        </div>
      </article>

      {/* Modal de Detalhes Completo ao Clicar no Produto */}
      <ProductDetailModal
        product={product}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

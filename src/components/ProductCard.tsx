import { useEffect, useState } from "react";
import { Check, Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, resolveProductImage, type Product } from "@/lib/brasa";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { selectedCityId } = useCity();
  const [image, setImage] = useState<string | null>(null);

  const targetCity = product.city_id || selectedCityId || "cuiaba";
  const stock = typeof product.stock === "number" ? product.stock : 15;
  const isOutOfStock = stock <= 0;

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
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="aspect-square w-full bg-muted relative">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            width={600}
            height={600}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {product.name}
          </div>
        )}

        {/* Badge da cidade ativa */}
        <div className="absolute top-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-md shadow-xs">
            {targetCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}
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

        <h3 className="mt-1 font-semibold leading-snug">{product.name}</h3>
        {product.description && (
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.flavor_profile && <Badge variant="secondary">{product.flavor_profile}</Badge>}
          {product.intensity && <Badge variant="secondary">{product.intensity}</Badge>}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 pt-1">
          <span className="text-lg font-bold text-ember">{formatBRL(product.price)}</span>
          <Button
            size="sm"
            disabled={isOutOfStock}
            className={isOutOfStock ? "opacity-50 cursor-not-allowed" : "bg-ember"}
            onClick={() =>
              add({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                cityId: targetCity,
                stock,
                imageUrl: product.image_url,
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isOutOfStock ? "Esgotado" : "Adicionar"}
          </Button>
        </div>
      </div>
    </article>
  );
}

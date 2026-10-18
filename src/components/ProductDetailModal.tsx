import { useEffect, useState } from "react";
import { Check, Minus, Package, Plus, ShieldCheck, ShoppingBag, Sparkles, Truck, Wallet, Zap } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL, resolveProductImage, type Product } from "@/lib/brasa";
import { useCart } from "@/lib/cart";

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({
  product,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [resolvedImage, setResolvedImage] = useState<string | null>(null);

  // Reseta a quantidade e resolve a imagem ao abrir novo produto
  useEffect(() => {
    if (product) {
      setQuantity(1);
      let active = true;
      if (product.image_url) {
        resolveProductImage(product.image_url).then((url) => {
          if (active) setResolvedImage(url);
        });
      } else {
        setResolvedImage(null);
      }
      return () => {
        active = false;
      };
    }
  }, [product]);

  if (!product) return null;

  const targetCity = product.city_id || "cuiaba";
  const stock = typeof product.stock === "number" ? product.stock : 15;
  const isOutOfStock = stock <= 0;

  const currentPrice = product.promo_price ? product.promo_price : Number(product.price);
  const originalPrice = product.promo_price ? Number(product.price) : null;
  const subtotal = currentPrice * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    add(
      {
        id: product.id,
        name: product.name,
        price: currentPrice,
        cityId: targetCity,
        stock,
        imageUrl: product.image_url,
      },
      quantity
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden bg-background/95 p-0 border-primary/20 backdrop-blur-xl sm:rounded-2xl max-h-[92vh] flex flex-col">
        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Coluna da Imagem Ampliada */}
            <div className="relative flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-4 min-h-[260px] sm:min-h-[360px] overflow-hidden">
              {/* Badges de Lançamento / Promoção sobre a imagem */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                {product.badge === "lancamento" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-ember/30 border border-amber-500/50 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-glow">
                    <Sparkles className="h-3.5 w-3.5 text-ember" />
                    LANÇAMENTO
                  </span>
                )}
                {product.badge === "promocao" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500/20 to-orange-500/30 border border-rose-500/50 px-2.5 py-1 text-[11px] font-bold text-rose-300 shadow-glow">
                    <Zap className="h-3.5 w-3.5 text-orange-400" />
                    PROMOÇÃO
                  </span>
                )}
              </div>

              {/* Badge da Cidade */}
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card/90 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-md shadow-xs">
                  {targetCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}
                </span>
              </div>

              {/* Foto Ampliada */}
              {resolvedImage ? (
                <img
                  src={resolvedImage}
                  alt={product.name}
                  className="max-h-[280px] sm:max-h-[340px] w-full object-contain transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80";
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Package className="h-16 w-16 mb-2 text-primary/40" />
                  <p className="text-sm font-medium">{product.name}</p>
                </div>
              )}
            </div>

            {/* Coluna de Informações e Ações */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <DialogHeader className="text-left space-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    {product.category}
                  </span>
                  <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {product.name}
                  </DialogTitle>
                </DialogHeader>

                {/* Preço (com suporte a promoção se houver) */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-ember">
                    {formatBRL(currentPrice)}
                  </span>
                  {originalPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatBRL(originalPrice)}
                    </span>
                  )}
                  {product.badge === "promocao" && originalPrice && (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                      Economize {formatBRL(originalPrice - currentPrice)}
                    </span>
                  )}
                </div>

                {/* Status de Estoque */}
                <p className={`mt-1 text-xs font-semibold ${isOutOfStock ? "text-rose-400" : "text-emerald-400"}`}>
                  {isOutOfStock ? "✕ Esgotado nesta cidade" : `✓ Em estoque para pronta entrega (${stock} un.)`}
                </p>

                {/* Descrição Completa */}
                <div className="mt-4 border-t border-border/50 pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Descrição do Produto
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {product.description || "Produto selecionado com alto padrão de qualidade e sabor, com entrega rápida pela Pantanal Smoke."}
                  </p>
                </div>

                {/* Características / Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {product.flavor_profile && (
                    <Badge variant="secondary" className="text-xs font-medium bg-card border-primary/20">
                      Sabor: {product.flavor_profile}
                    </Badge>
                  )}
                  {product.intensity && (
                    <Badge variant="secondary" className="text-xs font-medium bg-card border-primary/20">
                      Intensidade: {product.intensity}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controles de Compra e Quantidade */}
              <div className="space-y-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Quantidade:
                  </span>
                  <div className="flex items-center rounded-xl border border-slate-700 bg-card/80 p-0.5">
                    <button
                      type="button"
                      disabled={quantity <= 1 || isOutOfStock}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-foreground">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= stock || isOutOfStock}
                      onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-800 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <Button
                  size="lg"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`w-full font-bold shadow-glow text-sm h-11 gap-2 cursor-pointer ${
                    isOutOfStock ? "opacity-50 cursor-not-allowed bg-slate-800" : "bg-ember hover:bg-ember/90 text-primary-foreground"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isOutOfStock ? "Produto Esgotado" : `Adicionar ao Carrinho • ${formatBRL(subtotal)}`}
                </Button>

                {/* Vantagens e Confiança */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>5% de Cashback</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      {targetCity === "cuiaba" ? "Taxa fixa R$ 10 (Cuiabá)" : "Entrega Grátis (SP)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

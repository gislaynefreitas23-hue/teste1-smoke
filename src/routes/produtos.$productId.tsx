import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  MapPin,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatBRL,
  productsQueryOptions,
  resolveProductImage,
  singleProductQueryOptions,
  SITE_NAME,
  WHATSAPP_NUMBER,
} from "@/lib/brasa";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useAuthSession } from "@/lib/useAuth";
import { ProductCard } from "@/components/ProductCard";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";

export const Route = createFileRoute("/produtos/$productId")({
  head: ({ params }) => ({
    meta: [
      { title: `Detalhes do Produto — ${SITE_NAME}` },
      {
        name: "description",
        content: "Veja todos os detalhes, fotos e faça seu pedido na Pantanal Smoke.",
      },
    ],
  }),
  component: ProductDetailPage,
});

export function ProductDetailPage({ productId: propProductId }: { productId?: string }) {
  let routeParamId: string | undefined;
  try {
    const params = Route.useParams();
    routeParamId = params?.productId;
  } catch {
    // fallback se renderizado fora de um RouterProvider completo
  }
  const productId = propProductId || routeParamId || "";
  const navigate = useNavigate();
  const { selectedCityId, selectedCity, openSelector } = useCity();
  const currentCity = selectedCityId || "cuiaba";

  const { add } = useCart();
  const { session } = useAuthSession();

  const [quantity, setQuantity] = useState(1);
  const [resolvedImage, setResolvedImage] = useState<string | null>(null);
  const [addedJustNow, setAddedJustNow] = useState(false);

  // Consulta o produto diretamente do Supabase e sincronizado com os inventários da cidade ativa
  const { data: product, isLoading, isError } = useQuery(
    singleProductQueryOptions(productId, currentCity)
  );

  // Produtos relacionados para cross-sell
  const { data: allCityProducts = [] } = useQuery(productsQueryOptions(currentCity));

  const relatedProducts = allCityProducts
    .filter((p) => p.id !== productId && (p.category === product?.category || true))
    .slice(0, 3);

  // Carrega e assina a imagem do produto, aplicando transparência limpa se necessário
  useEffect(() => {
    if (product) {
      let active = true;
      const fastAsset = getTransparentPodAsset(product.id, product.image_url, product.name);
      if (fastAsset) {
        setResolvedImage(fastAsset);
        return;
      }

      if (product.image_url) {
        resolveProductImage(product.image_url).then(async (url) => {
          if (active && url) {
            try {
              const clean = await removeWhiteBackgroundClientSide(url);
              if (active) setResolvedImage(clean);
            } catch {
              if (active) setResolvedImage(url);
            }
          }
        });
      } else {
        setResolvedImage(null);
      }
      return () => {
        active = false;
      };
    }
  }, [product?.id, product?.image_url, product?.name]);

  // Reseta quantidade quando muda de produto
  useEffect(() => {
    setQuantity(1);
    setAddedJustNow(false);
  }, [productId]);

  // Cálculos de preço, estoque e cashback
  const currentPrice = product?.promo_price ? Number(product.promo_price) : Number(product?.price || 0);
  const originalPrice = product?.promo_price ? Number(product?.price || 0) : null;
  const stock = typeof product?.stock === "number" ? product.stock : 15;
  const isOutOfStock = !product || stock <= 0 || product.active === false;
  const subtotal = currentPrice * quantity;
  const cashbackEstimated = subtotal * 0.05;

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    const durableImage =
      getTransparentPodAsset(product.id, null, product.name) ||
      (product.image_url && !product.image_url.startsWith("data:") ? product.image_url : undefined);

    const success = add(
      {
        id: product.id,
        name: product.name,
        price: currentPrice,
        cityId: currentCity,
        stock,
        imageUrl: durableImage,
      },
      quantity
    );

    if (success) {
      setAddedJustNow(true);
      setTimeout(() => setAddedJustNow(false), 3000);
    }
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;

    const durableImage =
      getTransparentPodAsset(product.id, null, product.name) ||
      (product.image_url && !product.image_url.startsWith("data:") ? product.image_url : undefined);

    const success = add(
      {
        id: product.id,
        name: product.name,
        price: currentPrice,
        cityId: currentCity,
        stock,
        imageUrl: durableImage,
      },
      quantity
    );

    if (success) {
      navigate({ to: "/checkout" });
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center">
        <div className="inline-flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-primary border-t-transparent mb-4" />
        <h2 className="text-xl font-bold text-white">Carregando detalhes do produto...</h2>
        <p className="text-xs text-muted-foreground mt-1">Conectando ao catálogo da Pantanal Smoke</p>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">Produto não encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Este item pode estar indisponível para a praça selecionada ({currentCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}) ou foi descontinuado do catálogo.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => openSelector()} className="border-primary/40 text-xs">
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Trocar Cidade Ativa
          </Button>

          <Button asChild className="bg-primary hover:bg-primary/90 text-xs font-bold shadow-glow">
            <Link to="/produtos">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Voltar ao Catálogo Completo
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* Navegação Superior / Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-b border-border/40 pb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">
            Início
          </Link>
          <span>/</span>
          <Link to="/produtos" className="hover:text-primary transition-colors">
            Produtos
          </Link>
          <span>/</span>
          <span className="text-slate-400">{product.category}</span>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </div>

        <Link
          to="/produtos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao Catálogo
        </Link>
      </div>

      {/* Grid Principal: Imagem e Dados do Produto */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
        {/* Coluna Esquerda: Imagem em Destaque */}
        <div className="space-y-4">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/20 p-6 flex items-center justify-center shadow-2xl transition-colors duration-300 bg-product-lavanda"
            style={{ background: "linear-gradient(145deg, #E9E5EC 0%, #D8D5DC 55%, #BDB8C5 100%)" }}
          >
            {/* Iluminação suave e radial para acabamento de estúdio */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 75%)",
              }}
              aria-hidden="true"
            />

            {/* Badges de Destaque */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {product.badge === "lancamento" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-amber-400/50 px-3 py-1 text-xs font-bold text-amber-300 shadow-md backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  LANÇAMENTO EXCLUSIVO
                </span>
              )}
              {product.badge === "promocao" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-rose-400/50 px-3 py-1 text-xs font-bold text-rose-300 shadow-md backdrop-blur-md">
                  <Zap className="h-3.5 w-3.5 text-rose-400" />
                  SUPER PROMOÇÃO
                </span>
              )}
            </div>

            {/* Badge de Praça / Cidade */}
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#101018]/90 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md shadow-md">
                <MapPin className="h-3.5 w-3.5 text-[#A84CFF]" />
                {currentCity === "sao-paulo" ? "São Paulo — SP" : "Cuiabá — MT"}
              </span>
            </div>

            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt={product.name}
                className="relative z-10 h-full w-full max-h-[90%] max-w-[90%] object-contain object-center drop-shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-transform duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-700 p-8 text-center">
                <Package className="h-16 w-16 mb-2 text-[#A84CFF]/40" />
                <span className="text-sm font-semibold">{product.name}</span>
                <span className="text-xs text-slate-600 mt-1">Pantanal Smoke Original</span>
              </div>
            )}
          </div>

          {/* Selos de Confiança abaixo da Imagem */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            <div className="rounded-xl border border-border/40 bg-card/40 p-2.5 flex flex-col items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-emerald-400 mb-1" />
              <span className="font-semibold text-foreground">100% Original</span>
              <span className="text-[10px]">Garantia de Qualidade</span>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/40 p-2.5 flex flex-col items-center justify-center">
              <Truck className="h-4 w-4 text-primary mb-1" />
              <span className="font-semibold text-foreground">Envio Rápido</span>
              <span className="text-[10px]">
                {currentCity === "cuiaba" ? "Taxa fixa R$ 10" : "Entrega Grátis SP"}
              </span>
            </div>
            <div className="rounded-xl border border-border/40 bg-card/40 p-2.5 flex flex-col items-center justify-center">
              <Wallet className="h-4 w-4 text-amber-400 mb-1" />
              <span className="font-semibold text-foreground">5% Cashback</span>
              <span className="text-[10px]">Em todas as compras</span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Informações, Preços, Estoque e Ações de Compra */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 uppercase tracking-wider">
                {product.category}
              </Badge>

              {product.flavor_profile && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Sabor: {product.flavor_profile}
                </Badge>
              )}

              {product.intensity && (
                <Badge variant="secondary" className="text-xs font-medium">
                  Intensidade: {product.intensity}
                </Badge>
              )}
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {product.name}
            </h1>
          </div>

          {/* Bloco Informativo de Preços e Promoção com fundo lilás acinzentado (#D8D5DC) */}
          <div
            className="rounded-2xl border border-[#BDB6C8]/80 p-5 shadow-[0_8px_20px_rgba(16,16,24,0.12)] space-y-3.5 transition-colors duration-300"
            style={{
              background: "linear-gradient(145deg, #E2DFE8 0%, #D8D5DC 55%, #CDC8D5 100%)",
            }}
          >
            <div className="flex items-baseline gap-3 flex-wrap">
              {originalPrice && (
                <span className="text-base sm:text-lg text-slate-600 line-through font-medium">
                  {formatBRL(originalPrice)}
                </span>
              )}
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                {formatBRL(currentPrice)}
              </span>

              {originalPrice && (
                <span className="rounded-md bg-emerald-600/15 border border-emerald-700/30 px-2 py-0.5 text-xs font-bold text-emerald-900 shadow-xs">
                  Economize {formatBRL(originalPrice - currentPrice)}
                </span>
              )}
            </div>

            {/* Aviso de Cashback */}
            <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-[#BDB6C8]/70 p-2.5 text-xs text-slate-800 shadow-xs">
              <Sparkles className="h-4 w-4 text-purple-700 shrink-0" />
              <span>
                Ganhe <strong className="text-purple-950 font-bold">{formatBRL(cashbackEstimated)}</strong> (5% em cashback) ao receber seu pedido.
              </span>
            </div>
          </div>

          {/* Status do Estoque */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                !isOutOfStock ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500"
              }`}
            />
            {!isOutOfStock ? (
              <span className="text-emerald-400 font-semibold">
                Em estoque ({stock} unidades disponíveis para pronta entrega)
              </span>
            ) : (
              <span className="text-rose-400 font-semibold">
                Produto esgotado no momento para esta cidade
              </span>
            )}
          </div>

          {/* Descrição Completa do Produto */}
          {product.description && (
            <div className="space-y-2 border-t border-border/40 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Descrição do Produto
              </h3>
              <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Controles de Quantidade e Subtotal */}
          {!isOutOfStock && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Quantidade:</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-card p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                    className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>

                  <span className="min-w-8 text-center text-sm font-bold text-white">
                    {quantity}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={quantity >= stock}
                    onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                    aria-label="Aumentar quantidade"
                    className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                <span className="text-muted-foreground">Subtotal do item:</span>
                <strong className="text-base font-bold text-white">
                  {formatBRL(subtotal)}
                </strong>
              </div>
            </div>
          )}

          {/* Botões de Ação: Adicionar ao Carrinho e Comprar Agora */}
          <div className="space-y-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="w-full bg-slate-900 border border-primary/40 text-foreground hover:bg-primary/20 hover:border-primary font-bold text-sm gap-2 transition-all cursor-pointer"
              >
                {addedJustNow ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Adicionado ao Carrinho!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    <span>Adicionar ao Carrinho</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="lg"
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full bg-ember hover:bg-ember/90 text-primary-foreground font-extrabold text-sm gap-2 shadow-glow transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Comprar Agora</span>
              </Button>
            </div>

            {addedJustNow && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Produto adicionado ao seu carrinho com sucesso!
                </span>
                <Link to="/carrinho" className="font-bold underline text-emerald-300 hover:text-emerald-200">
                  Ir para o carrinho →
                </Link>
              </div>
            )}
          </div>

          {/* Detalhes de Pagamento na Entrega e Suporte */}
          <div className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              <span>Pagamento somente na entrega</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Você pode pagar no momento em que receber seu pedido em casa: aceitamos Pix, cartão de débito, crédito ou dinheiro em mãos.
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Produtos Relacionados */}
      {relatedProducts.length > 0 && (
        <div className="pt-8 border-t border-border/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Você também pode gostar</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Outros produtos disponíveis para {currentCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-primary gap-1">
              <Link to="/produtos">
                Ver todos
                <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, Plus, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBRL, resolveProductImage, type Product } from "@/lib/brasa";
import { getTransparentPodAsset, removeWhiteBackgroundClientSide } from "@/lib/image-processing";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useStoreSettings } from "@/lib/store-settings";

interface ProductGlowConfig {
  primary: string;
  secondary?: string;
}

/**
 * Determina a iluminação suave e orgânica para o fundo de cada produto
 * combinando com suas cores predominantes e perfil de sabor.
 */
export function getProductGlow(product: {
  name?: string;
  flavor_profile?: string;
  category?: string;
  description?: string;
}): ProductGlowConfig {
  const text = `${product.name || ""} ${product.flavor_profile || ""} ${product.description || ""}`.toLowerCase();

  // 1. Aurora Berries / Berries / Frutas Roxas & Azuis: rosa-framboesa e azul-violeta
  if (
    text.includes("aurora") ||
    text.includes("triple berry") ||
    text.includes("berry") ||
    text.includes("framboesa") ||
    text.includes("mirtilo") ||
    text.includes("amora")
  ) {
    return {
      primary: "rgba(225, 29, 142, 0.32)",
      secondary: "rgba(124, 58, 237, 0.28)",
    };
  }

  // 2. Pink Lemonade / Limão Rosa / Morango / Melancia: rosa-claro com nuance cítrica
  if (
    text.includes("pink lemonade") ||
    text.includes("lemonade") ||
    text.includes("pink") ||
    text.includes("morango") ||
    text.includes("strawberry") ||
    text.includes("watermelon") ||
    text.includes("melancia")
  ) {
    return {
      primary: "rgba(244, 114, 182, 0.32)",
      secondary: "rgba(250, 204, 21, 0.20)",
    };
  }

  // 3. Toasted Pineapple / Abacaxi / Golden Berry / Amarelos: dourado e amarelo-âmbar
  if (
    text.includes("pineapple") ||
    text.includes("abacaxi") ||
    text.includes("toasted") ||
    text.includes("golden") ||
    text.includes("mango") ||
    text.includes("manga") ||
    text.includes("banana")
  ) {
    return {
      primary: "rgba(245, 158, 11, 0.34)",
      secondary: "rgba(234, 179, 8, 0.24)",
    };
  }

  // 4. Blue Razz Ice / Azul / Menta / Ice / Blueberry: azul-elétrico e ciano
  if (
    text.includes("blue razz") ||
    text.includes("blue") ||
    text.includes("ice") ||
    text.includes("menta") ||
    text.includes("spearmint") ||
    text.includes("cool") ||
    text.includes("frost")
  ) {
    return {
      primary: "rgba(14, 165, 233, 0.34)",
      secondary: "rgba(6, 182, 212, 0.24)",
    };
  }

  // 5. Produtos verdes / Maçã Verde / Lima / Menta: verde-lima com iluminação discreta
  if (
    text.includes("green") ||
    text.includes("verde") ||
    text.includes("apple") ||
    text.includes("maçã") ||
    text.includes("lime") ||
    text.includes("kiwi") ||
    text.includes("menthol") ||
    text.includes("limão")
  ) {
    return {
      primary: "rgba(132, 204, 22, 0.30)",
      secondary: "rgba(34, 197, 94, 0.20)",
    };
  }

  // 6. Produtos laranja / Pêssego / Maracujá / Tangerina: laranja e dourado suave
  if (
    text.includes("orange") ||
    text.includes("laranja") ||
    text.includes("peach") ||
    text.includes("pêssego") ||
    text.includes("passion") ||
    text.includes("maracujá") ||
    text.includes("tangerina")
  ) {
    return {
      primary: "rgba(249, 115, 22, 0.32)",
      secondary: "rgba(245, 158, 11, 0.22)",
    };
  }

  // 7. Padrão Neutro Violeta Grafite Pantanal Smoke (para novos produtos cadastrados)
  return {
    primary: "rgba(168, 76, 255, 0.30)", // Roxo #A84CFF
    secondary: "rgba(53, 35, 71, 0.35)", // Grafite Violeta #352347
  };
}

export function ProductCard({
  product,
  cityId,
}: {
  product: Product;
  cityId?: string;
}) {
  const navigate = useNavigate();
  const { add } = useCart();
  const { selectedCityId } = useCity();
  const { settings } = useStoreSettings();

  const catalogSettings = settings.catalogSettings || {
    showShortDescription: true,
    showLaunchBadges: true,
    showFlavorProfile: true,
    showStockCount: false,
    buttonText: "Adicionar",
  };

  const variationName = settings.productVariations?.[product.id] || "";
  const customShortDesc = settings.productShortDescriptions?.[product.id] || "";

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

  const targetCity = cityId || product.city_id || selectedCityId || "cuiaba";
  const stock = typeof product.stock === "number" ? product.stock : 15;
  const isOutOfStock = stock <= 0;

  const currentPrice = product.promo_price ? Number(product.promo_price) : Number(product.price);
  const originalPrice = product.promo_price ? Number(product.price) : null;

  const glow = getProductGlow(product);

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

  const showLaunch =
    catalogSettings.showLaunchBadges !== false &&
    (product.badge === "lancamento" || settings.productBadges?.[product.id] === "lancamento");
  const showPromo =
    product.badge === "promocao" || settings.productBadges?.[product.id] === "promocao";

  return (
    <article
      onClick={handleOpenProduct}
      className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-[#352347] bg-[#1D1929] shadow-[0_8px_24px_rgba(16,16,24,0.45)] transition-all duration-300 hover:border-[#A84CFF]/70 hover:shadow-[0_12px_32px_rgba(168,76,255,0.22)] hover:-translate-y-0.5 cursor-pointer"
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
      {/* 2. ÁREA DA IMAGEM: Base escura de contraste (#101018) com brilho suave atrás */}
      <div className="relative w-full aspect-square overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-[#101018] to-[#151222] border-b border-[#352347]/60">
        {/* Iluminação suave e orgânica atrás da imagem com as cores do produto */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-500 group-hover:scale-110"
          aria-hidden="true"
        >
          <div
            className="h-24 w-24 sm:h-36 sm:w-36 rounded-full blur-2xl opacity-65 group-hover:opacity-90 transition-opacity duration-300"
            style={{
              background: glow.secondary
                ? `radial-gradient(circle, ${glow.primary} 0%, ${glow.secondary} 55%, transparent 75%)`
                : `radial-gradient(circle, ${glow.primary} 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* 1. BADGE DE DESTAQUE: Lançamento ou Promoção (Canto superior esquerdo) */}
        {(showLaunch || showPromo) && (
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
            {showLaunch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-amber-400/50 px-2 py-0.5 text-[8.5px] sm:text-[10px] font-bold text-amber-300 shadow-md backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                LANÇAMENTO
              </span>
            )}
            {showPromo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#101018]/90 border border-rose-400/50 px-2 py-0.5 text-[8.5px] sm:text-[10px] font-bold text-rose-300 shadow-md backdrop-blur-md">
                <Zap className="h-2.5 w-2.5 text-rose-400" />
                PROMOÇÃO
              </span>
            )}
          </div>
        )}

        {/* Imagem do Produto: proporção padronizada, centralizada e integrada sem distorções */}
        <div className="relative z-10 flex h-full w-full items-center justify-center p-1 sm:p-2">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              width={600}
              height={600}
              className="h-full w-full max-h-[85%] max-w-[85%] object-contain object-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center px-2 text-xs sm:text-sm text-[#C9C3D5]">
              {product.name}
            </div>
          )}
        </div>

        {/* Efeito sutil de hover para desktop */}
        <div className="pointer-events-none absolute inset-0 hidden sm:flex items-center justify-center bg-[#101018]/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1D1929]/95 border border-[#A84CFF]/60 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            <Eye className="h-3.5 w-3.5 text-[#A84CFF]" />
            Ver Detalhes
          </span>
        </div>
      </div>

      {/* 3, 4, 5, 6, 7. CORPO DO CARD: Grafite Violeta com alinhamento uniforme e e-commerce premium */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-4 justify-between bg-gradient-to-b from-[#1D1929] to-[#14121F]">
        <div>
          {/* 3. Categoria e Disponibilidade */}
          <div className="flex items-center justify-between gap-1 text-[9.5px] sm:text-[11px]">
            <span className="font-bold uppercase tracking-wider text-[#A84CFF]/90 truncate">
              {product.category}
            </span>
            {isOutOfStock ? (
              <span className="text-[9px] sm:text-[10px] font-semibold text-rose-400 shrink-0">
                Esgotado
              </span>
            ) : catalogSettings.showStockCount ? (
              <span className="text-[9px] sm:text-[10px] font-medium text-emerald-400/90 shrink-0">
                {stock} un.
              </span>
            ) : null}
          </div>

          {/* 4. Nome completo do produto com altura mínima padronizada para alinhamento uniforme */}
          <h3 className="mt-1 text-xs sm:text-sm md:text-[15px] font-extrabold text-white leading-snug line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] flex items-center group-hover:text-[#A84CFF] transition-colors">
            {product.name}
          </h3>

          {/* Nome complementar ou variação (se configurado) */}
          {variationName && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-[#C9C3D5]/70 font-medium truncate">
              {variationName}
            </p>
          )}

          {/* 5. Perfil de sabor (elegante e legível sem caixas excessivas) */}
          {catalogSettings.showFlavorProfile && product.flavor_profile && (
            <p className="mt-1 text-[11px] sm:text-xs font-medium text-[#C9C3D5]/85 truncate">
              {product.flavor_profile}
            </p>
          )}

          {/* Descrição resumida exibida no card */}
          {catalogSettings.showShortDescription && (customShortDesc || product.description) && (
            <p className="mt-1 text-[10.5px] sm:text-xs text-[#C9C3D5]/65 line-clamp-2 leading-relaxed">
              {customShortDesc || product.description}
            </p>
          )}
        </div>

        {/* 6 & 7. PREÇO E BOTÃO DE ADICIONAR (Fixados na base para alinhamento uniforme) */}
        <div className="mt-auto pt-2.5 sm:pt-3.5 border-t border-[#352347]/60 flex items-center justify-between gap-1">
          <div className="flex flex-col shrink-0">
            {originalPrice && (
              <span className="text-[9px] sm:text-[11px] text-[#C9C3D5]/60 line-through leading-none">
                {formatBRL(originalPrice)}
              </span>
            )}
            <span className="text-[11px] min-[360px]:text-xs sm:text-base font-extrabold text-white tracking-tight leading-tight whitespace-nowrap">
              {formatBRL(currentPrice)}
            </span>
          </div>

          {/* 7. Botão de adicionar ao carrinho com roxo característico (#A84CFF) */}
          <Button
            size="sm"
            disabled={isOutOfStock}
            className={`h-7 px-2 min-[360px]:px-2.5 sm:h-8.5 sm:px-3 text-[10px] min-[360px]:text-xs font-bold rounded-xl shrink-0 gap-1 transition-all ${
              isOutOfStock
                ? "bg-[#352347]/50 text-[#C9C3D5]/50 border border-[#352347] cursor-not-allowed"
                : "bg-[#A84CFF] hover:bg-[#9333EA] text-white shadow-[0_4px_14px_rgba(168,76,255,0.35)] hover:shadow-[0_4px_18px_rgba(168,76,255,0.55)] active:scale-95"
            }`}
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
            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span>{isOutOfStock ? "Esgotado" : (catalogSettings.buttonText || "Adicionar")}</span>
          </Button>
        </div>
      </div>
    </article>
  );
}

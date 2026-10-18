import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getStoreSettings } from "@/lib/store-settings";

export const SITE_NAME = "Pantanal Smoke";

/** Número que recebe os pedidos no WhatsApp (formato internacional, sem +). */
export const WHATSAPP_NUMBER = "5565999210066";

/** Percentual devolvido em cashback quando a loja confirma a entrega. */
export const CASHBACK_RATE = 0.05;

/** Taxa fixa de entrega obrigatória para Cuiabá (R$ 10,00). */
export const TAXA_ENTREGA_CUIABA = 10.0;

export const AGE_GATE_KEY = "brasa-age-ok";
export const CART_KEY = "brasa-cart";

export function formatBRL(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

/** Validação defensiva: só aceita caminhos internos do próprio site. */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  return value;
}

export type CityInventory = {
  id?: string;
  product_id?: string;
  city_id: "cuiaba" | "sao-paulo";
  price: number;
  stock: number;
  active: boolean;
};

export type ProductBadge = "nenhum" | "lancamento" | "promocao";

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  flavor_profile: string;
  intensity: string;
  price: number;
  promo_price?: number;
  badge?: ProductBadge;
  image_url: string;
  stock?: number;
  city_id?: "cuiaba" | "sao-paulo";
  inventories?: Record<string, CityInventory>;
  order?: number;
};

/** Catálogo público: só produtos ativos e disponíveis na cidade selecionada. */
export function productsQueryOptions(cityId?: "cuiaba" | "sao-paulo" | null) {
  const targetCity = cityId || "cuiaba";

  return queryOptions({
    queryKey: ["products", targetCity],
    queryFn: async (): Promise<Product[]> => {
      // 1. Tenta carregar os produtos junto com seus inventários específicos de cidade
      let rawProducts: any[] = [];

      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            name,
            category,
            description,
            flavor_profile,
            intensity,
            price,
            image_url,
            active,
            product_city_inventories (
              id,
              city_id,
              price,
              stock,
              active
            )
          `)
          .eq("active", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (!error && data) {
          rawProducts = data;
        } else {
          throw error;
        }
      } catch {
        // Fallback defensivo caso a tabela product_city_inventories ainda não esteja carregada no cache
        const { data, error } = await supabase
          .from("products")
          .select("id,name,category,description,flavor_profile,intensity,price,image_url,active")
          .eq("active", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        rawProducts = data ?? [];
      }

      const filteredList: Product[] = [];

      for (const p of rawProducts) {
        const inventoriesList: CityInventory[] = Array.isArray(p.product_city_inventories)
          ? p.product_city_inventories
          : [];

        const invMap: Record<string, CityInventory> = {};
        for (const inv of inventoriesList) {
          invMap[inv.city_id] = {
            ...inv,
            price: Number(inv.price),
            stock: Number(inv.stock),
          };
        }

        // Se existem inventários registrados no banco para este produto
        if (inventoriesList.length > 0) {
          const cityInv = invMap[targetCity];
          // Se o produto não tiver inventário para esta cidade ou estiver inativo nela, não exibe
          if (!cityInv || cityInv.active === false) {
            continue;
          }

          filteredList.push({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            flavor_profile: p.flavor_profile,
            intensity: p.intensity,
            price: Number(cityInv.price),
            stock: Number(cityInv.stock),
            image_url: p.image_url,
            city_id: targetCity,
            inventories: invMap,
          });
        } else {
          // Fallback seguro: se ainda não houver inventário por cidade, atribui 15 unidades padrão
          filteredList.push({
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            flavor_profile: p.flavor_profile,
            intensity: p.intensity,
            price: Number(p.price),
            stock: 15,
            image_url: p.image_url,
            city_id: targetCity,
            inventories: {
              cuiaba: { city_id: "cuiaba", price: Number(p.price), stock: 15, active: true },
              "sao-paulo": { city_id: "sao-paulo", price: Number(p.price), stock: 15, active: true },
            },
          });
        }
      }

      // Aplica destaques (Lançamento / Promoção) e ordenação personalizada configurados no painel
      const settings = getStoreSettings();
      const productBadges = settings.productBadges || {};
      const productPromoPrices = settings.productPromoPrices || {};
      const productOrder = Array.isArray(settings.productOrder) ? settings.productOrder : [];

      const enrichedList: Product[] = filteredList.map((p) => {
        const badge = productBadges[p.id] || "nenhum";
        const promoPrice = productPromoPrices[p.id];
        return {
          ...p,
          badge,
          promo_price: promoPrice && promoPrice > 0 ? promoPrice : undefined,
        };
      });

      // Ordenação customizada: respeita a sequência de IDs definida no painel
      if (productOrder.length > 0) {
        enrichedList.sort((a, b) => {
          const indexA = productOrder.indexOf(a.id);
          const indexB = productOrder.indexOf(b.id);
          const posA = indexA !== -1 ? indexA : 9999;
          const posB = indexB !== -1 ? indexB : 9999;
          if (posA !== posB) return posA - posB;
          return a.name.localeCompare(b.name);
        });
      }

      return enrichedList;
    },
  });
}

/**
 * Foto do produto: o catálogo guarda tanto uma URL completa quanto um caminho
 * do espaço de armazenamento privado, que precisa de uma URL assinada.
 */
export async function resolveProductImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:")) return imageUrl;

  // Se for uma URL do Supabase Storage no bucket products ou caminho relativo
  const supabaseStorageMatch = imageUrl.match(
    /\/storage\/v1\/object\/(?:public|sign|authenticated)\/products\/([^?]+)/
  );
  const storagePath = supabaseStorageMatch
    ? decodeURIComponent(supabaseStorageMatch[1])
    : (!imageUrl.startsWith("http") ? imageUrl : null);

  if (storagePath) {
    try {
      const { data, error } = await supabase.storage
        .from("products")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 5); // 5 anos

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      // continua para fallback
    }
  }

  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  return null;
}

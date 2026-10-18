import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getStoreSettings, SYSTEM_SETTINGS_CATEGORY } from "@/lib/store-settings";

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
  active?: boolean;
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
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
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
          rawProducts = (data ?? []).filter((p: any) => p.category !== SYSTEM_SETTINGS_CATEGORY);
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
        rawProducts = (data ?? []).filter((p: any) => p.category !== SYSTEM_SETTINGS_CATEGORY);
      }

      const settings = getStoreSettings();
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

          const cleanCategory = (p.category || "").trim().toLowerCase().startsWith("pod")
            ? "Pod Descartável"
            : (p.category || "").trim();

          filteredList.push({
            id: p.id,
            name: (p.name || "").trim(),
            category: cleanCategory,
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
          // Fallback dinâmico: verifica se o administrador definiu estoque/preço por cidade nas configurações
          const cityOverride = settings.cityInventories?.[p.id]?.[targetCity];
          if (cityOverride && cityOverride.active === false) {
            continue;
          }

          const cityPrice =
            cityOverride?.price !== undefined ? Number(cityOverride.price) : Number(p.price);
          const cityStock =
            cityOverride?.stock !== undefined ? Number(cityOverride.stock) : 15;

          const cuiabaOverride = settings.cityInventories?.[p.id]?.cuiaba;
          const spOverride = settings.cityInventories?.[p.id]?.["sao-paulo"];

          const cleanCategory = (p.category || "").trim().toLowerCase().startsWith("pod")
            ? "Pod Descartável"
            : (p.category || "").trim();

          filteredList.push({
            id: p.id,
            name: (p.name || "").trim(),
            category: cleanCategory,
            description: p.description,
            flavor_profile: p.flavor_profile,
            intensity: p.intensity,
            price: cityPrice,
            stock: cityStock,
            image_url: p.image_url,
            city_id: targetCity,
            inventories: {
              cuiaba: {
                city_id: "cuiaba",
                price: cuiabaOverride?.price !== undefined ? Number(cuiabaOverride.price) : Number(p.price),
                stock: cuiabaOverride?.stock !== undefined ? Number(cuiabaOverride.stock) : 15,
                active: cuiabaOverride?.active !== undefined ? cuiabaOverride.active : true,
              },
              "sao-paulo": {
                city_id: "sao-paulo",
                price: spOverride?.price !== undefined ? Number(spOverride.price) : Number(p.price),
                stock: spOverride?.stock !== undefined ? Number(spOverride.stock) : 15,
                active: spOverride?.active !== undefined ? spOverride.active : true,
              },
            },
          });
        }
      }

      // Aplica destaques (Lançamento / Promoção) e ordenação personalizada configurados no painel
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

      // Ordenação: se há productOrder definida nas configurações, segue rigorosamente
      if (productOrder.length > 0) {
        enrichedList.sort((a, b) => {
          const indexA = productOrder.indexOf(a.id);
          const indexB = productOrder.indexOf(b.id);
          const posA = indexA !== -1 ? indexA : 9999;
          const posB = indexB !== -1 ? indexB : 9999;
          if (posA !== posB) return posA - posB;
          return a.name.localeCompare(b.name);
        });
      } else {
        // Padrão: Pods primeiro, depois Essências, Kits e Acessórios
        const categoryPriority: Record<string, number> = {
          "Pod Descartável": 1,
          "Pod descartável": 1,
          "Essência": 2,
          "Kit": 3,
          "Acessório": 4,
        };
        enrichedList.sort((a, b) => {
          const prioA = categoryPriority[a.category] ?? 10;
          const prioB = categoryPriority[b.category] ?? 10;
          if (prioA !== prioB) return prioA - prioB;
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

/**
 * Consulta de produto individual: busca dados detalhados diretamente do Supabase,
 * sincronizando inventários por cidade, estoque, preços e destaques.
 */
export function singleProductQueryOptions(productId: string, cityId?: "cuiaba" | "sao-paulo" | null) {
  const targetCity = cityId || "cuiaba";

  return queryOptions({
    queryKey: ["product", productId, targetCity],
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Product | null> => {
      if (!productId) return null;

      let p: any = null;

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
          .eq("id", productId)
          .maybeSingle();

        if (!error && data) {
          p = data;
        } else if (error) {
          throw error;
        }
      } catch {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,category,description,flavor_profile,intensity,price,image_url,active")
          .eq("id", productId)
          .maybeSingle();

        if (error) throw error;
        p = data;
      }

      if (!p) return null;

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

      const settings = getStoreSettings();
      const cityOverride = settings.cityInventories?.[p.id]?.[targetCity];

      let stock = 15;
      let price = Number(p.price);
      let isCityActive = true;

      if (inventoriesList.length > 0) {
        const cityInv = invMap[targetCity];
        stock = cityInv ? Number(cityInv.stock) : 15;
        price = cityInv ? Number(cityInv.price) : Number(p.price);
        isCityActive = cityInv ? cityInv.active !== false : true;
      } else if (cityOverride) {
        stock = cityOverride.stock !== undefined ? Number(cityOverride.stock) : 15;
        price = cityOverride.price !== undefined ? Number(cityOverride.price) : Number(p.price);
        isCityActive = cityOverride.active !== false;
      }

      const productBadges = settings.productBadges || {};
      const productPromoPrices = settings.productPromoPrices || {};

      const badge = productBadges[p.id] || "nenhum";
      const promoPrice = productPromoPrices[p.id];

      const cleanCategory = (p.category || "").trim().toLowerCase().startsWith("pod")
        ? "Pod Descartável"
        : (p.category || "").trim();

      return {
        id: p.id,
        name: (p.name || "").trim(),
        category: cleanCategory,
        description: p.description,
        flavor_profile: p.flavor_profile,
        intensity: p.intensity,
        price,
        stock,
        image_url: p.image_url,
        city_id: targetCity,
        inventories: invMap,
        badge,
        promo_price: promoPrice && promoPrice > 0 ? promoPrice : undefined,
        active: p.active && isCityActive,
      };
    },
  });
}


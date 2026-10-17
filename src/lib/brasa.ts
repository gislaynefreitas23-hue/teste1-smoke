import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

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

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  flavor_profile: string;
  intensity: string;
  price: number;
  image_url: string;
  stock?: number;
  city_id?: "cuiaba" | "sao-paulo";
  inventories?: Record<string, CityInventory>;
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

      return filteredList;
    },
  });
}

/**
 * Foto do produto: o catálogo guarda tanto uma URL completa quanto um caminho
 * do espaço de armazenamento privado, que precisa de uma URL assinada.
 */
export async function resolveProductImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const { data, error } = await supabase.storage
    .from("products")
    .createSignedUrl(imageUrl, 60 * 60 * 24 * 7);

  if (error) return null;
  return data?.signedUrl ?? null;
}

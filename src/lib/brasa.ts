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

export const DEFAULT_CATALOG_FALLBACK: Product[] = [
  {
    id: "055e851d-e131-41c4-bbb5-6e358c2e719b",
    name: "EBCREATE BC Pro 40K - Aurora Berries",
    category: "Pod Descartável",
    description: "Fusão equilibrada de amoras silvestres e framboesas com toque refrescante de menta gelada.",
    flavor_profile: "Frutado Ice",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "be4c4ce8-cd8f-4a71-97ef-b6c0775505ff",
    name: "EBCREATE BC Pro 40K - Pink Lemonade",
    category: "Pod Descartável",
    description: "Notas cítricas marcantes de limão siciliano harmonizadas com frutas vermelhas selecionadas.",
    flavor_profile: "Cítrico Ice",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "e8717cb6-9ceb-4997-9162-09e08fbefb41",
    name: "EBCREATE BC Pro 40K - Golden Berry",
    category: "Pod Descartável",
    description: "Explosão tropical de frutas amarelas e physalis com toque refrescante marcante.",
    flavor_profile: "Tropical",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "9739d60d-33e4-4540-8d0b-2bdeda2cae86",
    name: "EBCREATE BC Pro 40K – Pineapple Toasted",
    category: "Pod Descartável",
    description: "Perfil tropical exclusivo com nuances doces e tostadas de abacaxi maduro.",
    flavor_profile: "Doce Tropical",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "1eeb97e8-5f52-48a4-9847-cd62daf9b37f",
    name: "EBCREATE BC Pro 40K - Triple Berry",
    category: "Pod Descartável",
    description: "Mix triplo de mirtilo, amora e framboesa com finalização gelada refinada.",
    flavor_profile: "Frutas Vermelhas",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "5ba5cdd1-7b6f-4486-81b1-90e30a5a9b5d",
    name: "EBCREATE BC Pro 40K - Clear",
    category: "Pod Descartável",
    description: "Sabor puro e cristalino de menta ultra-refrescante sem notas doces residuais.",
    flavor_profile: "Menta Pura",
    intensity: "Super Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "9c924bf4-e909-470a-b4f2-3038cab03dd7",
    name: "EBCREATE BC Pro 40K - F*cking Fab",
    category: "Pod Descartável",
    description: "Combinação misteriosa e sofisticada de frutas tropicais e doces refinados.",
    flavor_profile: "Frutado Doce",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "06d6bbb2-7bdb-41e2-a822-d6ee17f5dc56",
    name: "EBCREATE BC Pro 40K - Sour Apple Ice",
    category: "Pod Descartável",
    description: "Maçã verde ácida e gelada com vapor denso e sensação refrescante contínua.",
    flavor_profile: "Maçã Verde Ice",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "e9cea634-18df-4035-a943-20b748a547fa",
    name: "EBCREATE BC Pro 40K - Blue Razz Ice",
    category: "Pod Descartável",
    description: "Framboesa azul vibrante com acabamento mentolado denso e marcante.",
    flavor_profile: "Framboesa Azul",
    intensity: "Forte",
    price: 89.9,
    image_url: "",
    stock: 15,
    badge: "lancamento",
  },
  {
    id: "bccf273e-75a9-460f-8042-58a692e87051",
    name: "Essência Lemon Ice 50g",
    category: "Essência",
    description: "Sabor limão cítrico com frescor marcante para sessões longas.",
    flavor_profile: "Cítrico Ice",
    intensity: "Média",
    price: 49.9,
    image_url: "",
    stock: 15,
  },
  {
    id: "3c913c54-8d55-4122-b659-741234fc2e38",
    name: "Essência Tobacco Mild 50g",
    category: "Essência",
    description: "Tabaco suave selecionado para paladares tradicionais e clássicos.",
    flavor_profile: "Tabaco Suave",
    intensity: "Média",
    price: 54.9,
    image_url: "",
    stock: 15,
  },
  {
    id: "df7dcb3f-020d-4dac-ac91-dde649121141",
    name: "Essência Uva Doce 50g",
    category: "Essência",
    description: "Uva roxa madura, doce e encorpada de alta durabilidade.",
    flavor_profile: "Uva Doce",
    intensity: "Média",
    price: 44.9,
    image_url: "",
    stock: 15,
  },
  {
    id: "a6dccd91-da87-416a-9920-be5a2a7da5af",
    name: "Kit Inicial Completo",
    category: "Kit",
    description: "Kit completo com tudo que você precisa para começar com o melhor desempenho.",
    flavor_profile: "Completo",
    intensity: "Alta",
    price: 429.0,
    image_url: "",
    stock: 10,
  },
  {
    id: "63cbeb32-9917-40ec-92e4-ae1a72e20de6",
    name: "Kit Viagem Essencial",
    category: "Kit",
    description: "Compacto e prático para transportar com segurança em qualquer lugar.",
    flavor_profile: "Portátil",
    intensity: "Alta",
    price: 219.0,
    image_url: "",
    stock: 10,
  },
  {
    id: "2aa90b87-6e02-40f6-92c6-dcabd0192af9",
    name: "Mangueira de Couro com Ponta de Madeira",
    category: "Acessório",
    description: "Acabamento premium artesanal com fluxo contínuo e vedação perfeita.",
    flavor_profile: "Artesanal",
    intensity: "Resistente",
    price: 89.9,
    image_url: "",
    stock: 15,
  },
  {
    id: "70bbbf3e-0e96-4950-b5b7-f36c3025256a",
    name: "Piteira de Silicone Lavável",
    category: "Acessório",
    description: "Silicone atóxico grau medicinal, lavável e higiênico para uso diário.",
    flavor_profile: "Higienizada",
    intensity: "Durável",
    price: 34.9,
    image_url: "",
    stock: 20,
  },
  {
    id: "09497721-968b-4993-ace8-a8462484edff",
    name: "Trava de Tela com Molas em Inox",
    category: "Acessório",
    description: "Segurança e encaixe milimétrico para suportes e carvão.",
    flavor_profile: "Inox",
    intensity: "Alta",
    price: 24.9,
    image_url: "",
    stock: 25,
  },
];

export function getLocalCachedProducts(cityId: string): Product[] {
  if (typeof window === "undefined") return DEFAULT_CATALOG_FALLBACK;
  try {
    const raw = localStorage.getItem(`ps_products_cache_${cityId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignora
  }
  return DEFAULT_CATALOG_FALLBACK;
}

/** Catálogo público: só produtos ativos e disponíveis na cidade selecionada. */
export function productsQueryOptions(cityId?: "cuiaba" | "sao-paulo" | null) {
  const targetCity = cityId || "cuiaba";

  return queryOptions({
    queryKey: ["products", targetCity],
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Product[]> => {
      let rawProducts: any[] = [];

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,category,description,flavor_profile,intensity,price,image_url,active")
          .eq("active", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (!error && data) {
          rawProducts = (data ?? []).filter((p: any) => p.category !== SYSTEM_SETTINGS_CATEGORY);
        } else if (error) {
          throw error;
        }
      } catch (fetchErr) {
        console.warn("Aviso ao consultar Supabase, utilizando cache seguro de produtos:", fetchErr);
        const cached = getLocalCachedProducts(targetCity);
        if (cached && cached.length > 0) {
          return cached;
        }
        throw fetchErr;
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

      if (typeof window !== "undefined" && enrichedList.length > 0) {
        try {
          localStorage.setItem(`ps_products_cache_${targetCity}`, JSON.stringify(enrichedList));
        } catch {
          // ignora erro de quota do storage
        }
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
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Product | null> => {
      if (!productId) return null;

      let p: any = null;

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,category,description,flavor_profile,intensity,price,image_url,active")
          .eq("id", productId)
          .maybeSingle();

        if (!error && data) {
          p = data;
        } else if (error) {
          throw error;
        }
      } catch (err) {
        console.warn("Aviso ao buscar produto no Supabase, consultando cache:", err);
        const cached = getLocalCachedProducts(targetCity).find((prod) => prod.id === productId);
        if (cached) return cached;
        throw err;
      }

      if (!p) {
        const cached = getLocalCachedProducts(targetCity).find((prod) => prod.id === productId);
        return cached || null;
      }

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


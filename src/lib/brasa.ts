import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const SITE_NAME = "Pantanal Smoke";

/** Número que recebe os pedidos no WhatsApp (formato internacional, sem +). */
export const WHATSAPP_NUMBER = "5565999210066";

/** Percentual devolvido em cashback quando a loja confirma a entrega. */
export const CASHBACK_RATE = 0.05;

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

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  flavor_profile: string;
  intensity: string;
  price: number;
  image_url: string;
};

/** Catálogo público: só produtos ativos, na mesma ordem da vitrine. */
export function productsQueryOptions() {
  return queryOptions({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,description,flavor_profile,intensity,price,image_url")
        .eq("active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Product[];
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

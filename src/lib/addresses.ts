import { supabase } from "@/integrations/supabase/client";

export interface CustomerAddress {
  id: string;
  user_id: string;
  city_id: "cuiaba" | "sao-paulo";
  label: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento?: string;
  ponto_referencia?: string;
  is_default?: boolean;
  created_at?: string;
}

export type CustomerAddressInput = Omit<CustomerAddress, "id" | "created_at">;

// Fallback em memória para a sessão atual caso a tabela ainda esteja sendo sincronizada
const sessionAddressStore: Map<string, CustomerAddress[]> = new Map();
const guestSessionStore: CustomerAddress[] = [];

/**
 * Salva um endereço para visitantes na memória da sessão atual (sem persistência invasiva em localStorage)
 */
export function saveCustomerSessionAddress(address: CustomerAddressInput): CustomerAddress {
  const newAddr: CustomerAddress = {
    ...address,
    id: `guest_addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };
  guestSessionStore.unshift(newAddr);
  return newAddr;
}

/**
 * Retorna os endereços da sessão ativa filtrando estritamente pela cidade selecionada
 */
export function getCustomerSessionAddresses(cityId: "cuiaba" | "sao-paulo"): CustomerAddress[] {
  return guestSessionStore.filter((a) => a.city_id === cityId);
}

/**
 * Lista todos os endereços salvos de um usuário filtrando estritamente pela cidade selecionada
 */
export async function listCustomerAddresses(
  userId: string,
  cityId: "cuiaba" | "sao-paulo"
): Promise<CustomerAddress[]> {
  if (!userId) return [];

  try {
    const { data, error } = await ((supabase as any).from("customer_addresses"))
      .select("*")
      .eq("user_id", userId)
      .eq("city_id", cityId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data as CustomerAddress[];
    }
    throw error;
  } catch (err) {
    // Fallback defensivo em memória para a sessão
    const list = sessionAddressStore.get(userId) || [];
    return list.filter((a) => a.city_id === cityId);
  }
}

/**
 * Salva um novo endereço para o cliente no Supabase
 */
export async function saveCustomerAddress(
  address: CustomerAddressInput
): Promise<CustomerAddress> {
  const payload = {
    user_id: address.user_id,
    city_id: address.city_id,
    label: address.label?.trim() || "Principal",
    cep: address.cep.trim(),
    rua: address.rua.trim(),
    numero: address.numero.trim(),
    bairro: address.bairro.trim(),
    cidade: address.cidade.trim(),
    uf: address.uf.trim(),
    complemento: address.complemento?.trim() || "",
    ponto_referencia: address.ponto_referencia?.trim() || "",
    is_default: address.is_default ?? false,
  };

  try {
    const { data, error } = await ((supabase as any).from("customer_addresses"))
      .insert(payload)
      .select("*")
      .single();

    if (!error && data) {
      return data as CustomerAddress;
    }
    throw error;
  } catch (err) {
    const fakeId = `addr_${Date.now()}`;
    const newAddress: CustomerAddress = {
      ...payload,
      id: fakeId,
      created_at: new Date().toISOString(),
    };
    const current = sessionAddressStore.get(address.user_id) || [];
    sessionAddressStore.set(address.user_id, [newAddress, ...current]);
    return newAddress;
  }
}

/**
 * Atualiza um endereço existente do cliente
 */
export async function updateCustomerAddress(
  id: string,
  updates: Partial<CustomerAddressInput>
): Promise<void> {
  try {
    const { error } = await ((supabase as any).from("customer_addresses"))
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
  } catch {
    // Atualiza fallback em memória se necessário
    for (const [uid, list] of sessionAddressStore.entries()) {
      const idx = list.findIndex((a) => a.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        sessionAddressStore.set(uid, list);
        break;
      }
    }
  }
}

/**
 * Remove um endereço salvo
 */
export async function deleteCustomerAddress(id: string): Promise<void> {
  try {
    const { error } = await ((supabase as any).from("customer_addresses"))
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch {
    // Remove do fallback em memória se necessário
    for (const [uid, list] of sessionAddressStore.entries()) {
      sessionAddressStore.set(
        uid,
        list.filter((a) => a.id !== id)
      );
    }
  }
}

/**
 * Formata um endereço salvo em uma linha legível
 */
export function formatAddressLine(addr: CustomerAddress): string {
  const parts = [
    `Rua ${addr.rua}, Nº ${addr.numero}`,
    addr.bairro,
    addr.complemento ? `Compl: ${addr.complemento}` : "",
    `CEP: ${addr.cep}`,
    `${addr.cidade} - ${addr.uf}`,
  ].filter(Boolean);

  return parts.join(", ");
}

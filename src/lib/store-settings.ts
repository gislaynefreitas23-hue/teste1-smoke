import { useEffect, useState } from "react";
import auroraImg from "@/assets/banner-aurora-berries.png";
import pinkLemonadeImg from "@/assets/banner-pink-lemonade.png";
import toastedPineappleImg from "@/assets/banner-toasted-pineapple.png";
import { supabase } from "@/integrations/supabase/client";

export interface BannerSlide {
  id: string;
  badge: string;
  title: string;
  puffs: string;
  footerPhrase: string;
  imageUrl: string;
  active: boolean;
  order: number;
}

export interface StoreSettings {
  siteName: string;
  slogan: string;
  whatsappNumber: string;
  whatsappMessage: string;
  deliveryFeeCuiaba: number;
  cashbackRate: number;
  cashbackTitle: string;
  cashbackDescription: string;
  openingHours: string;
  announcementActive: boolean;
  announcementText: string;
  banners: BannerSlide[];
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  siteName: "Pantanal Smoke",
  slogan: "Conecte-se à sua vibe.",
  whatsappNumber: "5565999210066",
  whatsappMessage: "Olá! Gostaria de fazer um pedido.",
  deliveryFeeCuiaba: 10.0,
  cashbackRate: 0.05,
  cashbackTitle: "Cashback na sua próxima compra",
  cashbackDescription:
    "Entre na sua conta com seu e-mail e receba 5% do valor do seu pedido em cashback para usar na próxima compra.",
  openingHours: "Atendimento das 10h às 19h",
  announcementActive: true,
  announcementText: "Entrega com taxa fixa de R$ 10,00 para toda a cidade de Cuiabá",
  banners: [
    {
      id: "slide-1",
      badge: "LANÇAMENTO",
      title: "Aurora Berries",
      puffs: "40.000 PUFFS",
      footerPhrase: "Consistência de Sabor de Alta Performance",
      imageUrl: auroraImg,
      active: true,
      order: 1,
    },
    {
      id: "slide-2",
      badge: "LANÇAMENTO",
      title: "Pink Lemonade",
      puffs: "40.000 PUFFS",
      footerPhrase: "Gerenciamento de Potência e Autonomia Estendida",
      imageUrl: pinkLemonadeImg,
      active: true,
      order: 2,
    },
    {
      id: "slide-3",
      badge: "LANÇAMENTO",
      title: "Toasted Pineapple",
      puffs: "40.000 PUFFS",
      footerPhrase: "Design Funcional com Visibilidade de Essência",
      imageUrl: toastedPineappleImg,
      active: true,
      order: 3,
    },
  ],
};

const SETTINGS_STORAGE_KEY = "pantanal_store_settings";
const SETTINGS_EVENT_NAME = "pantanal_store_settings_updated";

/**
 * Lê configurações salvas (localStorage com fallback para padrões)
 */
export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") {
    return DEFAULT_STORE_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_STORE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STORE_SETTINGS,
      ...parsed,
      banners: Array.isArray(parsed.banners) && parsed.banners.length > 0
        ? parsed.banners
        : DEFAULT_STORE_SETTINGS.banners,
    };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

/**
 * Salva as novas configurações da loja e dispara sincronização
 */
export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT_NAME, { detail: settings }));

    // Tenta persistir no Supabase se houver tabela configurada
    try {
      await supabase.from("store_settings" as any).upsert({
        key: "general",
        value: settings,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Falha silenciosa no banco se a tabela não estiver criada
    }
  } catch (err) {
    console.error("Erro ao salvar configurações:", err);
  }
}

/**
 * Hook React reativo para usar as configurações da loja em qualquer página
 */
export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(getStoreSettings());

  useEffect(() => {
    // Sincroniza do banco no carregamento
    async function fetchRemote() {
      try {
        const { data } = await supabase
          .from("store_settings" as any)
          .select("value")
          .eq("key", "general")
          .maybeSingle();

        if (data && (data as any).value) {
          const merged = { ...DEFAULT_STORE_SETTINGS, ...(data as any).value };
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          setSettings(merged);
        }
      } catch {
        // Usa local se remoto não responder
      }
    }

    fetchRemote();

    function handleUpdate(e: Event) {
      if ((e as CustomEvent).detail) {
        setSettings((e as CustomEvent).detail);
      } else {
        setSettings(getStoreSettings());
      }
    }

    window.addEventListener(SETTINGS_EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return {
    settings,
    saveSettings: saveStoreSettings,
  };
}

// ==========================================
// AUTENTICAÇÃO ADMINISTRATIVA (ADMIN AUTH)
// ==========================================
export const ADMIN_CONFIG = {
  email: "gislaynefreitas23@gmail.com",
  password: "tabacariasmoke2522",
};

const ADMIN_SESSION_KEY = "pantanal_admin_auth_session";

export interface AdminSession {
  email: string;
  authenticatedAt: string;
  role: "admin";
}

export function checkAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session: AdminSession = JSON.parse(raw);
    return session.email.toLowerCase() === ADMIN_CONFIG.email.toLowerCase();
  } catch {
    return false;
  }
}

export function loginAdmin(emailInput: string, passwordInput: string): boolean {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (
    cleanEmail === ADMIN_CONFIG.email.toLowerCase() &&
    cleanPassword === ADMIN_CONFIG.password
  ) {
    const session: AdminSession = {
      email: ADMIN_CONFIG.email,
      authenticatedAt: new Date().toISOString(),
      role: "admin",
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event("pantanal_admin_auth_changed"));
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event("pantanal_admin_auth_changed"));
}

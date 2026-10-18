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
  homeHighlightPhrase: string;
  benefitCardTitle: string;
  benefitCardDescription: string;
  footerTagline: string;
  footerContactText: string;
  banners: BannerSlide[];

  // Conteúdos Institucionais (Sobre Nós & Perguntas Frequentes)
  aboutUsTitle: string;
  aboutUsParagraph1: string;
  aboutUsParagraph2: string;
  aboutUsParagraph3: string;
  aboutUsBrandPhrase: string;

  faqTitle: string;
  faqSubtitle: string;
  faqs: FAQSettingItem[];

  // Destaques e Ordenação de Produtos
  productBadges: Record<string, "nenhum" | "lancamento" | "promocao">;
  productPromoPrices: Record<string, number>;
  productOrder: string[];
  cityInventories?: Record<
    string,
    {
      cuiaba?: { price: number; stock: number; active: boolean };
      "sao-paulo"?: { price: number; stock: number; active: boolean };
    }
  >;
}

export interface FAQSettingItem {
  id: string;
  question: string;
  answer: string;
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
  homeHighlightPhrase: "Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra.",
  benefitCardTitle: "100% Online, Estoque Local",
  benefitCardDescription: "Compre online com praticidade e receba seus produtos no conforto de casa, no mesmo dia.",
  footerTagline: "De Cuiabá a São Paulo, conectando vibes.",
  footerContactText: "Dúvidas ou pedidos? Fale com a gente pelo",
  aboutUsTitle: "Sobre Nós",
  aboutUsParagraph1:
    "A Pantanal Smoke nasceu da visão de três empreendedores de Cuiabá que, vivendo em São Paulo, identificaram uma oportunidade de transformar a experiência de compra nas duas cidades.",
  aboutUsParagraph2:
    "Em Cuiabá, nosso propósito é oferecer mais variedade, qualidade e preços justos. Em São Paulo, buscamos facilitar o acesso aos produtos, com entregas práticas e gratuitas em diversos bairros.",
  aboutUsParagraph3:
    "Mais do que vender, queremos proporcionar conveniência, variedade e uma experiência diferenciada a cada cliente.",
  aboutUsBrandPhrase: "Pantanal Smoke — Conecte a sua vibe.",
  faqTitle: "Perguntas Frequentes",
  faqSubtitle: "Tire suas dúvidas e compre com mais tranquilidade.",
  faqs: [
    {
      id: "loja-fisica",
      question: "A Pantanal Smoke possui loja física?",
      answer: "Não! Somos uma loja 100% online, com atendimento em Cuiabá e São Paulo.",
    },
    {
      id: "como-funciona-entrega",
      question: "Como funciona a entrega?",
      answer:
        "Em Cuiabá, a taxa de entrega é fixa de R$ 10. Em São Paulo, oferecemos entrega grátis em diversos bairros da cidade. Consulte a disponibilidade para sua região.",
    },
    {
      id: "pedido-mesmo-dia",
      question: "Meu pedido chega no mesmo dia?",
      answer:
        "Trabalhamos com entregas no mesmo dia, conforme a disponibilidade, o horário do pedido e a região atendida.",
    },
    {
      id: "pagar-na-entrega",
      question: "Posso pagar na entrega?",
      answer:
        "Sim! Na Pantanal Smoke, você pode pagar somente quando receber seu pedido, garantindo mais segurança, praticidade e tranquilidade na sua compra.",
    },
    {
      id: "cashback-5-porcento",
      question: "Como funciona o cashback de 5%?",
      answer:
        "A cada compra elegível, você acumula 5% do valor em cashback para utilizar nas próximas compras, conforme as regras do cashback.",
    },
  ],
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
  productBadges: {},
  productPromoPrices: {},
  productOrder: [],
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
      productBadges: parsed.productBadges || {},
      productPromoPrices: parsed.productPromoPrices || {},
      productOrder: Array.isArray(parsed.productOrder) ? parsed.productOrder : [],
    };
  } catch {
    return DEFAULT_STORE_SETTINGS;
  }
}

export const SYSTEM_SETTINGS_CATEGORY = "_system_settings";

/**
 * Salva as configurações em cache local e emite evento para atualização imediata na tela
 */
export function saveStoreSettingsLocally(settings: StoreSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT_NAME, { detail: settings }));
  } catch (err) {
    console.error("Erro ao salvar configurações localmente:", err);
  }
}

/**
 * Busca as configurações da loja salvas na nuvem (Supabase)
 */
export async function fetchRemoteStoreSettings(): Promise<StoreSettings | null> {
  // 1. Tenta a tabela dedicada store_settings caso tenha sido criada
  try {
    const { data, error } = await (supabase as any)
      .from("store_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle();

    if (!error && data && (data as any).value) {
      const merged: StoreSettings = { ...DEFAULT_STORE_SETTINGS, ...(data as any).value };
      saveStoreSettingsLocally(merged);
      return merged;
    }
  } catch {
    // continua para o fallback
  }

  // 2. Fallback de alta disponibilidade: registro de sistema na tabela products
  try {
    const query = supabase.from("products").select("description");
    if (typeof (query as any)?.eq === "function") {
      const { data, error } = await (query as any)
        .eq("category", SYSTEM_SETTINGS_CATEGORY)
        .eq("active", true)
        .maybeSingle();

      if (!error && data?.description) {
        const parsed = JSON.parse(data.description);
        const merged: StoreSettings = {
          ...DEFAULT_STORE_SETTINGS,
          ...parsed,
          banners:
            Array.isArray(parsed.banners) && parsed.banners.length > 0
              ? parsed.banners
              : DEFAULT_STORE_SETTINGS.banners,
          productBadges: parsed.productBadges || {},
          productPromoPrices: parsed.productPromoPrices || {},
          productOrder: Array.isArray(parsed.productOrder) ? parsed.productOrder : [],
        };
        saveStoreSettingsLocally(merged);
        return merged;
      }
    }
  } catch {
    // Fallback silencioso
  }

  return null;
}

/**
 * Salva as novas configurações da loja na nuvem e no dispositivo local,
 * disparando a sincronização em tempo real para todos os clientes.
 */
export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  saveStoreSettingsLocally(settings);

  // 1. Tenta persistir na tabela store_settings se existir
  try {
    const table = (supabase as any).from("store_settings");
    if (typeof table?.upsert === "function") {
      const { error: dedicatedError } = await table.upsert({
        key: "general",
        value: settings,
        updated_at: new Date().toISOString(),
      });
      if (!dedicatedError) return;
    }
  } catch {
    // continua para fallback
  }

  // 2. Persiste com segurança na tabela products na linha reservada de sistema
  try {
    const selectQuery = supabase.from("products").select("id");
    let existingRow: { id: string } | null = null;

    if (typeof (selectQuery as any)?.eq === "function") {
      const { data } = await (selectQuery as any)
        .eq("category", SYSTEM_SETTINGS_CATEGORY)
        .maybeSingle();
      existingRow = data;
    }

    const payload = {
      name: "Configurações Globais Pantanal Smoke",
      category: SYSTEM_SETTINGS_CATEGORY,
      description: JSON.stringify(settings),
      price: 0,
      active: true,
      image_url: "",
      flavor_profile: "system",
      intensity: "system",
    };

    if (existingRow?.id) {
      await supabase.from("products").update(payload).eq("id", existingRow.id);
    } else {
      await supabase.from("products").insert(payload);
    }
  } catch {
    // Fallback silencioso caso ambiente offline ou mock restrito
  }
}

/**
 * Hook React reativo para usar as configurações da loja em qualquer página com sincronização contínua
 */
export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(getStoreSettings());

  useEffect(() => {
    // Busca remota inicial
    fetchRemoteStoreSettings().then((remote) => {
      if (remote) setSettings(remote);
    });

    // Polling a cada 4 segundos como garantia de atualização contínua em tempo real
    const interval = setInterval(() => {
      fetchRemoteStoreSettings().then((remote) => {
        if (remote) setSettings(remote);
      });
    }, 4000);

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
      clearInterval(interval);
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
// AUTENTICAÇÃO ADMINISTRATIVA SEGURA (SUPABASE AUTH)
// ==========================================
export const ADMIN_CONFIG = {
  email: "gislaynefreitas23@gmail.com",
};

/**
 * Verifica se determinado usuário autenticado possui a função de administrador no banco de dados.
 * Valida de forma segura usando a RPC has_role ou consultando diretamente a tabela user_roles.
 */
export async function verifyUserIsAdmin(userId?: string): Promise<boolean> {
  try {
    let targetUid = userId;
    if (!targetUid) {
      const { data: authData } = await supabase.auth.getUser();
      targetUid = authData.user?.id;
    }

    if (!targetUid) return false;

    // 1. Tenta a função segura has_role do Supabase
    try {
      const { data: hasRoleData, error: rpcError } = await (supabase as any).rpc("has_role", {
        _user_id: targetUid,
        _role: "admin",
      });

      if (!rpcError && typeof hasRoleData === "boolean") {
        return hasRoleData;
      }
    } catch {
      // Ignora erro de RPC e tenta fallback direto
    }

    // 2. Fallback: consulta direta à tabela public.user_roles com RLS
    const { data: roleRow, error: tableError } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUid)
      .eq("role", "admin")
      .maybeSingle();

    if (!tableError && roleRow && roleRow.role === "admin") {
      return true;
    }

    return false;
  } catch (err) {
    console.error("Erro ao verificar permissão de administrador:", err);
    return false;
  }
}

/**
 * Verifica se a sessão atual do Supabase pertence a um administrador válido.
 * Não confia em chaves arbitrárias salvas no localStorage.
 */
export async function checkAdminSession(): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) return false;

    return await verifyUserIsAdmin(sessionData.session.user.id);
  } catch {
    return false;
  }
}

/**
 * Realiza login administrativo oficial usando Supabase Auth (signInWithPassword)
 * e garante que o usuário possui privilégios de administrador.
 */
export async function loginAdminWithSupabase(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: "Informe o e-mail e a senha de administrador." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || "Credenciais de administrador inválidas.",
      };
    }

    const isAdmin = await verifyUserIsAdmin(data.user.id);
    if (!isAdmin) {
      // Desconecta imediatamente para impedir permanência indevida
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Acesso negado: Este usuário não possui privilégios de administrador.",
      };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pantanal_admin_auth_changed"));
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro inesperado ao conectar ao serviço de autenticação.",
    };
  }
}

/**
 * Retorna o endereço correto para redirecionamento após recuperação de senha.
 * Prioriza VITE_SITE_URL se configurado, ou utiliza dinamicamente o endereço publicado/temporário
 * onde o administrador estiver acessando (ex: https://<projeto>.lovableproject.com/admin ou https://<app>.lovable.app/admin).
 */
export function getAdminRedirectUrl(): string {
  if (typeof window !== "undefined") {
    const customSiteUrl = (import.meta as any).env?.VITE_SITE_URL;
    if (customSiteUrl && typeof customSiteUrl === "string" && customSiteUrl.startsWith("http")) {
      return `${customSiteUrl.replace(/\/+$/, "")}/admin`;
    }
    return `${window.location.origin.replace(/\/+$/, "")}/admin`;
  }
  return "/admin";
}

/**
 * Solicita envio de e-mail de recuperação de senha pelo Supabase Auth.
 */
export async function requestAdminPasswordReset(
  emailInput: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Informe um e-mail válido para recuperação." };
    }

    const redirectUrl = getAdminRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao solicitar recuperação de senha.",
    };
  }
}

/**
 * Atualiza a senha do administrador autenticado ou após fluxo de recuperação.
 */
export async function updateAdminPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: "A nova senha deve possuir no mínimo 6 caracteres.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao redefinir a nova senha.",
    };
  }
}

/**
 * Desconecta a sessão administrativa do Supabase Auth de forma segura.
 */
export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Erro ao encerrar sessão administrativa:", err);
  } finally {
    if (typeof window !== "undefined") {
      // Limpa qualquer vestígio de sessão legada no localStorage
      localStorage.removeItem("pantanal_admin_auth_session");
      window.dispatchEvent(new Event("pantanal_admin_auth_changed"));
    }
  }
}


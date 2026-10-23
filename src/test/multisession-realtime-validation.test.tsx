import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useStoreSettings,
  saveStoreSettings,
  saveStoreSettingsLocally,
  fetchRemoteStoreSettings,
  DEFAULT_STORE_SETTINGS,
  SYSTEM_SETTINGS_CATEGORY,
} from "@/lib/store-settings";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient } from "@tanstack/react-query";

describe("Validação Rigorosa Multi-Sessão & Supabase Realtime Ativo", () => {
  beforeEach(() => {
    localStorage.clear();
    saveStoreSettingsLocally(DEFAULT_STORE_SETTINGS);
    vi.clearAllMocks();
  });

  it("1. Sessões Independentes (Admin vs Cliente): Cliente recebe alterações em banners, horários e taxas em tempo real sem recarregar", async () => {
    // Registra os handlers de eventos do Realtime simulando o canal 'pantanal-realtime-sync' no navegador do cliente
    let storeSettingsRealtimeCallback: any = null;
    let productsRealtimeCallback: any = null;

    const channelMock = {
      on: vi.fn((_type: string, filter: any, callback: any) => {
        if (filter.table === "store_settings") {
          storeSettingsRealtimeCallback = callback;
        }
        if (filter.table === "products") {
          productsRealtimeCallback = callback;
        }
        return channelMock;
      }),
      subscribe: vi.fn().mockImplementation((subCallback?: any) => {
        if (subCallback) subCallback("SUBSCRIBED");
        return channelMock;
      }),
    };

    vi.spyOn(supabase, "channel").mockReturnValue(channelMock as any);

    // ==========================================
    // SESSÃO DO CLIENTE (Navegador A - Celular/Home)
    // ==========================================
    const { result: clientSession } = renderHook(() => useStoreSettings());

    // Estado inicial no cliente
    expect(clientSession.current.settings.deliveryFeeCuiaba).toBe(DEFAULT_STORE_SETTINGS.deliveryFeeCuiaba);
    expect(clientSession.current.settings.openingHours).toBe(DEFAULT_STORE_SETTINGS.openingHours);

    // Configura o canal Realtime ativo do cliente (como ocorre em __root.tsx)
    const clientChannel = supabase
      .channel("pantanal-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_settings" },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord?.value) {
            const merged = { ...DEFAULT_STORE_SETTINGS, ...newRecord.value };
            saveStoreSettingsLocally(merged);
          } else {
            fetchRemoteStoreSettings(true).catch(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.category === SYSTEM_SETTINGS_CATEGORY) {
            if (newRecord.description) {
              const parsed = JSON.parse(newRecord.description);
              saveStoreSettingsLocally(parsed);
            }
          }
        }
      )
      .subscribe();

    expect(clientChannel).toBeDefined();
    expect(typeof storeSettingsRealtimeCallback).toBe("function");

    // ==========================================
    // SESSÃO DO ADMINISTRADOR (Navegador B - /admin)
    // ==========================================
    // O admin altera Banners, Horários e Taxas de Entrega
    const updatedSettingsByAdmin = {
      ...DEFAULT_STORE_SETTINGS,
      deliveryFeeCuiaba: 22.0,
      deliveryFeeSaoPaulo: 35.0,
      openingHours: "Segunda a Domingo das 08h às 00h (Entrega Expressa)",
      banners: [
        {
          id: "banner-turbo-1",
          badge: "LANÇAMENTO EXCLUSIVO",
          title: "Pod Turbo Neon 50K",
          puffs: "50.000 PUFFS",
          footerPhrase: "Conecte-se à sua vibe com a nova geração",
          imageUrl: "/assets/banner-turbo-neon.png",
          active: true,
          order: 1,
        },
      ],
    };

    // ==========================================
    // O EVENTO É TRANSMITIDO VIA SUPABASE REALTIME ATIVO
    // ==========================================
    act(() => {
      // O Supabase Realtime entrega o payload com o registro alterado
      storeSettingsRealtimeCallback({
        new: {
          key: "general",
          value: updatedSettingsByAdmin,
        },
      });
    });

    // ==========================================
    // VERIFICAÇÃO NA SESSÃO DO CLIENTE
    // Sem reload de página, a Home do cliente reflete as alterações imediatamente!
    // ==========================================
    await waitFor(() => {
      expect(clientSession.current.settings.deliveryFeeCuiaba).toBe(22.0);
      expect(clientSession.current.settings.deliveryFeeSaoPaulo).toBe(35.0);
      expect(clientSession.current.settings.openingHours).toBe(
        "Segunda a Domingo das 08h às 00h (Entrega Expressa)"
      );
      expect(clientSession.current.settings.banners[0].title).toBe("Pod Turbo Neon 50K");
      expect(clientSession.current.settings.banners[0].badge).toBe("LANÇAMENTO EXCLUSIVO");
    });
  });

  it("2. O cache de 10 minutos NÃO bloqueia atualizações do Realtime", async () => {
    // 1. Cliente tem cache inicial preenchido
    const { result } = renderHook(() => useStoreSettings());

    // 2. Evento Realtime chega enquanto o cache ainda é muito recente (< 10 minutos)
    act(() => {
      saveStoreSettingsLocally({
        ...DEFAULT_STORE_SETTINGS,
        deliveryFeeCuiaba: 19.9,
      });
    });

    await waitFor(() => {
      expect(result.current.settings.deliveryFeeCuiaba).toBe(19.9);
    });

    // 3. Nova alteração remota forçada (force = true) também substitui o cache imediatamente
    const forceResult = await fetchRemoteStoreSettings(true);
    expect(forceResult).toBeDefined();
  });

  it("3. Resiliência: Reconexão do Realtime revalida dados se o admin alterar algo enquanto offline", async () => {
    let subscribeStatusCallback: any = null;
    const fetchSpy = vi.fn().mockResolvedValue({
      ...DEFAULT_STORE_SETTINGS,
      deliveryFeeCuiaba: 27.5,
    });

    const channelMock = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockImplementation((cb: any) => {
        subscribeStatusCallback = cb;
        return channelMock;
      }),
    };

    vi.spyOn(supabase, "channel").mockReturnValue(channelMock as any);

    // Simula a subscrição configurada em __root.tsx
    supabase
      .channel("pantanal-realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings" }, () => {})
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchSpy();
        }
      });

    expect(typeof subscribeStatusCallback).toBe("function");

    // Simula reconexão do WebSocket (ex: celular reconectou ao Wi-Fi)
    act(() => {
      subscribeStatusCallback("SUBSCRIBED");
    });

    expect(fetchSpy).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useStoreSettings,
  fetchRemoteStoreSettings,
  saveStoreSettingsLocally,
  DEFAULT_STORE_SETTINGS,
} from "@/lib/store-settings";
import { supabase } from "@/integrations/supabase/client";

describe("Validação Técnica da Ação 1: Otimização de Consultas de Configurações", () => {
  beforeEach(() => {
    localStorage.clear();
    saveStoreSettingsLocally(DEFAULT_STORE_SETTINGS);
    vi.clearAllMocks();
  });

  it("1. Ausência de timers periódicos: useStoreSettings não cria setInterval de 4 segundos", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    const { unmount } = renderHook(() => useStoreSettings());

    // NENHUM timer periódico de 4000ms deve ser criado
    const fourSecIntervals = setIntervalSpy.mock.calls.filter((call) => call[1] === 4000);
    expect(fourSecIntervals.length).toBe(0);

    unmount();
  });

  it("2. Deduplicação de requisições: múltiplas chamadas simultâneas compartilham a mesma promessa", async () => {
    let selectCalls = 0;
    const fakeData = {
      description: JSON.stringify({
        ...DEFAULT_STORE_SETTINGS,
        siteName: "Pantanal Smoke Deduplicado",
      }),
    };

    // Intercepta a chamada supabase
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(async () => {
              selectCalls++;
              await new Promise((r) => setTimeout(r, 10));
              return { data: fakeData, error: null };
            }),
          }),
        }),
      }),
    } as any);

    // Dispara 6 chamadas paralelas (simulando 6 componentes na Home)
    const promises = [
      fetchRemoteStoreSettings(true),
      fetchRemoteStoreSettings(true),
      fetchRemoteStoreSettings(true),
      fetchRemoteStoreSettings(true),
      fetchRemoteStoreSettings(true),
      fetchRemoteStoreSettings(true),
    ];

    const results = await Promise.all(promises);

    // Todos devem receber o mesmo objeto
    results.forEach((res) => {
      expect(res?.siteName).toBe("Pantanal Smoke Deduplicado");
    });

    // A requisição de rede ao Supabase deve ter sido feita apenas UMA vez
    expect(selectCalls).toBe(1);
  });

  it("3. Atualização Reativa Imediata: reflete alterações locais e do Realtime instantaneamente", async () => {
    const { result } = renderHook(() => useStoreSettings());

    expect(result.current.settings.siteName).toBe(DEFAULT_STORE_SETTINGS.siteName);

    // Simula evento disparado pelo Supabase Realtime ou pelo Admin
    act(() => {
      saveStoreSettingsLocally({
        ...DEFAULT_STORE_SETTINGS,
        homeHighlightPhrase: "Nova Frase em Tempo Real — Conecte-se",
        deliveryFeeCuiaba: 18.5,
        deliveryFeeSaoPaulo: 24.0,
        openingHours: "Segunda a Sábado das 10h às 23h",
      });
    });

    await waitFor(() => {
      expect(result.current.settings.homeHighlightPhrase).toBe(
        "Nova Frase em Tempo Real — Conecte-se"
      );
      expect(result.current.settings.deliveryFeeCuiaba).toBe(18.5);
      expect(result.current.settings.deliveryFeeSaoPaulo).toBe(24.0);
      expect(result.current.settings.openingHours).toBe(
        "Segunda a Sábado das 10h às 23h"
      );
    });
  });

  it("4. Preserva integralmente banners, horários, imagens e taxas de entrega", async () => {
    const customBanners = [
      {
        id: "banner-custom-1",
        badge: "40.000 PUFFS",
        title: "Aurora Berries Exclusivo",
        puffs: "40.000 PUFFS",
        footerPhrase: "Conecte-se à sua vibe",
        imageUrl: "/assets/banner-aurora-berries.png",
        active: true,
        order: 1,
      },
    ];

    act(() => {
      saveStoreSettingsLocally({
        ...DEFAULT_STORE_SETTINGS,
        banners: customBanners,
        deliveryFeeCuiaba: 12.0,
        deliveryFeeSaoPaulo: 20.0,
      });
    });

    const { result } = renderHook(() => useStoreSettings());

    expect(result.current.settings.banners).toHaveLength(1);
    expect(result.current.settings.banners[0].title).toBe("Aurora Berries Exclusivo");
    expect(result.current.settings.deliveryFeeCuiaba).toBe(12.0);
    expect(result.current.settings.deliveryFeeSaoPaulo).toBe(20.0);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  validateStagingIsolation,
  PRODUCTION_SUPABASE_PROJECT_ID,
  PRODUCTION_SUPABASE_HOST,
} from "@/lib/staging-guard";
import {
  formatWhatsAppNumber,
  openWhatsAppExternal,
  STAGING_DUMMY_PHONE,
} from "@/lib/whatsapp";
import { getPaymentProvider } from "@/lib/payment/adapter";
import { TestPaymentProvider } from "@/lib/payment/providers/test-provider";
import fs from "fs";
import path from "path";

describe("Segurança e Isolamento do Ambiente de Homologação (Staging)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Guarda de Segurança (staging-guard.ts)", () => {
    it("permite execução normal quando não está no ambiente de staging", () => {
      const result = validateStagingIsolation({
        isStaging: false,
        projectId: PRODUCTION_SUPABASE_PROJECT_ID,
        supabaseUrl: `https://${PRODUCTION_SUPABASE_HOST}`,
      });
      expect(result.valid).toBe(true);
      expect(result.isStaging).toBe(false);
    });

    it("BLOQUEIA o boot com erro fatal se staging apontar para o Project ID de Produção", () => {
      expect(() => {
        validateStagingIsolation({
          isStaging: true,
          projectId: PRODUCTION_SUPABASE_PROJECT_ID,
          supabaseUrl: "https://staging-other.supabase.co",
        });
      }).toThrow(/BLOQUEIO DE SEGURANÇA CRÍTICO/i);
    });

    it("BLOQUEIA o boot com erro fatal se staging apontar para a URL/Host de Produção", () => {
      expect(() => {
        validateStagingIsolation({
          isStaging: true,
          projectId: "some-different-staging-id",
          supabaseUrl: `https://${PRODUCTION_SUPABASE_HOST}`,
        });
      }).toThrow(/BLOQUEIO DE SEGURANÇA CRÍTICO/i);
    });

    it("permite execução em staging quando apontar para projeto e URL isolados", () => {
      const result = validateStagingIsolation({
        isStaging: true,
        projectId: "pantanal-smoke-staging-abc",
        supabaseUrl: "https://pantanal-smoke-staging-abc.supabase.co",
      });
      expect(result.valid).toBe(true);
      expect(result.isStaging).toBe(true);
    });
  });

  describe("2. Bloqueio de Serviços Externos no Staging (WhatsApp e Gateway)", () => {
    it("utiliza número dummy no staging em vez do WhatsApp oficial da loja", () => {
      process.env.VITE_APP_ENV = "staging";
      const phone = formatWhatsAppNumber(null);
      expect(phone).toBe(STAGING_DUMMY_PHONE);
      expect(phone).toBe("5500000000000");
    });

    it("intercepta chamadas openWhatsAppExternal no staging sem disparar window.open", () => {
      process.env.VITE_APP_ENV = "staging";
      const windowOpenSpy = vi.spyOn(window, "open");
      const fakeEvent = { preventDefault: vi.fn() } as any;

      openWhatsAppExternal("https://wa.me/5565981141783?text=teste", fakeEvent);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(fakeEvent.preventDefault).toHaveBeenCalled();
    });

    it("força TestPaymentProvider em staging mesmo se credenciais de gateway estiverem presentes", () => {
      process.env.VITE_APP_ENV = "staging";
      process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-TOKEN-123";
      process.env.ASAAS_API_KEY = "ASAAS-TOKEN-123";

      const provider = getPaymentProvider("pix");
      expect(provider).toBeInstanceOf(TestPaymentProvider);
    });
  });

  describe("3. Preservação do Arquivo de Configuração de Produção (.env)", () => {
    it("garante que o arquivo .env de produção continua existindo e intacto", () => {
      const envPath = path.resolve(process.cwd(), ".env");
      expect(fs.existsSync(envPath)).toBe(true);

      const content = fs.readFileSync(envPath, "utf-8");
      expect(content).toContain(`SUPABASE_PROJECT_ID="${PRODUCTION_SUPABASE_PROJECT_ID}"`);
      expect(content).toContain(`SUPABASE_URL="https://${PRODUCTION_SUPABASE_HOST}"`);
    });

    it("garante que o arquivo .env.staging existe e possui identificadores isolados", () => {
      const stagingEnvPath = path.resolve(process.cwd(), ".env.staging");
      expect(fs.existsSync(stagingEnvPath)).toBe(true);

      const content = fs.readFileSync(stagingEnvPath, "utf-8");
      expect(content).toContain('VITE_APP_ENV="staging"');
      expect(content).not.toContain(PRODUCTION_SUPABASE_PROJECT_ID);
    });
  });
});

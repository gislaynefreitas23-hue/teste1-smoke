import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADMIN_CONFIG,
  checkAdminSession,
  getStoreSettings,
  loginAdminWithSupabase,
  logoutAdmin,
  requestAdminPasswordReset,
  saveStoreSettings,
  updateAdminPassword,
  verifyUserIsAdmin,
} from "@/lib/store-settings";
import { supabase } from "@/integrations/supabase/client";

describe("Painel Administrativo: Segurança, Supabase Auth e Persistência", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("1. Ausência de credenciais e chaves fixas no frontend", () => {
    it("não expõe senhas no objeto ADMIN_CONFIG", () => {
      expect((ADMIN_CONFIG as any).password).toBeUndefined();
      expect(ADMIN_CONFIG.email).toBeDefined();
    });
  });

  describe("2. Bloqueio para usuários não autenticados", () => {
    it("retorna false para checkAdminSession quando não há sessão no Supabase", async () => {
      vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      const isSessionValid = await checkAdminSession();
      expect(isSessionValid).toBe(false);
    });

    it("retorna false para verifyUserIsAdmin quando não há usuário logado", async () => {
      vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const isAdmin = await verifyUserIsAdmin();
      expect(isAdmin).toBe(false);
    });
  });

  describe("3. Impossibilidade de burlar o login alterando o localStorage", () => {
    it("ignora valores arbitrários ou forjados no localStorage e bloqueia acesso", async () => {
      // Injeta sessão falsa no localStorage
      localStorage.setItem(
        "pantanal_admin_auth_session",
        JSON.stringify({
          email: "hacker@invasor.com",
          role: "admin",
          authenticatedAt: new Date().toISOString(),
        })
      );

      // Supabase não possui sessão real válida
      vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

      const isSessionValid = await checkAdminSession();
      expect(isSessionValid).toBe(false);
    });
  });

  describe("4. Login administrativo via Supabase Auth e bloqueio de usuários sem papel admin", () => {
    it("rejeita credenciais inválidas fornecidas pelo usuário", async () => {
      vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials", name: "AuthApiError", status: 400 },
      } as any);

      const result = await loginAdminWithSupabase(
        "gislaynefreitas23@gmail.com",
        "senha_incorreta"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid login credentials");
    });

    it("bloqueia cliente comum autenticado que NÃO possui papel 'admin' no banco", async () => {
      const regularUserId = "regular-user-uuid-123";

      vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
        data: {
          user: { id: regularUserId, email: "cliente@gmail.com" },
          session: {} as any,
        },
        error: null,
      } as any);

      // Mock da verificação RPC / tabela retornando que o usuário NÃO é admin
      vi.spyOn(supabase as any, "rpc").mockResolvedValue({
        data: false,
        error: null,
      });

      const signOutSpy = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });

      const result = await loginAdminWithSupabase(
        "cliente@gmail.com",
        "senha123456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("não possui privilégios de administrador");
      // Garante que o sistema desloga imediatamente o usuário comum
      expect(signOutSpy).toHaveBeenCalled();
    });

    it("permite login quando usuário possui papel 'admin' validado no banco", async () => {
      const adminUserId = "admin-uuid-999";

      vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
        data: {
          user: { id: adminUserId, email: "gislaynefreitas23@gmail.com" },
          session: {} as any,
        },
        error: null,
      } as any);

      vi.spyOn(supabase as any, "rpc").mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await loginAdminWithSupabase(
        "gislaynefreitas23@gmail.com",
        "tabacariasmoke2522"
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("5. Recuperação de senha por e-mail", () => {
    it("solicita recuperação via Supabase Auth com URL de redirecionamento para /admin", async () => {
      const resetSpy = vi.spyOn(supabase.auth, "resetPasswordForEmail").mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const result = await requestAdminPasswordReset("gislaynefreitas23@gmail.com");

      expect(result.success).toBe(true);
      expect(resetSpy).toHaveBeenCalledWith(
        "gislaynefreitas23@gmail.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/admin"),
        })
      );
    });

    it("rejeita e-mail em branco para recuperação", async () => {
      const result = await requestAdminPasswordReset("   ");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Informe um e-mail válido");
    });
  });

  describe("6. Redefinição e atualização de senha", () => {
    it("rejeita senhas menores que 6 caracteres", async () => {
      const result = await updateAdminPassword("123");
      expect(result.success).toBe(false);
      expect(result.error).toContain("mínimo 6 caracteres");
    });

    it("chama supabase.auth.updateUser com a nova senha", async () => {
      const updateSpy = vi.spyOn(supabase.auth, "updateUser").mockResolvedValue({
        data: { user: { id: "admin-id" } as any },
        error: null,
      } as any);

      const result = await updateAdminPassword("novaSenhaForte@2026");
      expect(result.success).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith({
        password: "novaSenhaForte@2026",
      });
    });
  });

  describe("7. Encerramento de sessão seguro (Logout)", () => {
    it("chama supabase.auth.signOut e limpa resquícios locais", async () => {
      const signOutSpy = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });

      localStorage.setItem("pantanal_admin_auth_session", "temp");

      await logoutAdmin();

      expect(signOutSpy).toHaveBeenCalled();
      expect(localStorage.getItem("pantanal_admin_auth_session")).toBeNull();
    });
  });

  describe("8. Persistência de configurações da loja", () => {
    it("salva e recupera as configurações customizadas", async () => {
      const initial = getStoreSettings();
      expect(initial.siteName).toBe("Pantanal Smoke");
      expect(initial.deliveryFeeCuiaba).toBe(10.0);

      // Salva novas configurações
      await saveStoreSettings({
        ...initial,
        siteName: "Pantanal Smoke VIP",
        deliveryFeeCuiaba: 12.0,
        whatsappNumber: "5565999210066",
        cashbackTitle: "Cashback Exclusivo",
      });

      const updated = getStoreSettings();
      expect(updated.siteName).toBe("Pantanal Smoke VIP");
      expect(updated.deliveryFeeCuiaba).toBe(12.0);
      expect(updated.whatsappNumber).toBe("5565999210066");
      expect(updated.cashbackTitle).toBe("Cashback Exclusivo");
    });
  });
});

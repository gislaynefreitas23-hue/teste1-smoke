import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Edit2,
  Eye,
  ImagePlus,
  Layers,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Trash2,
  Truck,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/brasa";
import {
  ADMIN_CONFIG,
  BannerSlide,
  loginAdminWithSupabase,
  logoutAdmin,
  requestAdminPasswordReset,
  StoreSettings,
  updateAdminPassword,
  useStoreSettings,
  verifyUserIsAdmin,
} from "@/lib/store-settings";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo Master — Pantanal Smoke" },
      {
        name: "description",
        content: "Controle total e gerenciamento das informações, produtos e pedidos da Pantanal Smoke.",
      },
    ],
  }),
  component: AdminPage,
});

type AuthViewMode = "loading" | "login" | "forgot_password" | "reset_password" | "dashboard";

function AdminPage() {
  const [authMode, setAuthMode] = useState<AuthViewMode>("loading");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Estados dos formulários
  const [emailInput, setEmailInput] = useState(ADMIN_CONFIG.email || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      try {
        // Detecta se a URL contém hash de recuperação do Supabase Auth
        if (
          typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") ||
            window.location.href.includes("type=recovery"))
        ) {
          if (isMounted) {
            setAuthMode("reset_password");
            setSuccessMessage("Link de recuperação autenticado. Digite sua nova senha abaixo.");
          }
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (user) {
          const isAdmin = await verifyUserIsAdmin(user.id);
          if (isAdmin) {
            if (isMounted) {
              setCurrentUserEmail(user.email || "");
              setAuthMode("dashboard");
            }
            return;
          }
        }
      } catch (err) {
        console.error("Erro ao verificar sessão administrativa:", err);
      }

      if (isMounted) {
        setAuthMode("login");
      }
    }

    checkCurrentSession();

    // Ouve eventos do Supabase Auth (como recuperação de senha ou expiração de token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset_password");
        setSuccessMessage("Link de recuperação validado. Defina sua nova senha abaixo.");
        return;
      }

      if (event === "SIGNED_OUT") {
        setAuthMode("login");
        setCurrentUserEmail("");
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const isAdmin = await verifyUserIsAdmin(session.user.id);
        if (isAdmin) {
          setCurrentUserEmail(session.user.email || "");
          setAuthMode("dashboard");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // --- Submissão de Login ---
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginAdminWithSupabase(emailInput, passwordInput);
      if (result.success) {
        setCurrentUserEmail(emailInput.trim());
        setAuthMode("dashboard");
      } else {
        setErrorMessage(
          result.error ||
            "Credenciais administrativas inválidas ou sem permissão de administrador."
        );
      }
    } catch {
      setErrorMessage("Erro inesperado ao realizar login administrativo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Solicitação de Recuperação de Senha ---
  async function handleForgotPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await requestAdminPasswordReset(emailInput);
      if (result.success) {
        setSuccessMessage(
          "Se o e-mail informado estiver cadastrado, você receberá um link seguro para redefinir sua senha. Verifique também a pasta de spam."
        );
      } else {
        setErrorMessage(result.error || "Não foi possível solicitar a recuperação de senha.");
      }
    } catch {
      setErrorMessage("Erro ao conectar com o serviço de recuperação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Redefinição de Nova Senha ---
  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPasswordInput.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMessage("As senhas digitadas não coincidem. Verifique e tente novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateAdminPassword(newPasswordInput);
      if (result.success) {
        setSuccessMessage("Senha alterada com sucesso! Você já pode entrar com a nova senha.");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        // Limpa hash da url e volta para login após breve confirmação
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        setTimeout(() => {
          setAuthMode("login");
        }, 2000);
      } else {
        setErrorMessage(result.error || "Não foi possível atualizar a senha.");
      }
    } catch {
      setErrorMessage("Erro inesperado ao definir nova senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Logout ---
  async function handleLogout() {
    await logoutAdmin();
    setAuthMode("login");
    setCurrentUserEmail("");
    setPasswordInput("");
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Estado de Carregamento
  if (authMode === "loading") {
    return (
      <main className="mx-auto flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
        Verificando permissões administrativas...
      </main>
    );
  }

  // --- TELA DE RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA) ---
  if (authMode === "forgot_password") {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-primary/30 bg-card/80 p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Recuperar Senha</h1>
            <p className="text-xs text-muted-foreground">
              Informe seu e-mail administrativo para receber um link seguro de recuperação via Supabase Auth.
            </p>
          </div>

          <form onSubmit={handleForgotPasswordSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="admin-reset-email" className="text-xs font-semibold">
                E-mail Cadastrado
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-reset-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  className="pr-9 text-sm"
                />
                <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Enviando link...
                </>
              ) : (
                "Enviar link de recuperação"
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              ← Voltar para o login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- TELA DE DEFINIÇÃO DE NOVA SENHA (PÓS LINK DE RECUPERAÇÃO) ---
  if (authMode === "reset_password") {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-primary/30 bg-card/80 p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Definir Nova Senha</h1>
            <p className="text-xs text-muted-foreground">
              Digite uma nova senha segura para acessar o Painel Master da Pantanal Smoke.
            </p>
          </div>

          <form onSubmit={handleResetPasswordSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="admin-new-pass" className="text-xs font-semibold">
                Nova Senha (mínimo 6 caracteres)
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-new-pass"
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="pr-9 text-sm"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <Label htmlFor="admin-confirm-pass" className="text-xs font-semibold">
                Confirmar Nova Senha
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-confirm-pass"
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="pr-9 text-sm"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Atualizando senha...
                </>
              ) : (
                "Salvar Nova Senha"
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              ← Voltar para o login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- TELA DE LOGIN ADMINISTRATIVO ---
  if (authMode !== "dashboard") {
    return (
      <main className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-primary/30 bg-card/80 p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/40 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel da Loja</h1>
            <p className="text-xs text-muted-foreground">
              Acesso exclusivo para administradores autenticados via Supabase Auth
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="admin-email" className="text-xs font-semibold">
                E-mail do Administrador
              </Label>
              <div className="relative mt-1">
                <Input
                  id="admin-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="gislaynefreitas23@gmail.com"
                  className="pr-9 text-sm"
                />
                <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-pass" className="text-xs font-semibold">
                  Senha de Acesso
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("forgot_password");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative mt-1">
                <Input
                  id="admin-pass"
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha"
                  className="pr-9 text-sm"
                />
                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow mt-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Autenticando...
                </>
              ) : (
                "Acessar Painel Master"
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              ← Voltar para a loja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // --- Painel Master Autenticado com Papel Admin Confirmado ---
  return <MasterAdminDashboard onLogout={handleLogout} userEmail={currentUserEmail} />;
}

function MasterAdminDashboard({
  onLogout,
  userEmail,
}: {
  onLogout: () => void;
  userEmail: string;
}) {
  const { settings, saveSettings } = useStoreSettings();
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza estado inicial do formulário quando as configurações mudarem
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  async function handleSaveGeneralSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    await saveSettings(formData);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Topo do Painel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Controle Master Ativo</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            Painel Administrativo da Pantanal Smoke
          </h1>
          <p className="text-xs text-muted-foreground">
            Conectado como <strong className="text-foreground">{userEmail || ADMIN_CONFIG.email}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="border-slate-700 hover:bg-slate-800 text-xs">
            <Link to="/" target="_blank">
              <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
              Ver Site
            </Link>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            className="text-xs gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>
      </div>

      {/* Abas do Painel */}
      <Tabs defaultValue="config" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-slate-900 border border-slate-800 p-1 rounded-2xl h-auto">
          <TabsTrigger value="config" className="py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl">
            <Settings className="h-4 w-4 mr-1.5" />
            Configurações da Loja
          </TabsTrigger>
          <TabsTrigger value="banners" className="py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl">
            <Layers className="h-4 w-4 mr-1.5" />
            Banners & Carrossel
          </TabsTrigger>
          <TabsTrigger value="produtos" className="py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl">
            <ShoppingBag className="h-4 w-4 mr-1.5" />
            Catálogo de Produtos
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="py-2.5 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl">
            <Truck className="h-4 w-4 mr-1.5" />
            Pedidos & Entregas
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: CONFIGURAÇÕES DA LOJA */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-card/60 p-6 backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" />
                  Informações Gerais do Site
                </h2>

                <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-glow">
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Salvar Alterações</span>
                </Button>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>Configurações salvas e aplicadas em todo o site com sucesso!</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-name" className="text-xs font-semibold">Nome da Loja</Label>
                  <Input
                    id="st-name"
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="st-slogan" className="text-xs font-semibold">Slogan Principal</Label>
                  <Input
                    id="st-slogan"
                    value={formData.slogan}
                    onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-whats" className="text-xs font-semibold flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    Número do WhatsApp Oficial (com 55 + DDD)
                  </Label>
                  <Input
                    id="st-whats"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="5565999210066"
                    className="mt-1 text-sm font-mono"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Link gerado: https://wa.me/{formData.whatsappNumber.replace(/\D/g, "")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="st-whats-msg" className="text-xs font-semibold">
                    Mensagem Padrão ao Iniciar Conversa
                  </Label>
                  <Input
                    id="st-whats-msg"
                    value={formData.whatsappMessage}
                    onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
                    placeholder="Olá! Gostaria de fazer um pedido."
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="st-fee" className="text-xs font-semibold flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" />
                    Taxa Fixa de Entrega para Cuiabá (R$)
                  </Label>
                  <Input
                    id="st-fee"
                    type="number"
                    step="0.50"
                    value={formData.deliveryFeeCuiaba}
                    onChange={(e) => setFormData({ ...formData, deliveryFeeCuiaba: Number(e.target.value) || 0 })}
                    className="mt-1 text-sm font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor="st-cashback-rate" className="text-xs font-semibold flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-primary" />
                    Percentual de Cashback (ex: 0.05 para 5%)
                  </Label>
                  <Input
                    id="st-cashback-rate"
                    type="number"
                    step="0.01"
                    value={formData.cashbackRate}
                    onChange={(e) => setFormData({ ...formData, cashbackRate: Number(e.target.value) || 0 })}
                    className="mt-1 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Equivalente a {(formData.cashbackRate * 100).toFixed(0)}% de retorno
                  </p>
                </div>

                <div>
                  <Label htmlFor="st-hours" className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    Horário de Atendimento
                  </Label>
                  <Input
                    id="st-hours"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="Atendimento das 10h às 19h"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="st-cb-title" className="text-xs font-semibold">
                  Título da Seção de Cashback
                </Label>
                <Input
                  id="st-cb-title"
                  value={formData.cashbackTitle}
                  onChange={(e) => setFormData({ ...formData, cashbackTitle: e.target.value })}
                  placeholder="Cashback na sua próxima compra"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="st-cb-desc" className="text-xs font-semibold">
                  Texto Explicativo do Cashback
                </Label>
                <Textarea
                  id="st-cb-desc"
                  rows={2}
                  value={formData.cashbackDescription}
                  onChange={(e) => setFormData({ ...formData, cashbackDescription: e.target.value })}
                  placeholder="Entre na sua conta com seu e-mail e receba 5% do valor do seu pedido em cashback para usar na próxima compra."
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow">
                {isSaving ? "Salvando..." : "Salvar Todas as Configurações"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ABA 2: BANNERS & CARROSSEL DE LANÇAMENTO */}
        <TabsContent value="banners" className="mt-6">
          <BannersManagement
            banners={formData.banners}
            onUpdateBanners={async (updated) => {
              const newSettings = { ...formData, banners: updated };
              setFormData(newSettings);
              await saveSettings(newSettings);
            }}
          />
        </TabsContent>

        {/* ABA 3: CATÁLOGO DE PRODUTOS */}
        <TabsContent value="produtos" className="mt-6">
          <ProductsManagement />
        </TabsContent>

        {/* ABA 4: PEDIDOS & ENTREGAS */}
        <TabsContent value="pedidos" className="mt-6">
          <OrdersManagement />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// ==========================================
// COMPONENTE: GERENCIADOR DE BANNERS
// ==========================================
function BannersManagement({
  banners,
  onUpdateBanners,
}: {
  banners: BannerSlide[];
  onUpdateBanners: (banners: BannerSlide[]) => Promise<void>;
}) {
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);

  async function handleToggleActive(id: string) {
    const updated = banners.map((b) => (b.id === id ? { ...b, active: !b.active } : b));
    await onUpdateBanners(updated);
  }

  async function handleSaveSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSlide) return;

    const exists = banners.some((b) => b.id === editingSlide.id);
    let updated: BannerSlide[];
    if (exists) {
      updated = banners.map((b) => (b.id === editingSlide.id ? editingSlide : b));
    } else {
      updated = [...banners, { ...editingSlide, order: banners.length + 1 }];
    }

    await onUpdateBanners(updated);
    setEditingSlide(null);
  }

  async function handleDeleteSlide(id: string) {
    if (!window.confirm("Deseja realmente remover este slide do carrossel?")) return;
    const updated = banners.filter((b) => b.id !== id);
    await onUpdateBanners(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Carrossel de Lançamentos</h2>
          <p className="text-xs text-muted-foreground">
            Altere os títulos, slogans de rodapé, quantidade de puffs e imagens do carrossel em `/produtos`.
          </p>
        </div>

        <Button
          onClick={() =>
            setEditingSlide({
              id: `slide-${Date.now()}`,
              badge: "LANÇAMENTO",
              title: "Novo Sabor",
              puffs: "40.000 PUFFS",
              footerPhrase: "Qualidade de Sabor e Autonomia Garantida",
              imageUrl: "",
              active: true,
              order: banners.length + 1,
            })
          }
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Adicionar Slide
        </Button>
      </div>

      {/* Modal/Formulário de Edição de Slide */}
      {editingSlide && (
        <form onSubmit={handleSaveSlide} className="rounded-2xl border border-primary/40 bg-card/90 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white">Editar Slide do Carrossel</h3>
            <span className="text-xs text-primary font-mono">{editingSlide.id}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Selo de Destaque (Badge)</Label>
              <Input
                value={editingSlide.badge}
                onChange={(e) => setEditingSlide({ ...editingSlide, badge: e.target.value })}
                placeholder="LANÇAMENTO"
                className="mt-1 text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Nome do Sabor / Produto</Label>
              <Input
                value={editingSlide.title}
                onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                placeholder="Ex: Aurora Berries"
                className="mt-1 text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Capacidade (Puffs)</Label>
              <Input
                value={editingSlide.puffs}
                onChange={(e) => setEditingSlide({ ...editingSlide, puffs: e.target.value })}
                placeholder="40.000 PUFFS"
                className="mt-1 text-sm font-semibold"
                required
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Frase Sincronizada do Rodapé</Label>
              <Input
                value={editingSlide.footerPhrase}
                onChange={(e) => setEditingSlide({ ...editingSlide, footerPhrase: e.target.value })}
                placeholder="Consistência de Sabor de Alta Performance"
                className="mt-1 text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs">URL da Foto do Pod</Label>
              <Input
                value={editingSlide.imageUrl}
                onChange={(e) => setEditingSlide({ ...editingSlide, imageUrl: e.target.value })}
                placeholder="https://... ou caminho da imagem"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingSlide(null)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              Salvar Slide
            </Button>
          </div>
        </form>
      )}

      {/* Lista de Slides */}
      <div className="grid gap-4 md:grid-cols-3">
        {banners.map((b, idx) => (
          <div
            key={b.id}
            className={`rounded-2xl border p-4 backdrop-blur-sm transition-all flex flex-col justify-between ${
              b.active ? "border-slate-800 bg-card/60" : "border-slate-800/40 bg-card/20 opacity-60"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  Slide {idx + 1}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{b.active ? "Ativo" : "Pausado"}</span>
                  <Switch checked={b.active} onCheckedChange={() => handleToggleActive(b.id)} />
                </div>
              </div>

              {b.imageUrl && (
                <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                  <img src={b.imageUrl} alt={b.title} className="h-full object-contain" />
                </div>
              )}

              <div>
                <p className="text-xs text-primary font-bold">{b.badge}</p>
                <h3 className="text-base font-bold text-white">{b.title}</h3>
                <p className="text-xs font-semibold text-slate-300">{b.puffs}</p>
                <p className="mt-1.5 text-xs text-muted-foreground italic border-t border-slate-800/60 pt-1.5">
                  “{b.footerPhrase}”
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-800 pt-3">
              <Button size="sm" variant="ghost" onClick={() => setEditingSlide(b)} className="text-xs gap-1">
                <Edit2 className="h-3.5 w-3.5 text-primary" />
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteSlide(b.id)} className="text-xs text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE: GERENCIADOR DE PRODUTOS
// ==========================================
function ProductsManagement() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);

    const payload = {
      name: draft.name,
      category: draft.category,
      price: Number(String(draft.price).replace(",", ".")) || 0,
      description: draft.description || "",
      flavor_profile: draft.flavor_profile || "",
      intensity: draft.intensity || "média",
      active: draft.active,
      image_url: draft.image_url || "",
    };

    if (draft.id) {
      await supabase.from("products").update(payload).eq("id", draft.id);
    } else {
      await supabase.from("products").insert(payload);
    }

    setBusy(false);
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function handleDeleteProduct(id: string, name: string) {
    if (!window.confirm(`Excluir produto "${name}"?`)) return;
    await supabase.from("products").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Catálogo de Produtos</h2>
          <p className="text-xs text-muted-foreground">Cadastre novos produtos, altere preços e pause itens fora de estoque.</p>
        </div>

        <Button
          onClick={() =>
            setDraft({
              name: "",
              category: "Essência",
              price: "44.90",
              description: "",
              flavor_profile: "Frutado",
              intensity: "média",
              active: true,
              image_url: "",
            })
          }
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {draft && (
        <form onSubmit={handleSaveProduct} className="rounded-2xl border border-primary/30 bg-card/90 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
            {draft.id ? "Editar Produto" : "Cadastrar Novo Produto"}
          </h3>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Nome do Produto</Label>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex: Essência Dubaim Apple"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Categoria</Label>
              <Input
                required
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Pod Descartável, Essência, Carvão..."
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Preço (R$)</Label>
              <Input
                required
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="39.90"
                className="mt-1 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Perfil de Sabor</Label>
              <Input
                value={draft.flavor_profile}
                onChange={(e) => setDraft({ ...draft, flavor_profile: e.target.value })}
                placeholder="Menta, Cítrico, Frutas Vermelhas..."
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">URL da Imagem</Label>
              <Input
                value={draft.image_url}
                onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
                placeholder="https://... ou caminho do arquivo"
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Detalhes e características do produto..."
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={draft.active} onCheckedChange={(val) => setDraft({ ...draft, active: val })} />
            <span className="text-xs text-slate-200">Visível na vitrine da loja</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              {busy ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando catálogo...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-slate-800 bg-card/60 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">{p.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <h4 className="mt-1 font-bold text-white text-sm">{p.name}</h4>
                <p className="mt-1 text-sm font-bold text-primary">{formatBRL(p.price)}</p>
              </div>

              <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-800 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setDraft(p)} className="text-xs gap-1">
                  <Edit2 className="h-3.5 w-3.5 text-primary" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(p.id, p.name)} className="text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE: GERENCIADOR DE PEDIDOS
// ==========================================
function OrdersManagement() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function handleUpdateOrderStatus(id: string, newStatus: string) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Gestão de Pedidos & Entregas</h2>
        <p className="text-xs text-muted-foreground">Acompanhe pedidos recebidos, aprove pagamentos e confirme entregas.</p>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-card/40 p-8 text-center text-muted-foreground text-sm">
          Nenhum pedido registrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const cleanPhone = (o.phone || "").replace(/\D/g, "");
            const whatsLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%2C%20sobre%20seu%20pedido%20na%20Pantanal%20Smoke` : null;

            return (
              <div key={o.id} className="rounded-2xl border border-slate-800 bg-card/60 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="font-bold text-white text-base">{o.customer_name || "Cliente Pantanal"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")} · Pedido #{o.id.slice(0, 8)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {o.status || "pendente"}
                    </span>
                    <span className="text-base font-bold text-emerald-400">{formatBRL(o.total || 0)}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-300">
                  <div>
                    <p className="font-semibold text-white flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço de Entrega:
                    </p>
                    <p className="mt-0.5 text-muted-foreground">{o.address || "Endereço não informado"}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-white">Contato:</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span>{o.phone}</span>
                      {whatsLink && (
                        <a
                          href={whatsLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                        >
                          <MessageCircle className="h-3 w-3" /> Chamar WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Forma de pagamento: <strong className="text-slate-200 uppercase">{o.payment_method || "Online"}</strong>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateOrderStatus(o.id, "cancelado")}
                      className="text-xs text-rose-400 border-slate-700 hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(o.id, "em_preparo")}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Em Preparo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateOrderStatus(o.id, "confirmado")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Confirmar Entrega (+ Cashback)
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

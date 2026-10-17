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
  FileText,
  HelpCircle,
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
import { ImageUploadField } from "@/components/ImageUploadField";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/brasa";
import {
  ADMIN_CONFIG,
  BannerSlide,
  DEFAULT_STORE_SETTINGS,
  FAQSettingItem,
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
        // 1. Detecta se a URL contém hash ou parâmetros de recuperação do Supabase Auth
        const isRecoveryUrl =
          typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") ||
            window.location.search.includes("type=recovery") ||
            window.location.href.includes("type=recovery"));

        if (isRecoveryUrl) {
          if (isMounted) {
            setAuthMode("reset_password");
            setSuccessMessage("Link de recuperação autenticado. Digite sua nova senha abaixo.");
          }
          return;
        }

        // 2. Se houver código PKCE de autorização/recuperação do Supabase na query string
        if (typeof window !== "undefined" && window.location.search.includes("code=")) {
          const urlParams = new URLSearchParams(window.location.search);
          const authCode = urlParams.get("code");
          if (authCode) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(authCode);

            if (!exchangeError && exchangeData?.session?.user) {
              // Limpa a query string para deixar a URL limpa
              window.history.replaceState(null, "", window.location.pathname);

              const isUserAdmin = await verifyUserIsAdmin(exchangeData.session.user.id);
              if (isUserAdmin) {
                if (isMounted) {
                  setCurrentUserEmail(exchangeData.session.user.email || "");
                  setAuthMode("dashboard");
                }
                return;
              } else {
                await supabase.auth.signOut();
                if (isMounted) {
                  setErrorMessage("Acesso negado: Este usuário não possui privilégios de administrador.");
                  setAuthMode("login");
                }
                return;
              }
            }
          }
        }

        // 3. Validação da sessão ativa persistida (permanência segura após atualizar a página)
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
          } else {
            // Usuário comum logado tentando acessar /admin: desconecta imediatamente
            await supabase.auth.signOut();
            if (isMounted) {
              setCurrentUserEmail("");
              setErrorMessage("Acesso negado: Este usuário não possui privilégios de administrador.");
              setAuthMode("login");
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

    // Ouve eventos do Supabase Auth (como recuperação de senha, login ou logout)
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
        } else {
          await supabase.auth.signOut();
          setCurrentUserEmail("");
          setAuthMode("login");
          setErrorMessage("Acesso negado: Este usuário não possui privilégios de administrador.");
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

  const faqsList = formData.faqs && formData.faqs.length > 0 ? formData.faqs : DEFAULT_STORE_SETTINGS.faqs;

  function handleFaqChange(index: number, field: "question" | "answer", value: string) {
    const updated = [...faqsList];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, faqs: updated });
  }

  function handleAddFaq() {
    const newFaq: FAQSettingItem = {
      id: `faq-${Date.now()}`,
      question: "",
      answer: "",
    };
    setFormData({ ...formData, faqs: [...faqsList, newFaq] });
  }

  function handleRemoveFaq(index: number) {
    const updated = faqsList.filter((_, i) => i !== index);
    setFormData({ ...formData, faqs: updated });
  }

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

            {/* Seção: Frases e Textos Institucionais do Site */}
            <div className="rounded-2xl border border-slate-800 bg-card/60 p-6 backdrop-blur-sm space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Frases & Textos Institucionais do Site
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Altere os slogans, frases de destaque da página inicial e textos do rodapé sem precisar mexer no código.
                </p>
              </div>

              {/* 1. Frase de Destaque da Home */}
              <div>
                <Label htmlFor="st-home-highlight" className="text-xs font-semibold">
                  Frase de Destaque da Página Inicial (Abaixo do Slogan)
                </Label>
                <Input
                  id="st-home-highlight"
                  value={formData.homeHighlightPhrase || ""}
                  onChange={(e) => setFormData({ ...formData, homeHighlightPhrase: e.target.value })}
                  placeholder="Encontre tudo que combina com sua vibe e ganhe benefícios em cada compra."
                  className="mt-1 text-sm"
                />
              </div>

              {/* 2. Card de Benefício / Estoque Local da Home */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-benefit-title" className="text-xs font-semibold">
                    Título do Card de Estoque/Entrega Local
                  </Label>
                  <Input
                    id="st-benefit-title"
                    value={formData.benefitCardTitle || ""}
                    onChange={(e) => setFormData({ ...formData, benefitCardTitle: e.target.value })}
                    placeholder="100% Online, Estoque Local"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="st-benefit-desc" className="text-xs font-semibold">
                    Descrição do Card de Estoque/Entrega Local
                  </Label>
                  <Textarea
                    id="st-benefit-desc"
                    rows={2}
                    value={formData.benefitCardDescription || ""}
                    onChange={(e) => setFormData({ ...formData, benefitCardDescription: e.target.value })}
                    placeholder="Compre online com praticidade e receba seus produtos no conforto de casa, no mesmo dia."
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              {/* 3. Frases do Rodapé */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-footer-tagline" className="text-xs font-semibold">
                    Frase Institucional do Rodapé
                  </Label>
                  <Input
                    id="st-footer-tagline"
                    value={formData.footerTagline || ""}
                    onChange={(e) => setFormData({ ...formData, footerTagline: e.target.value })}
                    placeholder="De Cuiabá a São Paulo, conectando vibes."
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="st-footer-contact" className="text-xs font-semibold">
                    Frase de Atendimento no Rodapé (antes do link)
                  </Label>
                  <Input
                    id="st-footer-contact"
                    value={formData.footerContactText || ""}
                    onChange={(e) => setFormData({ ...formData, footerContactText: e.target.value })}
                    placeholder="Dúvidas ou pedidos? Fale com a gente pelo"
                    className="mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Seção: Página "Sobre Nós" */}
            <div className="rounded-2xl border border-slate-800 bg-card/60 p-6 backdrop-blur-sm space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Página Institucional "Sobre Nós" (/sobre-nos)
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edite a história, os propósitos regionais e a frase final de encerramento da página Sobre Nós.
                </p>
              </div>

              <div>
                <Label htmlFor="st-about-title" className="text-xs font-semibold">
                  Título da Página
                </Label>
                <Input
                  id="st-about-title"
                  value={formData.aboutUsTitle || ""}
                  onChange={(e) => setFormData({ ...formData, aboutUsTitle: e.target.value })}
                  placeholder="Sobre Nós"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="st-about-p1" className="text-xs font-semibold">
                  Parágrafo 1 — Origem e Fundação dos Empreendedores
                </Label>
                <Textarea
                  id="st-about-p1"
                  rows={3}
                  value={formData.aboutUsParagraph1 || ""}
                  onChange={(e) => setFormData({ ...formData, aboutUsParagraph1: e.target.value })}
                  placeholder="A Pantanal Smoke nasceu da visão de três empreendedores de Cuiabá que, vivendo em São Paulo..."
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="st-about-p2" className="text-xs font-semibold">
                  Parágrafo 2 — Propósitos em Cuiabá e São Paulo
                </Label>
                <Textarea
                  id="st-about-p2"
                  rows={3}
                  value={formData.aboutUsParagraph2 || ""}
                  onChange={(e) => setFormData({ ...formData, aboutUsParagraph2: e.target.value })}
                  placeholder="Em Cuiabá, nosso propósito é oferecer mais variedade, qualidade e preços justos..."
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="st-about-p3" className="text-xs font-semibold">
                  Parágrafo 3 — Compromisso com Conveniência e Experiência
                </Label>
                <Textarea
                  id="st-about-p3"
                  rows={2}
                  value={formData.aboutUsParagraph3 || ""}
                  onChange={(e) => setFormData({ ...formData, aboutUsParagraph3: e.target.value })}
                  placeholder="Mais do que vender, queremos proporcionar conveniência, variedade e uma experiência diferenciada a cada cliente."
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="st-about-brand" className="text-xs font-semibold">
                  Frase de Assinatura da Marca (Destaque Final)
                </Label>
                <Input
                  id="st-about-brand"
                  value={formData.aboutUsBrandPhrase || ""}
                  onChange={(e) => setFormData({ ...formData, aboutUsBrandPhrase: e.target.value })}
                  placeholder="Pantanal Smoke — Conecte a sua vibe."
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            {/* Seção: Página "Perguntas Frequentes" */}
            <div className="rounded-2xl border border-slate-800 bg-card/60 p-6 backdrop-blur-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Página Institucional "Perguntas Frequentes" (/perguntas-frequentes)
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Gerencie o título, subtítulo e as perguntas/respostas do acordeão da central de dúvidas.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAddFaq}
                  variant="outline"
                  size="sm"
                  className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 text-xs w-full sm:w-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Pergunta
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-faq-title" className="text-xs font-semibold">
                    Título da Página
                  </Label>
                  <Input
                    id="st-faq-title"
                    value={formData.faqTitle || ""}
                    onChange={(e) => setFormData({ ...formData, faqTitle: e.target.value })}
                    placeholder="Perguntas Frequentes"
                    className="mt-1 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="st-faq-subtitle" className="text-xs font-semibold">
                    Subtítulo / Chamada
                  </Label>
                  <Input
                    id="st-faq-subtitle"
                    value={formData.faqSubtitle || ""}
                    onChange={(e) => setFormData({ ...formData, faqSubtitle: e.target.value })}
                    placeholder="Tire suas dúvidas e compre com mais tranquilidade."
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              {/* Lista de FAQs editáveis */}
              <div className="space-y-4 pt-2">
                <Label className="text-xs font-semibold text-white">
                  Perguntas e Respostas Cadastradas ({faqsList.length})
                </Label>

                {faqsList.map((faq, index) => (
                  <div
                    key={faq.id || `faq-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <span className="flex items-center gap-2 text-xs font-bold text-primary">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px]">
                          {index + 1}
                        </span>
                        Pergunta #{index + 1}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFaq(index)}
                        className="h-7 px-2 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </Button>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-slate-300">
                        Pergunta
                      </Label>
                      <Input
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, "question", e.target.value)}
                        placeholder="Ex: Como funciona a entrega?"
                        className="mt-1 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-slate-300">
                        Resposta
                      </Label>
                      <Textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
                        placeholder="Ex: Em Cuiabá, a taxa é fixa de R$ 10..."
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
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
              <ImageUploadField
                label="Foto do Pod no Banner"
                value={editingSlide.imageUrl}
                onChange={(url) => setEditingSlide({ ...editingSlide, imageUrl: url })}
                folderPrefix="banner"
                helperText="Escolha a imagem do produto salva no computador (PNG transparente, JPG, WEBP)."
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
// ==========================================
// COMPONENTE: GERENCIADOR DE PRODUTOS
// ==========================================
function ProductsManagement() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedCityFilter, setSelectedCityFilter] = useState<"all" | "cuiaba" | "sao-paulo">("all");

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_city_inventories (
              id,
              city_id,
              price,
              stock,
              active
            )
          `)
          .order("category")
          .order("name");

        if (!error && data) return data;
        throw error;
      } catch {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("category")
          .order("name");

        if (error) throw error;
        return data ?? [];
      }
    },
  });

  // Filtra produtos de acordo com o seletor de cidade
  const products = rawProducts.filter((p: any) => {
    if (selectedCityFilter === "all") return true;

    const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
    if (inventories.length === 0) return true; // Mostra fallback

    const inv = inventories.find((i: any) => i.city_id === selectedCityFilter);
    return inv ? inv.active === true : false;
  });

  function openEditProduct(p: any) {
    const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
    const cuiabaInv = inventories.find((i: any) => i.city_id === "cuiaba");
    const spInv = inventories.find((i: any) => i.city_id === "sao-paulo");

    let availability: "both" | "cuiaba" | "sao-paulo" = "both";
    if (cuiabaInv && spInv) {
      if (cuiabaInv.active && !spInv.active) availability = "cuiaba";
      else if (!cuiabaInv.active && spInv.active) availability = "sao-paulo";
      else availability = "both";
    } else if (cuiabaInv && !spInv) {
      availability = "cuiaba";
    } else if (!cuiabaInv && spInv) {
      availability = "sao-paulo";
    }

    setDraft({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description || "",
      flavor_profile: p.flavor_profile || "",
      intensity: p.intensity || "média",
      image_url: p.image_url || "",
      active: p.active ?? true,
      availability,
      cuiaba_price: cuiabaInv ? String(cuiabaInv.price) : String(p.price),
      cuiaba_stock: cuiabaInv ? Number(cuiabaInv.stock) : 15,
      sao_paulo_price: spInv ? String(spInv.price) : String(p.price),
      sao_paulo_stock: spInv ? Number(spInv.stock) : 15,
    });
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);

    const cuiabaPrice = Number(String(draft.cuiaba_price).replace(",", ".")) || 0;
    const saoPauloPrice = Number(String(draft.sao_paulo_price).replace(",", ".")) || 0;
    const basePrice = draft.availability === "sao-paulo" ? saoPauloPrice : cuiabaPrice;

    const payload = {
      name: draft.name,
      category: draft.category,
      price: basePrice,
      description: draft.description || "",
      flavor_profile: draft.flavor_profile || "",
      intensity: draft.intensity || "média",
      active: draft.active,
      image_url: draft.image_url || "",
    };

    let productId = draft.id;
    if (productId) {
      await supabase.from("products").update(payload).eq("id", productId);
    } else {
      const { data: newProd, error: insertErr } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (!insertErr && newProd) {
        productId = newProd.id;
      }
    }

    // Upsert dos inventários independentes de cada cidade
    if (productId) {
      try {
        const isCuiabaActive = draft.active && (draft.availability === "both" || draft.availability === "cuiaba");
        const isSpActive = draft.active && (draft.availability === "both" || draft.availability === "sao-paulo");

        await (supabase.from("product_city_inventories") as any).upsert([
          {
            product_id: productId,
            city_id: "cuiaba",
            price: cuiabaPrice,
            stock: Number(draft.cuiaba_stock) || 0,
            active: isCuiabaActive,
            updated_at: new Date().toISOString(),
          },
          {
            product_id: productId,
            city_id: "sao-paulo",
            price: saoPauloPrice,
            stock: Number(draft.sao_paulo_stock) || 0,
            active: isSpActive,
            updated_at: new Date().toISOString(),
          },
        ], { onConflict: "product_id,city_id" });
      } catch (invErr) {
        console.warn("Aviso ao sincronizar product_city_inventories:", invErr);
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Catálogo de Produtos Multicidade</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie preços, estoques e disponibilidades independentes para Cuiabá e São Paulo.
          </p>
        </div>

        <Button
          onClick={() =>
            setDraft({
              name: "",
              category: "Essência",
              description: "",
              flavor_profile: "Frutado",
              intensity: "média",
              active: true,
              image_url: "",
              availability: "both",
              cuiaba_price: "44.90",
              cuiaba_stock: 15,
              sao_paulo_price: "49.90",
              sao_paulo_stock: 15,
            })
          }
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-glow"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Seletor / Filtro de Cidade do Painel */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Filtrar por praça:</span>
        <button
          type="button"
          onClick={() => setSelectedCityFilter("all")}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            selectedCityFilter === "all"
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          Todos os produtos ({rawProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCityFilter("cuiaba")}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            selectedCityFilter === "cuiaba"
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          📍 Cuiabá — MT
        </button>
        <button
          type="button"
          onClick={() => setSelectedCityFilter("sao-paulo")}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
            selectedCityFilter === "sao-paulo"
              ? "bg-primary text-primary-foreground shadow-glow"
              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          📍 São Paulo — SP
        </button>
      </div>

      {/* Formulário de Cadastro / Edição com Preços e Estoques Independentes */}
      {draft && (
        <form onSubmit={handleSaveProduct} className="rounded-2xl border border-primary/40 bg-card/90 p-5 space-y-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {draft.id ? "Editar Produto & Inventário por Cidade" : "Cadastrar Novo Produto Multicidade"}
            </h3>
            {draft.id && <span className="text-[11px] font-mono text-muted-foreground">{draft.id}</span>}
          </div>

          {/* Dados Principais do Produto */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold">Nome do Produto</Label>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex: Essência Dubaim Apple"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Categoria</Label>
              <Input
                required
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Pod Descartável, Essência, Carvão..."
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Perfil de Sabor</Label>
              <Input
                value={draft.flavor_profile}
                onChange={(e) => setDraft({ ...draft, flavor_profile: e.target.value })}
                placeholder="Menta, Cítrico, Frutas Vermelhas..."
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <ImageUploadField
                label="Foto / Imagem do Produto"
                value={draft.image_url}
                onChange={(url) => setDraft({ ...draft, image_url: url })}
                folderPrefix="produto"
                helperText="Selecione a foto do produto salva no computador (PNG, JPG, WEBP, GIF)."
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição do Produto</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Detalhes e características do produto..."
                className="mt-1 text-sm"
              />
            </div>
          </div>

          {/* CONFIGURAÇÃO DE DISPONIBILIDADE POR CIDADE */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
            <div>
              <Label className="text-xs font-bold text-white uppercase tracking-wider">
                Disponibilidade do Produto nas Praças
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, availability: "both" })}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    draft.availability === "both"
                      ? "border-primary bg-primary/20 text-primary shadow-glow"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  ✓ Ambas as Cidades
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, availability: "cuiaba" })}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    draft.availability === "cuiaba"
                      ? "border-primary bg-primary/20 text-primary shadow-glow"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Somente Cuiabá
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, availability: "sao-paulo" })}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                    draft.availability === "sao-paulo"
                      ? "border-primary bg-primary/20 text-primary shadow-glow"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Somente São Paulo
                </button>
              </div>
            </div>

            {/* PREÇOS E ESTOQUES INDEPENDENTES */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-800/80">
              {/* Box Cuiabá */}
              <div
                className={`rounded-xl border p-3.5 space-y-3 transition-opacity ${
                  draft.availability === "both" || draft.availability === "cuiaba"
                    ? "border-purple-500/40 bg-purple-950/15"
                    : "border-slate-800/60 bg-slate-900/30 opacity-40 pointer-events-none"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-purple-400" /> Cuiabá — MT
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {draft.availability === "sao-paulo" ? "Inativo nesta cidade" : "Ativo"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-300">Preço Cuiabá (R$)</Label>
                    <Input
                      value={draft.cuiaba_price}
                      onChange={(e) => setDraft({ ...draft, cuiaba_price: e.target.value })}
                      placeholder="89.90"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-300">Estoque Cuiabá (un.)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={draft.cuiaba_stock}
                      onChange={(e) => setDraft({ ...draft, cuiaba_stock: Number(e.target.value) })}
                      placeholder="15"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Box São Paulo */}
              <div
                className={`rounded-xl border p-3.5 space-y-3 transition-opacity ${
                  draft.availability === "both" || draft.availability === "sao-paulo"
                    ? "border-cyan-500/40 bg-cyan-950/15"
                    : "border-slate-800/60 bg-slate-900/30 opacity-40 pointer-events-none"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-cyan-400" /> São Paulo — SP
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {draft.availability === "cuiaba" ? "Inativo nesta cidade" : "Ativo"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-300">Preço SP (R$)</Label>
                    <Input
                      value={draft.sao_paulo_price}
                      onChange={(e) => setDraft({ ...draft, sao_paulo_price: e.target.value })}
                      placeholder="94.90"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-300">Estoque SP (un.)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={draft.sao_paulo_stock}
                      onChange={(e) => setDraft({ ...draft, sao_paulo_stock: Number(e.target.value) })}
                      placeholder="15"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={draft.active} onCheckedChange={(val) => setDraft({ ...draft, active: val })} />
              <span className="text-xs text-slate-200">Produto ativo e disponível para venda</span>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow text-xs">
                {busy ? "Salvando..." : "Salvar Produto & Cidades"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Grid de Produtos Cadastrados */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando catálogo...</p>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-card/40 p-10 text-center text-muted-foreground text-xs">
          Nenhum produto cadastrado para a praça selecionada.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p: any) => {
            const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
            const cuiabaInv = inventories.find((i: any) => i.city_id === "cuiaba");
            const spInv = inventories.find((i: any) => i.city_id === "sao-paulo");

            const isCuiabaActive = cuiabaInv ? cuiabaInv.active : true;
            const isSpActive = spInv ? spInv.active : true;

            const cuiabaPrice = cuiabaInv ? Number(cuiabaInv.price) : Number(p.price);
            const cuiabaStock = cuiabaInv ? Number(cuiabaInv.stock) : 15;
            const spPrice = spInv ? Number(spInv.price) : Number(p.price);
            const spStock = spInv ? Number(spInv.stock) : 15;

            return (
              <div key={p.id} className="rounded-2xl border border-slate-800 bg-card/60 p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
                <div>
                  <div className="flex gap-3">
                    {p.image_url ? (
                      <div className="h-14 w-14 rounded-xl border border-slate-800 bg-slate-950 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">{p.category}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {p.active ? "Ativo no Site" : "Pausado"}
                        </span>
                      </div>

                      <h4 className="mt-1 font-bold text-white text-sm truncate">{p.name}</h4>
                      {p.flavor_profile && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Sabor: {p.flavor_profile}</p>
                      )}
                    </div>
                  </div>

                  {/* Detalhes de Preço e Estoque por Cidade */}
                  <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-2 py-1">
                      <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-purple-400" /> Cuiabá:
                      </span>
                      {isCuiabaActive ? (
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{formatBRL(cuiabaPrice)}</strong>
                          <span className="text-[10px] text-muted-foreground">({cuiabaStock} un.)</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-400 italic">Indisponível</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-2 py-1">
                      <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-cyan-400" /> São Paulo:
                      </span>
                      {isSpActive ? (
                        <div className="flex items-center gap-2">
                          <strong className="text-white font-bold">{formatBRL(spPrice)}</strong>
                          <span className="text-[10px] text-muted-foreground">({spStock} un.)</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-rose-400 italic">Indisponível</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-800 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => openEditProduct(p)} className="text-xs gap-1">
                    <Edit2 className="h-3.5 w-3.5 text-primary" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(p.id, p.name)} className="text-xs text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
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
  const [selectedCityFilter, setSelectedCityFilter] = useState<"all" | "cuiaba" | "sao-paulo">("all");

  const { data: rawOrders = [], isLoading } = useQuery({
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

  const orders = rawOrders.filter((o: any) => {
    if (selectedCityFilter === "all") return true;
    const orderCity = (o.city_id || (o.address?.toLowerCase().includes("são paulo") ? "sao-paulo" : "cuiaba"));
    return orderCity === selectedCityFilter;
  });

  async function handleUpdateOrderStatus(id: string, newStatus: string) {
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de Pedidos & Entregas por Cidade</h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe pedidos recebidos em Cuiabá e São Paulo, aprove pagamentos e despache entregas.
          </p>
        </div>

        {/* Filtro de Cidade para Pedidos */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedCityFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCityFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityFilter("cuiaba")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCityFilter === "cuiaba" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
            }`}
          >
            Cuiabá
          </button>
          <button
            type="button"
            onClick={() => setSelectedCityFilter("sao-paulo")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCityFilter === "sao-paulo" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-white"
            }`}
          >
            São Paulo
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-card/40 p-8 text-center text-muted-foreground text-sm">
          Nenhum pedido registrado para a praça selecionada.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const cleanPhone = (o.phone || "").replace(/\D/g, "");
            const whatsLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%2C%20sobre%20seu%20pedido%20na%20Pantanal%20Smoke` : null;
            const isSP = o.city_id === "sao-paulo" || o.address?.toLowerCase().includes("são paulo");

            return (
              <div key={o.id} className="rounded-2xl border border-slate-800 bg-card/60 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Badge da Cidade do Pedido */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        isSP
                          ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-300"
                          : "border-purple-500/40 bg-purple-950/30 text-purple-300"
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {isSP ? "São Paulo — SP" : "Cuiabá — MT"}
                    </span>

                    <div>
                      <h3 className="font-bold text-white text-base">{o.customer_name || "Cliente Pantanal"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("pt-BR")} · Pedido #{o.id.slice(0, 8)}
                      </p>
                    </div>
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

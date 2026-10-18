import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Edit2,
  Eye,
  FileText,
  Filter,
  HelpCircle,
  ImagePlus,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Palette,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ProductImage } from "@/components/ProductImage";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, resolveProductImage } from "@/lib/brasa";
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
        content: "Sistema exclusivo de gestão e administração da Pantanal Smoke.",
      },
    ],
  }),
  component: AdminPage,
});

type AuthViewMode = "loading" | "login" | "forgot_password" | "reset_password" | "dashboard";
type AdminSection =
  | "dashboard"
  | "pedidos"
  | "produtos"
  | "cidades"
  | "personalizar"
  | "clientes"
  | "configuracoes";

function AdminPage() {
  const [authMode, setAuthMode] = useState<AuthViewMode>("loading");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Formulários de autenticação
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
        const isRecoveryUrl =
          typeof window !== "undefined" &&
          (window.location.hash.includes("type=recovery") ||
            window.location.search.includes("type=recovery") ||
            window.location.href.includes("type=recovery"));

        if (isRecoveryUrl) {
          if (isMounted) setAuthMode("reset_password");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          if (isMounted) setAuthMode("login");
          return;
        }

        const isAdmin = await verifyUserIsAdmin(user.id);
        if (isAdmin && isMounted) {
          setCurrentUserEmail(user.email || ADMIN_CONFIG.email);
          setAuthMode("dashboard");
        } else {
          if (isMounted) {
            setAuthMode("login");
            setErrorMessage("Acesso restrito: este usuário não possui papel de administrador.");
          }
        }
      } catch (err) {
        console.error("Erro na verificação administrativa:", err);
        if (isMounted) setAuthMode("login");
      }
    }

    checkCurrentSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset_password");
      } else if (event === "SIGNED_IN" && session?.user) {
        const isAdmin = await verifyUserIsAdmin(session.user.id);
        if (isAdmin) {
          setCurrentUserEmail(session.user.email || ADMIN_CONFIG.email);
          setAuthMode("dashboard");
        } else {
          setAuthMode("login");
          setErrorMessage("Acesso negado: Este usuário não possui privilégios de administrador.");
        }
      } else if (event === "SIGNED_OUT") {
        setAuthMode("login");
        setCurrentUserEmail("");
      }
    });

    const handleCustomAuthChange = () => {
      checkCurrentSession();
    };
    window.addEventListener("pantanal_admin_auth_changed", handleCustomAuthChange);

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener("pantanal_admin_auth_changed", handleCustomAuthChange);
    };
  }, []);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await loginAdminWithSupabase(emailInput, passwordInput);

    if (result.success) {
      setCurrentUserEmail(emailInput.trim().toLowerCase());
      setPasswordInput("");
      setAuthMode("dashboard");
    } else {
      setErrorMessage(result.error || "Falha no login administrativo.");
    }
    setIsSubmitting(false);
  }

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await requestAdminPasswordReset(emailInput);
    if (result.success) {
      setSuccessMessage("Link de redefinição enviado com sucesso! Verifique sua caixa de entrada.");
    } else {
      setErrorMessage(result.error || "Erro ao solicitar redefinição de senha.");
    }
    setIsSubmitting(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMessage("As senhas informadas não coincidem.");
      setIsSubmitting(false);
      return;
    }

    const result = await updateAdminPassword(newPasswordInput);
    if (result.success) {
      setSuccessMessage("Senha administrativa atualizada com sucesso! Acessando painel...");
      setTimeout(() => {
        setAuthMode("dashboard");
      }, 1500);
    } else {
      setErrorMessage(result.error || "Erro ao atualizar senha.");
    }
    setIsSubmitting(false);
  }

  async function handleLogout() {
    await logoutAdmin();
    setAuthMode("login");
    setPasswordInput("");
  }

  // --- Telas de Autenticação / Loading ---
  if (authMode === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-300">Validando permissões administrativas...</p>
        </div>
      </main>
    );
  }

  if (authMode === "login") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 border border-primary/40 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Painel de Gestão</h1>
            <p className="text-xs text-slate-400 mt-1">Ambiente exclusivo da administração Pantanal Smoke</p>
          </div>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">E-mail do Administrador</Label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@pantanalsmoke.com.br"
                className="mt-1.5 bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300">Senha Master</Label>
                <button
                  type="button"
                  onClick={() => setAuthMode("forgot_password")}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow mt-2"
            >
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Entrar no Sistema de Gestão
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <Link to="/" className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors">
              ← Acessar a loja pública como cliente
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (authMode === "forgot_password") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Recuperação de Senha</h1>
            <p className="text-xs text-slate-400 mt-1">
              Informe seu e-mail cadastrado para receber o link de redefinição
            </p>
          </div>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">E-mail Administrativo</Label>
              <Input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@pantanalsmoke.com.br"
                className="mt-1.5 bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-glow"
            >
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Enviar Link de Redefinição
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-xs text-primary hover:underline"
            >
              ← Voltar para o Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (authMode === "reset_password") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Criar Nova Senha Master</h1>
            <p className="text-xs text-slate-400 mt-1">Defina sua nova credencial de segurança</p>
          </div>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Nova Senha</Label>
              <Input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1.5 bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Repita a senha"
                className="mt-1.5 bg-slate-950/60 border-slate-800 text-white"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-glow"
            >
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Nova Senha
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar e ir para Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Painel Master Autenticado (Layout Dedicado & Profissional) ---
  return <MasterAdminApp onLogout={handleLogout} userEmail={currentUserEmail} />;
}

// ==========================================
// APLICAÇÃO ADMINISTRATIVA MASTER
// ==========================================
function MasterAdminApp({
  onLogout,
  userEmail,
}: {
  onLogout: () => void;
  userEmail: string;
}) {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const queryClient = useQueryClient();
  const { settings, saveSettings } = useStoreSettings();

  // Consulta de pedidos reais no Supabase com reconciliação segura
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      let dbOrders: any[] = [];
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (!error && data) dbOrders = data;
      } catch (err) {
        console.warn("Aviso ao carregar pedidos do Supabase:", err);
      }

      let cachedOrders: any[] = [];
      if (typeof window !== "undefined") {
        try {
          cachedOrders = JSON.parse(localStorage.getItem("pantanal_saved_orders") || "[]");
        } catch {
          // ignore
        }
      }

      const dbIds = new Set(dbOrders.map((o) => o.id));
      const pendingLocal = cachedOrders.filter((co) => !dbIds.has(co.id));

      return [...pendingLocal, ...dbOrders];
    },
    refetchInterval: 15000,
  });

  // Consulta de produtos cadastrados no Supabase com inventários
  const { data: rawProducts = [], isLoading: isLoadingProducts } = useQuery({
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

  // Itens de navegação
  const navItems = [
    {
      id: "dashboard" as AdminSection,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "pedidos" as AdminSection,
      label: "Pedidos & Entregas",
      icon: Truck,
      badge: orders.filter((o: any) => o.status === "pendente" || o.status === "aguardando_pagamento").length || null,
    },
    {
      id: "produtos" as AdminSection,
      label: "Catálogo de Produtos",
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: "cidades" as AdminSection,
      label: "Cidades & Entregas",
      icon: MapPin,
      badge: null,
    },
    {
      id: "personalizar" as AdminSection,
      label: "Personalizar Site",
      icon: Palette,
      badge: null,
    },
    {
      id: "clientes" as AdminSection,
      label: "Clientes & Cashback",
      icon: Coins,
      badge: null,
    },
    {
      id: "configuracoes" as AdminSection,
      label: "Configurações Gerais",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-800 bg-slate-900/70 p-5 backdrop-blur-xl">
        {/* Topo Sidebar */}
        <div className="flex items-center gap-3 px-2 py-3 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-800 text-white shadow-glow">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white uppercase">Pantanal Smoke</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistema de Gestão
            </div>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="mt-6 flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-glow font-bold"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? "bg-white text-primary" : "bg-primary/20 text-primary border border-primary/40"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 text-xs">
            <p className="text-[11px] text-slate-400">Administrador Conectado:</p>
            <p className="truncate font-semibold text-white mt-0.5">{userEmail || ADMIN_CONFIG.email}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-1 border-slate-800 hover:bg-slate-800 text-xs text-slate-300"
            >
              <Link to="/" target="_blank">
                <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
                Ver Loja
              </Link>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="text-xs"
              title="Encerrar Sessão"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* CABEÇALHO SUPERIOR (Desktop & Mobile) */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-white capitalize">
                {navItems.find((n) => n.id === activeSection)?.label}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-400">
                Painel Administrativo Independente da Pantanal Smoke
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                queryClient.invalidateQueries({ queryKey: ["admin-products"] });
              }}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Atualizar Dados</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="text-xs gap-1.5 lg:hidden"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </header>

        {/* MENU MOBILE EXPANSÍVEL */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-900 p-4 space-y-1.5 animate-in slide-in-from-top-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                    isActive ? "bg-primary text-white font-bold" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* CORPO DO CONTEÚDO */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeSection === "dashboard" && (
            <AdminDashboardSection
              orders={orders}
              products={rawProducts}
              onNavigate={(section) => setActiveSection(section)}
            />
          )}

          {activeSection === "pedidos" && <OrdersManagementSection orders={orders} />}

          {activeSection === "produtos" && <ProductsManagementSection />}

          {activeSection === "cidades" && <CitiesCommercialSection />}

          {activeSection === "personalizar" && (
            <CustomizeSiteSection settings={settings} onSaveSettings={saveSettings} />
          )}

          {activeSection === "clientes" && <CustomersCashbackSection orders={orders} />}

          {activeSection === "configuracoes" && (
            <GeneralSettingsSection
              settings={settings}
              onSaveSettings={saveSettings}
              userEmail={userEmail}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// SEÇÃO 1: DASHBOARD EXECUTIVO COM DADOS REAIS
// ==========================================
function AdminDashboardSection({
  orders,
  products,
  onNavigate,
}: {
  orders: any[];
  products: any[];
  onNavigate: (section: AdminSection) => void;
}) {
  // Cálculos com dados reais
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === "pendente" || o.status === "aguardando_pagamento");
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "entregue" || o.status === "pago");
  }, [orders]);

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active !== false && p.category !== "_system_settings");
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
      if (inventories.length > 0) {
        return inventories.some((inv: any) => inv.active && Number(inv.stock) <= 5);
      }
      return typeof p.stock === "number" && p.stock <= 5;
    });
  }, [products]);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Boas-vindas e Alertas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-primary/10 p-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Ambiente Operacional Ativo
          </div>
          <h2 className="mt-2 text-xl font-extrabold text-white">Visão Geral da Pantanal Smoke</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas em tempo real integradas com as praças de Cuiabá e São Paulo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => onNavigate("pedidos")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-glow"
          >
            <Truck className="h-3.5 w-3.5" />
            Ver Pedidos ({orders.length})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate("produtos")}
            className="border-slate-800 hover:bg-slate-800 text-xs text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* 4 CARDS DE INDICADORES (KPIs REAIS) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Faturamento */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Faturamento Registrado</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{formatBRL(totalRevenue)}</div>
          <p className="text-[11px] text-slate-500">Total acumulado em pedidos registrados</p>
        </div>

        {/* Card 2: Pedidos Recebidos */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de Pedidos</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{orders.length}</div>
          <p className="text-[11px] text-amber-400 font-semibold">
            {pendingOrders.length} pedido(s) pendente(s) de envio
          </p>
        </div>

        {/* Card 3: Produtos Cadastrados */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Produtos Cadastrados</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{products.length}</div>
          <p className="text-[11px] text-slate-400">{activeProducts.length} itens ativos no catálogo</p>
        </div>

        {/* Card 4: Estoque Baixo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Atenção ao Estoque</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{lowStockProducts.length}</div>
          <p className="text-[11px] text-slate-500">Produtos com 5 ou menos unidades</p>
        </div>
      </div>

      {/* Grid: Pedidos Recentes + Alerta de Estoque */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabela de Pedidos Recentes (2 colunas) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Pedidos Recentes</h3>
              <p className="text-[11px] text-slate-400">Últimos pedidos recebidos no sistema</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("pedidos")}
              className="text-xs text-primary hover:text-primary/90"
            >
              Ver Todos →
            </Button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum pedido registrado até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {recentOrders.map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{o.customer_name || "Cliente Pantanal"}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {o.city_id === "sao-paulo" ? "SP" : "Cuiabá"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      #{String(o.id).slice(0, 8)} · {new Date(o.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="font-bold text-emerald-400">{formatBRL(o.total || 0)}</span>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          o.status === "entregue" || o.status === "pago"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : o.status === "cancelado"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {o.status || "pendente"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Direita: Alertas & Ações Rápidas */}
        <div className="space-y-4">
          {/* Card: Produtos com Estoque Baixo */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Reposição Urgente
            </h3>
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-400">Todos os estoques estão abastecidos e saudáveis.</p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800"
                  >
                    <span className="truncate max-w-[140px] font-medium text-slate-200">{p.name}</span>
                    <span className="text-rose-400 font-bold">Estoque baixo</span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("produtos")}
                  className="w-full text-xs border-slate-800 mt-2"
                >
                  Gerenciar Estoques
                </Button>
              </div>
            )}
          </div>

          {/* Atalho para Cidades */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Gestão de Praças
            </h4>
            <p className="text-[11px] text-slate-400">
              Alterne horários, taxas de entrega e disponibilidade específica para Cuiabá e São Paulo.
            </p>
            <Button
              size="sm"
              onClick={() => onNavigate("cidades")}
              className="w-full text-xs bg-primary hover:bg-primary/90 text-white mt-1"
            >
              Configurar Cidades
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SEÇÃO 2: GESTÃO COMPLETA DE PEDIDOS
// ==========================================
function OrdersManagementSection({ orders }: { orders: any[] }) {
  const queryClient = useQueryClient();
  const [cityFilter, setCityFilter] = useState<"all" | "cuiaba" | "sao-paulo">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Filtro de cidade
      if (cityFilter !== "all") {
        const orderCity = o.city_id || (o.address?.toLowerCase().includes("são paulo") ? "sao-paulo" : "cuiaba");
        if (orderCity !== cityFilter) return false;
      }

      // Filtro de status
      if (statusFilter !== "all" && o.status !== statusFilter) {
        return false;
      }

      // Busca por cliente, telefone ou protocolo
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (o.customer_name || "").toLowerCase().includes(q);
        const matchPhone = (o.phone || "").toLowerCase().includes(q);
        const matchId = String(o.id || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId) return false;
      }

      return true;
    });
  }, [orders, cityFilter, statusFilter, searchTerm]);

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    try {
      await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    } catch {
      // ignora se offline
    }

    // Atualiza também no cache local
    if (typeof window !== "undefined") {
      try {
        const cached = JSON.parse(localStorage.getItem("pantanal_saved_orders") || "[]");
        const updated = cached.map((o: any) => (o.id === orderId ? { ...o, status: newStatus } : o));
        localStorage.setItem("pantanal_saved_orders", JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  return (
    <div className="space-y-6">
      {/* Topo e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Central de Pedidos & Entregas
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe pedidos recebidos de Cuiabá e São Paulo, consulte itens e despache entregas.
          </p>
        </div>

        {/* Filtros em Barra */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Cidade */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setCityFilter("all")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                cityFilter === "all" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setCityFilter("cuiaba")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                cityFilter === "cuiaba" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Cuiabá
            </button>
            <button
              type="button"
              onClick={() => setCityFilter("sao-paulo")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                cityFilter === "sao-paulo" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              São Paulo
            </button>
          </div>

          {/* Seletor de Situação */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="enviado">Enviado</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Campo de Busca Rápida */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome do cliente, telefone ou protocolo..."
          className="pl-10 bg-slate-900/80 border-slate-800 text-xs text-white"
        />
      </div>

      {/* Lista de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 text-xs">
          Nenhum pedido encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((o) => {
            const cleanPhone = (o.phone || "").replace(/\D/g, "");
            const whatsLink = cleanPhone
              ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                  o.customer_name || ""
                )}%2C%20sobre%20seu%20pedido%20na%20Pantanal%20Smoke...`
              : null;
            const isSP = o.city_id === "sao-paulo" || o.address?.toLowerCase().includes("são paulo");
            const items = Array.isArray(o.items) ? o.items : [];

            return (
              <div
                key={o.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4 backdrop-blur-sm transition-all hover:border-slate-700"
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        isSP
                          ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
                          : "border-purple-500/40 bg-purple-950/40 text-purple-300"
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {isSP ? "São Paulo — SP" : "Cuiabá — MT"}
                    </span>

                    <div>
                      <h3 className="font-bold text-white text-base">{o.customer_name || "Cliente Pantanal"}</h3>
                      <p className="text-[11px] text-slate-400">
                        Protocolo #{String(o.id).slice(0, 8)} · {new Date(o.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Badge de Pagamento */}
                    <span
                      className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                        o.payment_status === "aprovado" || o.status === "pago"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {o.payment_status === "aprovado" || o.status === "pago"
                        ? "Pagamento Confirmado"
                        : "Aguardando Pagamento"}
                    </span>

                    {/* Status do Pedido */}
                    <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {o.status || "pendente"}
                    </span>

                    <span className="text-lg font-extrabold text-emerald-400">
                      {formatBRL(o.total || 0)}
                    </span>
                  </div>
                </div>

                {/* Grid: Endereço & Contato */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800/80">
                    <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Endereço de Entrega:
                    </p>
                    <p className="mt-1 text-slate-400 leading-relaxed">{o.address || "Endereço não informado"}</p>
                  </div>

                  <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800/80">
                    <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" /> Contato do Cliente:
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-slate-400">
                      <span>{o.phone || "Sem telefone"}</span>
                      {whatsLink && (
                        <a
                          href={whatsLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de Itens do Pedido */}
                {items.length > 0 && (
                  <div className="rounded-xl border border-slate-800/60 bg-slate-950/30 p-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-300 mb-1">Itens do Pedido:</p>
                    {items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-slate-400 text-[11px]">
                        <span>
                          <strong>{item.qty}x</strong> {item.name}
                        </span>
                        <span>{formatBRL(Number(item.price || 0) * Number(item.qty || 1))}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rodapé e Ações do Pedido */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="text-slate-400">
                    Forma de pagamento:{" "}
                    <strong className="text-white uppercase">{o.payment_method || "Online"}</strong>
                    {o.cashback_used > 0 && (
                      <span className="ml-2 text-emerald-400 font-semibold">
                        (Usou {formatBRL(o.cashback_used)} de cashback)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(o.id, "pago")}
                      className="text-xs text-emerald-400 border-slate-800 hover:bg-slate-800"
                    >
                      Aprovar Pagamento
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(o.id, "enviado")}
                      className="text-xs text-primary border-slate-800 hover:bg-slate-800"
                    >
                      Despachar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(o.id, "entregue")}
                      className="text-xs text-cyan-400 border-slate-800 hover:bg-slate-800"
                    >
                      Marcar Entregue
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdateStatus(o.id, "cancelado")}
                      className="text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      Cancelar
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

// ==========================================
// SEÇÃO 3: GESTÃO COMPLETA DO CATÁLOGO DE PRODUTOS
// ==========================================
function ProductsManagementSection() {
  const queryClient = useQueryClient();
  const { settings, saveSettings } = useStoreSettings();

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

  const orderList = settings.productOrder || [];
  const validRawProducts = rawProducts.filter((p: any) => p.category !== "_system_settings");
  const sortedRawProducts = [...validRawProducts].sort((a: any, b: any) => {
    const idxA = orderList.indexOf(a.id);
    const idxB = orderList.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const products = sortedRawProducts.filter((p: any) => {
    if (selectedCityFilter === "all") return true;
    const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
    if (inventories.length === 0) return true;
    const inv = inventories.find((i: any) => i.city_id === selectedCityFilter);
    return inv ? inv.active === true : false;
  });

  async function handleMoveProduct(productId: string, direction: "up" | "down") {
    const currentIds = sortedRawProducts.map((p: any) => p.id);
    const currentIndex = currentIds.indexOf(productId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const updatedIds = [...currentIds];
    const [movedId] = updatedIds.splice(currentIndex, 1);
    updatedIds.splice(targetIndex, 0, movedId);

    await saveSettings({
      ...settings,
      productOrder: updatedIds,
    });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  function openNewProduct() {
    setDraft({
      id: null,
      name: "",
      category: "Pod Descartável",
      description: "",
      flavor_profile: "",
      intensity: "média",
      image_url: "",
      active: true,
      availability: "both",
      cuiaba_price: "99.90",
      cuiaba_stock: 15,
      sao_paulo_price: "99.90",
      sao_paulo_stock: 15,
      badge: "nenhum",
      promo_price: "",
      order_position: String(sortedRawProducts.length + 1),
    });
  }

  function openEditProduct(p: any) {
    const inventories = Array.isArray(p.product_city_inventories) ? p.product_city_inventories : [];
    const citySettings = settings.cityInventories?.[p.id];
    const cuiabaInv =
      inventories.find((i: any) => i.city_id === "cuiaba") ||
      (citySettings?.cuiaba ? { city_id: "cuiaba", ...citySettings.cuiaba } : null);
    const spInv =
      inventories.find((i: any) => i.city_id === "sao-paulo") ||
      (citySettings?.["sao-paulo"] ? { city_id: "sao-paulo", ...citySettings["sao-paulo"] } : null);

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

    const currentBadge = (settings.productBadges && settings.productBadges[p.id]) || "nenhum";
    const currentPromoPrice = (settings.productPromoPrices && settings.productPromoPrices[p.id]) || "";
    const orderIndex = sortedRawProducts.findIndex((item: any) => item.id === p.id);
    const currentPos = orderIndex !== -1 ? orderIndex + 1 : sortedRawProducts.length;

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
      badge: currentBadge,
      promo_price: currentPromoPrice ? String(currentPromoPrice) : "",
      order_position: String(currentPos),
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
      const { error: updateErr } = await supabase.from("products").update(payload).eq("id", productId);
      if (updateErr) {
        alert(`Erro ao atualizar produto: ${updateErr.message}`);
        setBusy(false);
        return;
      }
    } else {
      const { data: newProd, error: insertErr } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();
      if (insertErr || !newProd) {
        alert(`Erro ao cadastrar produto: ${insertErr?.message}`);
        setBusy(false);
        return;
      }
      productId = newProd.id;
    }

    // Atualiza inventários por cidade
    const cuiabaActive = draft.active && (draft.availability === "both" || draft.availability === "cuiaba");
    const spActive = draft.active && (draft.availability === "both" || draft.availability === "sao-paulo");

    try {
      await (supabase as any).from("product_city_inventories").upsert(
        [
          {
            product_id: productId,
            city_id: "cuiaba",
            price: cuiabaPrice,
            stock: Number(draft.cuiaba_stock) || 0,
            active: cuiabaActive,
          },
          {
            product_id: productId,
            city_id: "sao-paulo",
            price: saoPauloPrice,
            stock: Number(draft.sao_paulo_stock) || 0,
            active: spActive,
          },
        ],
        { onConflict: "product_id,city_id" }
      );
    } catch (invErr) {
      console.warn("Aviso ao sincronizar inventários:", invErr);
    }

    // Atualiza Destaques, Promoções e Ordenação
    const updatedBadges = { ...(settings.productBadges || {}) };
    const updatedPromoPrices = { ...(settings.productPromoPrices || {}) };

    if (draft.badge && draft.badge !== "nenhum") {
      updatedBadges[productId] = draft.badge;
    } else {
      delete updatedBadges[productId];
    }

    const promoPriceNum = Number(String(draft.promo_price).replace(",", "."));
    if (promoPriceNum > 0) {
      updatedPromoPrices[productId] = promoPriceNum;
    } else {
      delete updatedPromoPrices[productId];
    }

    let updatedOrder = [...(settings.productOrder || [])];
    if (!updatedOrder.includes(productId)) {
      updatedOrder.push(productId);
    }

    const updatedCityInventories = { ...(settings.cityInventories || {}) };
    updatedCityInventories[productId] = {
      cuiaba: {
        price: cuiabaPrice,
        stock: Number(draft.cuiaba_stock) || 0,
        active: cuiabaActive,
      },
      "sao-paulo": {
        price: saoPauloPrice,
        stock: Number(draft.sao_paulo_stock) || 0,
        active: spActive,
      },
    };

    await saveSettings({
      ...settings,
      cityInventories: updatedCityInventories,
      productBadges: updatedBadges,
      productPromoPrices: updatedPromoPrices,
      productOrder: updatedOrder,
    });

    setBusy(false);
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Tem certeza que deseja excluir permanentemente este produto?")) return;
    setBusy(true);

    try {
      await (supabase as any).from("product_city_inventories").delete().eq("product_id", productId);
      await supabase.from("products").delete().eq("id", productId);
    } catch {
      // ignore
    }

    const updatedBadges = { ...(settings.productBadges || {}) };
    delete updatedBadges[productId];

    const updatedPromoPrices = { ...(settings.productPromoPrices || {}) };
    delete updatedPromoPrices[productId];

    const updatedCityInventories = { ...(settings.cityInventories || {}) };
    delete updatedCityInventories[productId];

    const updatedOrder = (settings.productOrder || []).filter((id) => id !== productId);

    await saveSettings({
      ...settings,
      cityInventories: updatedCityInventories,
      productBadges: updatedBadges,
      productPromoPrices: updatedPromoPrices,
      productOrder: updatedOrder,
    });

    setBusy(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div className="space-y-6">
      {/* Topo do Catálogo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Gestão do Catálogo de Produtos
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre, edite imagens, gerencie estoque por praça e organize a sequência do catálogo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Cidade */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCityFilter("all")}
              className={`px-3 py-1 rounded-lg font-semibold ${
                selectedCityFilter === "all" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setSelectedCityFilter("cuiaba")}
              className={`px-3 py-1 rounded-lg font-semibold ${
                selectedCityFilter === "cuiaba" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Cuiabá
            </button>
            <button
              type="button"
              onClick={() => setSelectedCityFilter("sao-paulo")}
              className={`px-3 py-1 rounded-lg font-semibold ${
                selectedCityFilter === "sao-paulo" ? "bg-primary text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              São Paulo
            </button>
          </div>

          <Button
            size="sm"
            onClick={openNewProduct}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {/* Formulário / Modal de Criação / Edição */}
      {draft && (
        <form
          onSubmit={handleSaveProduct}
          className="rounded-2xl border border-primary/40 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-5 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {draft.id ? "Editar Produto Cadastrado" : "Cadastrar Novo Produto"}
            </h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)} className="text-xs">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Nome do Produto</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex: Pod Descartável Ignite V80"
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Categoria</Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Ex: Pod Descartável, Essências, Narguilé"
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Descrição Completa</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Descreva detalhes, capacidade, bateria, qualidade..."
              rows={3}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Perfil de Sabor</Label>
              <Input
                value={draft.flavor_profile}
                onChange={(e) => setDraft({ ...draft, flavor_profile: e.target.value })}
                placeholder="Ex: Menta Gelada, Uva Ice"
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Intensidade</Label>
              <select
                value={draft.intensity}
                onChange={(e) => setDraft({ ...draft, intensity: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="suave">Suave</option>
                <option value="média">Média</option>
                <option value="forte">Forte</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Disponibilidade por Praça</Label>
              <select
                value={draft.availability}
                onChange={(e) => setDraft({ ...draft, availability: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="both">Ambas (Cuiabá e São Paulo)</option>
                <option value="cuiaba">Apenas Cuiabá</option>
                <option value="sao-paulo">Apenas São Paulo</option>
              </select>
            </div>
          </div>

          {/* Upload de Imagem do Computador */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <ImageUploadField
              label="Foto do Produto (Upload direto do computador)"
              value={draft.image_url}
              onChange={(url) => setDraft({ ...draft, image_url: url })}
              folderPrefix="catalog"
              helperText="Envie fotos em JPG, PNG ou WEBP diretamente do seu computador sem precisar colar link."
            />
          </div>

          {/* Preços e Estoques por Cidade */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Cuiabá — MT</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-400">Preço (R$)</Label>
                  <Input
                    value={draft.cuiaba_price}
                    onChange={(e) => setDraft({ ...draft, cuiaba_price: e.target.value })}
                    className="mt-1 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400">Estoque</Label>
                  <Input
                    type="number"
                    value={draft.cuiaba_stock}
                    onChange={(e) => setDraft({ ...draft, cuiaba_stock: Number(e.target.value) })}
                    className="mt-1 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">São Paulo — SP</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-slate-400">Preço (R$)</Label>
                  <Input
                    value={draft.sao_paulo_price}
                    onChange={(e) => setDraft({ ...draft, sao_paulo_price: e.target.value })}
                    className="mt-1 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400">Estoque</Label>
                  <Input
                    type="number"
                    value={draft.sao_paulo_stock}
                    onChange={(e) => setDraft({ ...draft, sao_paulo_stock: Number(e.target.value) })}
                    className="mt-1 bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Destaques e Promoções */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Selo de Destaque no Catálogo</Label>
              <select
                value={draft.badge}
                onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                className="mt-1.5 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="nenhum">Nenhum</option>
                <option value="lancamento">🚀 Lançamento</option>
                <option value="promocao">🔥 Super Promoção</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Preço Promocional (Opcional)</Label>
              <Input
                value={draft.promo_price}
                onChange={(e) => setDraft({ ...draft, promo_price: e.target.value })}
                placeholder="Ex: 89.90 (risca o preço original)"
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(checked) => setDraft({ ...draft, active: checked })}
              />
              <span className="text-xs text-slate-300 font-semibold">
                {draft.active ? "Produto Ativo na Loja" : "Produto Pausado (Oculto)"}
              </span>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)} className="text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={busy} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                {busy ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Salvar Produto
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de Produtos do Catálogo */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Carregando catálogo de produtos...</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 text-xs">
          Nenhum produto cadastrado para a visualização selecionada.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, idx) => {
            const badge = (settings.productBadges && settings.productBadges[p.id]) || "nenhum";
            const promoPrice = (settings.productPromoPrices && settings.productPromoPrices[p.id]) || null;
            const inventories = Array.isArray((p as any).product_city_inventories) ? (p as any).product_city_inventories : [];
            const cuiabaInv = inventories.find((i: any) => i.city_id === "cuiaba");
            const spInv = inventories.find((i: any) => i.city_id === "sao-paulo");

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between space-y-3 transition-all hover:border-slate-700"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                      Posição #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => handleMoveProduct(p.id, "up")}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        title="Subir posição no catálogo"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === products.length - 1}
                        onClick={() => handleMoveProduct(p.id, "down")}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        title="Descer posição no catálogo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-3 items-center">
                    <ProductImage
                      src={p.image_url}
                      alt={p.name}
                      productId={p.id}
                      productName={p.name}
                      glowEffect={false}
                      aspectRatio="auto"
                      containerClassName="h-16 w-16 shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-1"
                      showPlaceholderName={false}
                    />

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-400">{p.category}</p>

                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {badge === "lancamento" && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            LANÇAMENTO
                          </span>
                        )}
                        {badge === "promocao" && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            PROMOÇÃO
                          </span>
                        )}
                        <span className="text-xs font-black text-emerald-400">
                          {promoPrice ? formatBRL(promoPrice) : formatBRL(p.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <div>
                      Cuiabá: <strong className="text-white">{cuiabaInv ? `${cuiabaInv.stock} un` : "15 un"}</strong>
                    </div>
                    <div>
                      São Paulo: <strong className="text-white">{spInv ? `${spInv.stock} un` : "15 un"}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 border-t border-slate-800/80 pt-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditProduct(p)}
                    className="text-xs text-primary hover:text-primary/90 h-8 gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteProduct(p.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 h-8"
                  >
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
// SEÇÃO 4: CIDADES & CONFIGURAÇÕES COMERCIAIS
// ==========================================
function CitiesCommercialSection() {
  const { settings, saveSettings } = useStoreSettings();
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Gestão Comercial por Cidade
          </h2>
          <p className="text-xs text-slate-400">
            Administre regras específicas, disponibilidade de entrega e horários para Cuiabá e São Paulo.
          </p>
        </div>

        <Button type="submit" className="bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 shadow-glow">
          <Save className="h-4 w-4" />
          Salvar Regras Comerciais
        </Button>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Regras comerciais salvas com sucesso!
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* CARD: CUIABÁ */}
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-400" />
              Praça Cuiabá — MT
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              Taxa Fixa R$ 10,00
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Taxa Fixa de Entrega (R$)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.deliveryFeeCuiaba}
                onChange={(e) => setFormData({ ...formData, deliveryFeeCuiaba: Number(e.target.value) })}
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Padrão oficial da loja para entrega em todos os bairros de Cuiabá.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Horário e Prazos de Atendimento</Label>
              <Input
                value={formData.openingHours}
                onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>
        </div>

        {/* CARD: SÃO PAULO */}
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-400" />
              Praça São Paulo — SP
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
              Entrega Prática
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-300">Regra de Entrega em SP</Label>
              <Input
                value="Frete Grátis em bairros selecionados / Expresso sob consulta"
                readOnly
                disabled
                className="mt-1.5 bg-slate-950/40 border-slate-800 text-slate-400"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                A entrega em São Paulo é calculada conforme o bairro e modalidade combinada no checkout.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-300">Prazos de São Paulo</Label>
              <Input
                value="Entregas no mesmo dia ou agendadas conforme disponibilidade"
                readOnly
                disabled
                className="mt-1.5 bg-slate-950/40 border-slate-800 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Cashback */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-400" />
          Regra de Cashback (5% para Clientes Cadastrados)
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-300">Título do Cashback na Loja</Label>
            <Input
              value={formData.cashbackTitle}
              onChange={(e) => setFormData({ ...formData, cashbackTitle: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Percentual de Retorno</Label>
            <Input
              value="5% em todas as compras para clientes com login"
              disabled
              readOnly
              className="mt-1.5 bg-slate-950/40 border-slate-800 text-slate-400"
            />
          </div>
        </div>
      </div>
    </form>
  );
}

// ==========================================
// SEÇÃO 5: PERSONALIZAR SITE
// ==========================================
function CustomizeSiteSection({
  settings,
  onSaveSettings,
}: {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => Promise<void>;
}) {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [editingSlide, setEditingSlide] = useState<BannerSlide | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const faqs = formData.faqs || DEFAULT_STORE_SETTINGS.faqs;

  function handleAddFaq() {
    setFormData({
      ...formData,
      faqs: [...faqs, { id: `faq-${Date.now()}`, question: "", answer: "" }],
    });
  }

  function handleRemoveFaq(index: number) {
    const updated = faqs.filter((_, i) => i !== index);
    setFormData({ ...formData, faqs: updated });
  }

  function handleFaqChange(index: number, field: "question" | "answer", value: string) {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, faqs: updated });
  }

  async function handleToggleBanner(slideId: string) {
    const updated = formData.banners.map((b) => (b.id === slideId ? { ...b, active: !b.active } : b));
    setFormData({ ...formData, banners: updated });
    await onSaveSettings({ ...formData, banners: updated });
  }

  async function handleSaveSlide(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSlide) return;

    const exists = formData.banners.some((b) => b.id === editingSlide.id);
    let updated: BannerSlide[];
    if (exists) {
      updated = formData.banners.map((b) => (b.id === editingSlide.id ? editingSlide : b));
    } else {
      updated = [...formData.banners, editingSlide];
    }

    setFormData({ ...formData, banners: updated });
    await onSaveSettings({ ...formData, banners: updated });
    setEditingSlide(null);
  }

  async function handleDeleteSlide(slideId: string) {
    if (!confirm("Deseja remover este slide?")) return;
    const updated = formData.banners.filter((b) => b.id !== slideId);
    setFormData({ ...formData, banners: updated });
    await onSaveSettings({ ...formData, banners: updated });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSaveSettings(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Personalizar Página Inicial & Conteúdos
          </h2>
          <p className="text-xs text-slate-400">
            Edite banners, anúncios, textos de destaque, Sobre Nós e Perguntas Frequentes diretamente pelo painel.
          </p>
        </div>

        <Button type="submit" className="bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 shadow-glow">
          <Save className="h-4 w-4" />
          Salvar Todas as Alterações
        </Button>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Alterações salvas e publicadas em todo o site com sucesso!
        </div>
      )}

      {/* BLOCO 1: BANNERS E CARROSSEL PRINCIPAL */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Carrossel de Banners da Página Inicial
            </h3>
            <p className="text-[11px] text-slate-400">Alterne e edite os slides em destaque na loja</p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() =>
              setEditingSlide({
                id: `slide-${Date.now()}`,
                badge: "🔥 LANÇAMENTO EXCLUSIVO",
                title: "Novo Pod Descartável",
                puffs: "8000 PUFFS",
                footerPhrase: "Conecte-se à sua vibe",
                imageUrl: "",
                active: true,
                order: formData.banners.length + 1,
              })
            }
            className="text-xs bg-slate-800 hover:bg-slate-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Slide
          </Button>
        </div>

        {/* Modal de Edição de Slide */}
        {editingSlide && (
          <div className="rounded-xl border border-primary/40 bg-slate-950 p-4 space-y-3">
            <h4 className="text-xs font-bold text-white">Editar Slide do Carrossel</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-[11px]">Badge / Selo</Label>
                <Input
                  value={editingSlide.badge}
                  onChange={(e) => setEditingSlide({ ...editingSlide, badge: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Título</Label>
                <Input
                  value={editingSlide.title}
                  onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Puffs / Destaque</Label>
                <Input
                  value={editingSlide.puffs}
                  onChange={(e) => setEditingSlide({ ...editingSlide, puffs: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <ImageUploadField
                label="Imagem do Slide (Upload do Computador)"
                value={editingSlide.imageUrl}
                onChange={(url) => setEditingSlide({ ...editingSlide, imageUrl: url })}
                folderPrefix="banners"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSlide(null)} className="text-xs">
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveSlide} className="bg-primary text-white text-xs">
                Salvar Slide
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {formData.banners.map((b, idx) => (
            <div key={b.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-primary font-bold">Slide #{idx + 1}</span>
                <Switch checked={b.active} onCheckedChange={() => handleToggleBanner(b.id)} />
              </div>
              <h5 className="font-bold text-white truncate">{b.title}</h5>
              <p className="text-[11px] text-slate-400">{b.puffs}</p>
              <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-800/80">
                <Button size="sm" variant="ghost" onClick={() => setEditingSlide(b)} className="h-7 text-xs text-primary">
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteSlide(b.id)} className="h-7 text-xs text-rose-400">
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCO 2: ELEMENTOS DE DESTAQUE DA HOME */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="h-4 w-4 text-primary" />
          Textos de Destaque da Loja
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-300">Barra de Anúncio Superior</Label>
            <Input
              value={formData.announcementText}
              onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
            <div className="flex items-center gap-2 mt-2">
              <Switch
                checked={formData.announcementActive}
                onCheckedChange={(c) => setFormData({ ...formData, announcementActive: c })}
              />
              <span className="text-[11px] text-slate-400">Exibir barra de anúncio no topo</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Frase de Destaque Principal</Label>
            <Input
              value={formData.homeHighlightPhrase}
              onChange={(e) => setFormData({ ...formData, homeHighlightPhrase: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>
        </div>
      </div>

      {/* BLOCO 3: TEXTOS INSTITUCIONAIS (SOBRE NÓS & FAQ) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <FileText className="h-4 w-4 text-primary" />
          Conteúdos Institucionais (Sobre Nós & Perguntas Frequentes)
        </h3>

        {/* Sobre Nós */}
        <div className="space-y-3 text-xs">
          <h4 className="font-bold text-purple-300 uppercase text-[11px]">Página Sobre Nós</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[11px] text-slate-400">Título</Label>
              <Input
                value={formData.aboutUsTitle}
                onChange={(e) => setFormData({ ...formData, aboutUsTitle: e.target.value })}
                className="mt-1 bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-400">Frase da Marca</Label>
              <Input
                value={formData.aboutUsBrandPhrase}
                onChange={(e) => setFormData({ ...formData, aboutUsBrandPhrase: e.target.value })}
                className="mt-1 bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-slate-400">Parágrafos da História (1, 2 e 3)</Label>
            <div className="space-y-2 mt-1">
              <Textarea
                rows={2}
                value={formData.aboutUsParagraph1}
                onChange={(e) => setFormData({ ...formData, aboutUsParagraph1: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
              <Textarea
                rows={2}
                value={formData.aboutUsParagraph2}
                onChange={(e) => setFormData({ ...formData, aboutUsParagraph2: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
              <Textarea
                rows={2}
                value={formData.aboutUsParagraph3}
                onChange={(e) => setFormData({ ...formData, aboutUsParagraph3: e.target.value })}
                className="bg-slate-950 border-slate-800 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Perguntas Frequentes (FAQ) */}
        <div className="space-y-3 text-xs border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-purple-300 uppercase text-[11px]">Perguntas Frequentes (FAQ)</h4>
            <Button type="button" size="sm" onClick={handleAddFaq} className="text-xs bg-slate-800 text-white">
              <Plus className="h-3 w-3 mr-1" /> Nova Pergunta
            </Button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={faq.id || idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary">Pergunta #{idx + 1}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveFaq(idx)}
                    className="h-6 w-6 p-0 text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={faq.question}
                  onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                  placeholder="Pergunta..."
                  className="bg-slate-950 text-xs text-white border-slate-800"
                />
                <Textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                  placeholder="Resposta..."
                  className="bg-slate-950 text-xs text-white border-slate-800"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}

// ==========================================
// SEÇÃO 6: CLIENTES & CASHBACK
// ==========================================
function CustomersCashbackSection({ orders }: { orders: any[] }) {
  const { data: rawProfiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").limit(100);
        if (!error && data) return data;
      } catch {
        // ignore
      }
      return [];
    },
  });

  const { data: cashbackHistory = [] } = useQuery({
    queryKey: ["admin-cashback-history"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("cashback_entries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data) return data;
      } catch {
        // ignore
      }
      return [];
    },
  });

  const totalCashbackUsed = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.cashback_used) || 0), 0);
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-400" />
          Clientes Cadastrados & Gestão de Cashback
        </h2>
        <p className="text-xs text-slate-400">
          Visualize os clientes autenticados, saldos de cashback e histórico de lançamentos.
        </p>
      </div>

      {/* Indicadores de Cashback */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Total de Clientes Registrados</span>
          <div className="text-2xl font-bold text-white">{rawProfiles.length}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Cashback Total Resgatado</span>
          <div className="text-2xl font-bold text-emerald-400">{formatBRL(totalCashbackUsed)}</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
          <span className="text-xs text-slate-400">Regra Ativa</span>
          <div className="text-2xl font-bold text-amber-400">5% por Compra</div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Base de Clientes
        </h3>

        {isLoading ? (
          <p className="text-xs text-slate-400">Carregando clientes...</p>
        ) : rawProfiles.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum cliente cadastrado no momento.</p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {rawProfiles.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{p.name || "Cliente Pantanal"}</p>
                  <p className="text-[11px] text-slate-500">ID: {p.id}</p>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-[11px]">Elegível a 5% de Cashback</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Histórico Recente de Cashback */}
      {cashbackHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400" />
            Extrato Recente de Lançamentos
          </h3>

          <div className="divide-y divide-slate-800/80">
            {cashbackHistory.slice(0, 8).map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-200">{entry.note || "Movimentação de cashback"}</p>
                  <p className="text-[11px] text-slate-500">{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <span
                  className={`font-bold ${
                    entry.amount >= 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {entry.amount >= 0 ? `+${formatBRL(entry.amount)}` : formatBRL(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SEÇÃO 7: CONFIGURAÇÕES GERAIS & SEGURANÇA
// ==========================================
function GeneralSettingsSection({
  settings,
  onSaveSettings,
  userEmail,
}: {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => Promise<void>;
  userEmail: string;
}) {
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savedSettings, setSavedSettings] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    await onSaveSettings(formData);
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 3000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas informadas não coincidem.");
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updateAdminPassword(newPassword);
    if (result.success) {
      setPasswordSuccess("Senha master atualizada com sucesso no Supabase Auth!");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setPasswordError(result.error || "Erro ao atualizar senha.");
    }
    setIsUpdatingPassword(false);
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configurações Gerais & Segurança Master
        </h2>
        <p className="text-xs text-slate-400">
          Gerencie dados mestres de contato, WhatsApp e segurança da conta administrativa.
        </p>
      </div>

      {savedSettings && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Configurações salvas com sucesso!
        </div>
      )}

      {/* Formulário de Dados Gerais */}
      <form onSubmit={handleSaveSettings} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="h-4 w-4 text-primary" />
          Dados Mestres da Loja
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-300">Nome Oficial da Loja</Label>
            <Input
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Slogan</Label>
            <Input
              value={formData.slogan}
              onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">WhatsApp Master da Loja</Label>
            <Input
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Mensagem Padrão do WhatsApp</Label>
            <Input
              value={formData.whatsappMessage}
              onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5 shadow-glow">
            <Save className="h-4 w-4" /> Salvar Dados Mestres
          </Button>
        </div>
      </form>

      {/* Alteração Segura de Senha Master */}
      <form onSubmit={handlePasswordChange} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <Lock className="h-4 w-4 text-primary" />
          Segurança da Conta Administrativa (Supabase Auth)
        </h3>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-slate-300">
          <p>
            Usuário conectado: <strong className="text-white">{userEmail || ADMIN_CONFIG.email}</strong>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Autenticado com validação direta de permissão de administrador no banco de dados.
          </p>
        </div>

        {passwordError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {passwordSuccess}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-300">Nova Senha Master</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Confirmar Nova Senha</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="mt-1.5 bg-slate-950 border-slate-800 text-white"
              required
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button
            type="submit"
            disabled={isUpdatingPassword}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 shadow-glow"
          >
            {isUpdatingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Atualizar Senha no Supabase
          </Button>
        </div>
      </form>
    </div>
  );
}

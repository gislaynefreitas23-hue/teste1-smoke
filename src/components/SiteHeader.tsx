import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Coins,
  FileText,
  HelpCircle,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";

import logoImage from "@/assets/pantanal-logo.png";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useAuthSession } from "@/lib/useAuth";
import { SITE_NAME, WHATSAPP_NUMBER } from "@/lib/brasa";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function SiteHeader() {
  const { count } = useCart();
  const { session } = useAuthSession();
  const { selectedCity, openSelector, requireCityOrNavigate } = useCity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        {/* Lado Esquerdo: Logo + Seletor de Cidade */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/" aria-label={SITE_NAME} className="shrink-0">
            <img
              src={logoImage}
              alt={SITE_NAME}
              width={1070}
              height={410}
              className="h-9 w-24 object-contain sm:h-12 sm:w-36"
            />
          </Link>

          {/* Botão de Cidade Desktop (md ou superior) */}
          <button
            type="button"
            onClick={() => openSelector()}
            className="hidden md:flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-card hover:text-foreground cursor-pointer shadow-xs"
            title="Clique para alterar a cidade selecionada"
          >
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-semibold text-foreground">
              {selectedCity ? selectedCity.name : "Escolha sua cidade"}
            </span>
            {selectedCity ? (
              <span className="hidden sm:inline text-[11px] text-muted-foreground">
                ({selectedCity.shortState})
              </span>
            ) : null}
            <span className="text-[11px] font-semibold text-primary underline underline-offset-2 ml-0.5">
              Alterar
            </span>
          </button>

          {/* Botão de Cidade Compacto Mobile (abaixo de md) */}
          <button
            type="button"
            onClick={() => openSelector()}
            className="flex md:hidden items-center gap-1 rounded-full border border-primary/25 bg-card/90 px-2 py-1 text-[11px] text-muted-foreground transition-all hover:border-primary hover:text-foreground cursor-pointer shadow-xs max-w-[130px] truncate"
            title="Alterar cidade"
          >
            <MapPin className="h-3 w-3 text-primary shrink-0" />
            <span className="font-semibold text-foreground truncate">
              {selectedCity ? selectedCity.name : "Cidade"}
            </span>
            <span className="text-[10px] font-medium text-primary underline underline-offset-2 shrink-0">
              Trocar
            </span>
          </button>
        </div>

        {/* Lado Direito: Navegação Desktop + Ações Mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Links apenas no Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/produtos"
              aria-label="Produtos"
              onClick={(e) => requireCityOrNavigate("/produtos", e)}
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Produtos
            </Link>
            <Link
              to="/recomendar"
              onClick={(e) => requireCityOrNavigate("/recomendar", e)}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Sugestões
            </Link>
          </nav>

          {/* Minha Conta (visível tanto no desktop quanto no mobile) */}
          <Link
            to="/conta"
            aria-label={session ? "Minha conta · conectada" : "Ative seu cashback de 5%"}
            title={session ? "Minha conta · conectada" : "Ative seu cashback de 5%"}
            className="relative rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            {session && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success" />
            )}
          </Link>

          {/* Carrinho (visível tanto no desktop quanto no mobile) */}
          <Link
            to="/carrinho"
            aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
            className="relative rounded-full p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>

          {/* Menu Mobile Hamburger (apenas mobile md:hidden) */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Menu principal"
                className="flex md:hidden rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex flex-col justify-between w-[85vw] max-w-xs border-l border-primary/20 bg-background/95 backdrop-blur-xl p-5"
            >
              <div className="flex flex-col space-y-4">
                <SheetHeader className="text-left pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <img
                      src={logoImage}
                      alt={SITE_NAME}
                      width={1070}
                      height={410}
                      className="h-8 w-24 object-contain"
                    />
                  </div>
                  <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                </SheetHeader>

                {/* Box de Cidade Selecionada no Menu Mobile */}
                <div className="rounded-xl border border-primary/20 bg-card/70 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      Região de atendimento
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openSelector();
                      }}
                      className="text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedCity ? `${selectedCity.name} (${selectedCity.shortState})` : "Nenhuma cidade selecionada"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedCity?.id === "cuiaba"
                      ? "Taxa fixa de entrega: R$ 10,00"
                      : selectedCity?.id === "sao-paulo"
                      ? "Entrega grátis em diversos bairros"
                      : "Selecione para ver catálogo e preços"}
                  </p>
                </div>

                {/* Lista de Navegação Mobile */}
                <nav className="flex flex-col space-y-1">
                  <Link
                    to="/produtos"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      requireCityOrNavigate("/produtos", e);
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-card hover:text-primary transition-colors"
                  >
                    <Package className="h-4 w-4 text-primary" />
                    Produtos
                  </Link>

                  <Link
                    to="/recomendar"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      requireCityOrNavigate("/recomendar", e);
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-card hover:text-primary transition-colors"
                  >
                    <Sparkles className="h-4 w-4 text-ember" />
                    Sugestões (Me ajude a escolher)
                  </Link>

                  <Link
                    to="/conta"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-card hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4 text-primary" />
                    {session ? "Minha Conta" : "Entrar / Cashback de 5%"}
                  </Link>

                  <Link
                    to="/carrinho"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-card hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      Meu Carrinho
                    </div>
                    {count > 0 && (
                      <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Link>

                  <div className="my-2 border-t border-border/40" />

                  <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Institucional
                  </span>

                  <Link
                    to="/sobre-nos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                  >
                    <FileText className="h-4 w-4 text-primary/70" />
                    Sobre Nós
                  </Link>

                  <Link
                    to="/perguntas-frequentes"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 text-primary/70" />
                    Perguntas Frequentes
                  </Link>
                </nav>
              </div>

              {/* Rodapé do Menu Mobile */}
              <div className="pt-4 border-t border-border/40">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-card border border-primary/30 p-2.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all"
                >
                  <MessageCircle className="h-4 w-4 text-success" />
                  Atendimento via WhatsApp
                </a>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Pantanal Smoke — Conecte a sua vibe.
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function CashbackBadge() {
  return (
    <span className="flex items-center gap-2">
      <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
      Cashback na conta
    </span>
  );
}

import { Link } from "@tanstack/react-router";
import { Coins, MapPin, ShoppingBag, Sparkles, User } from "lucide-react";

import logoImage from "@/assets/pantanal-logo.png";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useAuthSession } from "@/lib/useAuth";
import { SITE_NAME } from "@/lib/brasa";

export function SiteHeader() {
  const { count } = useCart();
  const { session } = useAuthSession();
  const { selectedCity, openSelector, requireCityOrNavigate } = useCity();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" aria-label={SITE_NAME} className="shrink-0">
            <img
              src={logoImage}
              alt={SITE_NAME}
              width={1070}
              height={410}
              className="h-10 w-28 object-contain sm:h-12 sm:w-36"
            />
          </Link>

          {/* Botão de Cidade / Alterar cidade */}
          <button
            type="button"
            onClick={() => openSelector()}
            className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-primary hover:bg-card hover:text-foreground cursor-pointer shadow-xs"
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
        </div>

        <nav className="flex items-center gap-1">
          <Link
            to="/produtos"
            aria-label="Produtos"
            onClick={(e) => requireCityOrNavigate("/produtos", e)}
            className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Produtos
          </Link>
          <Link
            to="/recomendar"
            onClick={(e) => requireCityOrNavigate("/recomendar", e)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Sugestões
          </Link>
          <Link
            to="/conta"
            aria-label={session ? "Minha conta · conectada" : "Ative seu cashback de 5%"}
            title={session ? "Minha conta · conectada" : "Ative seu cashback de 5%"}
            className="relative rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            {session && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success" />
            )}
          </Link>
          <Link
            to="/carrinho"
            aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
            className="relative rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </nav>
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

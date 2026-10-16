import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { SITE_NAME, WHATSAPP_NUMBER } from "@/lib/brasa";
import { useCity } from "@/lib/city";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { selectedCity, openSelector } = useCity();

  return (
    <footer className="mt-20 border-t bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-ember">{SITE_NAME}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Essências, narguilés e acessórios selecionados, presentes em Cuiabá e São Paulo.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>
              Cidade ativa:{" "}
              <strong className="text-foreground">
                {selectedCity ? `${selectedCity.name} - ${selectedCity.shortState}` : "Não selecionada"}
              </strong>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={openSelector}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Alterar cidade
            </button>
          </div>
        </div>

        <div className="text-sm">
          <p className="font-semibold">Navegar</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/produtos" className="hover:text-foreground">
                Produtos
              </Link>
            </li>
            <li>
              <Link to="/recomendar" className="hover:text-foreground">
                Me ajude a escolher
              </Link>
            </li>
            <li>
              <Link to="/carrinho" className="hover:text-foreground">
                Carrinho
              </Link>
            </li>
            <li>
              <Link to="/conta" className="hover:text-foreground">
                Minha conta
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="font-semibold">Pedidos</p>
          <p className="mt-2 text-muted-foreground">
            Todo pedido é confirmado pelo WhatsApp{" "}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              className="text-primary hover:underline"
            >
              +55 65 99921-0066
            </a>
            .
          </p>
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          {year} {SITE_NAME}. Venda proibida para menores de 18 anos. Não vendemos cigarros
          eletrônicos.
        </p>
      </div>
    </footer>
  );
}

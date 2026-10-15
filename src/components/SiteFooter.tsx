import { Link } from "@tanstack/react-router";

import { SITE_NAME, WHATSAPP_NUMBER } from "@/lib/brasa";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-semibold text-ember">{SITE_NAME}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Essências, narguilés e acessórios selecionados, com entrega em Cuiabá.
          </p>
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

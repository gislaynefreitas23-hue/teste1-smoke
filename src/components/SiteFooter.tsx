import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { SITE_NAME, WHATSAPP_NUMBER } from "@/lib/brasa";
import { openWhatsAppExternal } from "@/lib/whatsapp";
import { useCity } from "@/lib/city";
import { useStoreSettings } from "@/lib/store-settings";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { selectedCity, openSelector } = useCity();
  const { settings } = useStoreSettings();

  return (
    <footer className="mt-8 sm:mt-14 border-t border-border/40 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
          {/* Identificação da Marca e Cidade */}
          <div className="space-y-2">
            <p className="font-display text-base sm:text-lg font-semibold text-ember">{SITE_NAME}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {settings.footerTagline || "De Cuiabá a São Paulo, conectando vibes."}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>
                Cidade:{" "}
                <strong className="text-foreground">
                  {selectedCity ? `${selectedCity.name} - ${selectedCity.shortState}` : "Não selecionada"}
                </strong>
              </span>
              <span>•</span>
              <button
                type="button"
                onClick={() => openSelector()}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Alterar
              </button>
            </div>
          </div>

          {/* Links Organizados em Colunas Compactas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:col-span-2 sm:gap-6">
            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-foreground mb-1.5">Navegar</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <Link to="/produtos" className="hover:text-foreground transition-colors">
                    Produtos
                  </Link>
                </li>
                <li>
                  <Link to="/recomendar" className="hover:text-foreground transition-colors">
                    Me ajude a escolher
                  </Link>
                </li>
                <li>
                  <Link to="/carrinho" className="hover:text-foreground transition-colors">
                    Carrinho
                  </Link>
                </li>
                <li>
                  <Link to="/conta" className="hover:text-foreground transition-colors">
                    Minha conta
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-xs sm:text-sm">
              <p className="font-semibold text-foreground mb-1.5">Institucional</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <Link to="/sobre-nos" className="hover:text-foreground transition-colors">
                    Sobre Nós
                  </Link>
                </li>
                <li>
                  <Link to="/perguntas-frequentes" className="hover:text-foreground transition-colors">
                    Perguntas Frequentes
                  </Link>
                </li>
              </ul>
            </div>

            <div className="text-xs sm:text-sm col-span-2 sm:col-span-1 pt-2 sm:pt-0 border-t border-border/20 sm:border-0">
              <p className="font-semibold text-foreground mb-1.5">Atendimento</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
                {settings.openingHours || "Atendimento das 10h às 19h"}
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => openWhatsAppExternal(`https://wa.me/${WHATSAPP_NUMBER}`, e)}
                className="mt-1 inline-flex items-center text-[11px] sm:text-xs text-primary hover:underline font-medium"
              >
                Fale pelo WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Avisos Legais e Copyright */}
      <div className="border-t border-border/30 bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-1.5 px-4 py-3 pb-16 sm:pb-3 text-[11px] text-muted-foreground text-center sm:text-left">
          <p>
            © {year} {SITE_NAME}. Todos os direitos reservados.
          </p>
          <p className="text-[10.5px] text-muted-foreground/80">
            Venda proibida para menores de 18 anos. O Ministério da Saúde adverte: fumar faz mal à saúde.
          </p>
        </div>
      </div>
    </footer>
  );
}

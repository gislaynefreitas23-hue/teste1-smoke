import { MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_NUMBER } from "@/lib/brasa";
import { useStoreSettings } from "@/lib/store-settings";
import {
  buildWhatsAppUrl,
  openWhatsAppExternal,
  isRunningInIframe,
} from "@/lib/whatsapp";

interface WhatsAppOrderSectionProps {
  className?: string;
  defaultMessage?: string;
}

export function WhatsAppOrderSection({
  className = "",
  defaultMessage,
}: WhatsAppOrderSectionProps) {
  const { settings } = useStoreSettings();
  const rawNumber = settings.whatsappNumber || WHATSAPP_NUMBER;
  const msg = defaultMessage || settings.whatsappMessage || "Olá! Gostaria de fazer um pedido.";
  const whatsappUrl = buildWhatsAppUrl(rawNumber, msg);

  return (
    <section
      aria-label="Atendimento via WhatsApp"
      className={`relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-card to-slate-950 p-6 sm:p-8 backdrop-blur-md shadow-2xl ${className}`}
    >
      {/* Efeito sutil de brilho verde/esmeralda no fundo */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row md:text-left text-center">
        <div className="max-w-xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Atendimento Rápido & Direto</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Prefere comprar pelo WhatsApp?
          </h2>

          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            Faça seu pedido diretamente pelo WhatsApp e pague na entrega.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-xs text-slate-400 md:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Entrega local rápida
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              Pague com segurança ao receber
            </span>
          </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base px-8 py-6 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] hover:scale-105"
            asChild
          >
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fazer pedido pelo WhatsApp oficial da Pantanal Smoke"
              onClick={(e) => openWhatsAppExternal(whatsappUrl, e)}
              className="flex items-center justify-center gap-2.5"
            >
              <MessageCircle className="h-5 w-5 fill-current" aria-hidden="true" />
              <span>Peça agora!</span>
            </a>
          </Button>

          {isRunningInIframe() && (
            <p className="mt-2 text-center text-[10px] text-emerald-400/80">
              Abre diretamente em uma nova aba fora da prévia
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

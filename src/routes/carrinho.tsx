import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { CASHBACK_RATE, WHATSAPP_NUMBER, formatBRL } from "@/lib/brasa";
import { buildWhatsAppUrl, openWhatsAppExternal } from "@/lib/whatsapp";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useAuthSession } from "@/lib/useAuth";

const TAXA_ENTREGA_CUIABA = 10;

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Pantanal Smoke" },
      {
        name: "description",
        content: "Revise seu carrinho de compras e continue para o checkout e pagamento seguro.",
      },
      { property: "og:title", content: "Carrinho — Pantanal Smoke" },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      { property: "og:description", content: "Revise seus produtos e finalize sua compra com segurança." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Carrinho,
});

function Carrinho() {
  const {
    items,
    setQty,
    remove,
    clear,
    subtotal,
    cartCityId,
    cityConflictWarning,
    dismissCityConflictWarning,
  } = useCart();
  const { session } = useAuthSession();
  const { selectedCityId, openSelector } = useCity();

  const [balance, setBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!session) {
      setBalance(0);
      return;
    }
    supabase.rpc("my_cashback").then(({ data }) => {
      if (active) setBalance(Number(data ?? 0));
    });
    return () => {
      active = false;
    };
  }, [session]);

  const effectiveCity = cartCityId || selectedCityId || "cuiaba";
  const isCuiaba = effectiveCity === "cuiaba";
  const cityName = isCuiaba ? "Cuiabá — MT" : "São Paulo — SP";
  const deliveryFee = isCuiaba ? TAXA_ENTREGA_CUIABA : 0;
  const applied = useCashback && session ? Math.min(balance, subtotal) : 0;
  const total = subtotal + deliveryFee - applied;
  const earning = Math.round((subtotal - applied) * CASHBACK_RATE * 100) / 100;

  const itemsLines = items
    .map((i) => `• ${i.qty}x ${i.name} — ${formatBRL(i.price)} cada (${formatBRL(i.price * i.qty)})`)
    .join("\n");

  const whatsAppOrderText = [
    "🔥 *Olá! Quero fechar este pedido na Pantanal Smoke:*",
    "",
    `📍 *Cidade de atendimento:* ${cityName}`,
    "",
    "*Itens do pedido:*",
    itemsLines,
    "",
    `*Subtotal dos produtos:* ${formatBRL(subtotal)}`,
    isCuiaba ? `*Taxa fixa de entrega (Cuiabá):* ${formatBRL(deliveryFee)}` : "*Envio:* A combinar / Expresso",
    applied > 0 ? `*Cashback aplicado:* -${formatBRL(applied)}` : "",
    `*Total:* ${formatBRL(total)}`,
    "",
    isCuiaba ? "🕒 *Entrega rápida em Cuiabá · Taxa fixa R$ 10,00*" : "📦 *Envio expresso para São Paulo*",
  ]
    .filter(Boolean)
    .join("\n");

  const whatsAppOrderUrl = buildWhatsAppUrl(WHATSAPP_NUMBER, whatsAppOrderText);

  // Envio direto pelo WhatsApp escapando de iframes do Lovable
  function sendOrderViaWhatsApp(e?: React.SyntheticEvent) {
    setError(null);
    setSending(true);
    try {
      openWhatsAppExternal(whatsAppOrderUrl, e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível abrir o WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">
          Adicione produtos ao seu carrinho e volte aqui para revisar e finalizar seu pedido.
        </p>
        <Button className="mt-6 bg-ember shadow-glow" asChild>
          <Link to="/produtos">Ver catálogo de produtos</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Carrinho de compras</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Revise seus produtos selecionados para entrega em <strong className="text-foreground">{cityName}</strong>.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-card/80 px-3.5 py-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold text-white">{cityName}</span>
          <button
            type="button"
            onClick={() => openSelector()}
            className="text-[11px] font-semibold text-primary underline underline-offset-2 ml-1 cursor-pointer"
          >
            Alterar
          </button>
        </div>
      </div>

      {cityConflictWarning && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <span>{cityConflictWarning}</span>
          <button
            type="button"
            onClick={dismissCityConflictWarning}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}
      <p className="mt-2 text-muted-foreground">
        Revise seus itens antes de prosseguir para o pagamento e endereço de entrega.
      </p>

      {/* Alerta da cidade ativa */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card/60 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="text-muted-foreground">
            Cidade de entrega selecionada:{" "}
            <strong className="text-foreground">
              {isCuiaba ? "Cuiabá - MT" : "São Paulo - SP"}
            </strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => openSelector()}
          className="text-primary hover:underline font-semibold cursor-pointer"
        >
          Alterar cidade
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Coluna de Itens */}
        <section className="lg:col-span-7">
          <ul className="divide-y divide-border rounded-2xl border bg-card">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 p-4 sm:p-5"
              >
                <div className="flex-1 truncate">
                  <h3 className="font-semibold text-sm sm:text-base truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(item.price)} cada
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border bg-background">
                    <button
                      type="button"
                      onClick={() => setQty(item.id, item.qty - 1)}
                      aria-label="Diminuir quantidade"
                      className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-semibold">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(item.id, item.qty + 1)}
                      aria-label="Aumentar quantidade"
                      className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <span className="w-20 text-right text-sm font-bold text-foreground">
                    {formatBRL(item.price * item.qty)}
                  </span>

                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label={`Remover ${item.name}`}
                    className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
            <Link to="/produtos" className="hover:text-foreground underline underline-offset-4">
              ← Adicionar mais produtos
            </Link>
          </div>
        </section>

        {/* Coluna Resumo e Checkout */}
        <aside className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold">Resumo do pedido</h2>

            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal dos produtos</span>
                <span className="font-semibold">{formatBRL(subtotal)}</span>
              </div>

              {isCuiaba && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxa de entrega (Cuiabá)</span>
                  <span className="font-semibold text-foreground">{formatBRL(deliveryFee)}</span>
                </div>
              )}

              {applied > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span>Cashback aplicado</span>
                  <span className="font-semibold">-{formatBRL(applied)}</span>
                </div>
              )}
            </div>

            {/* Switch de Cashback */}
            {session ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <Label htmlFor="use-cashback" className="cursor-pointer text-sm font-medium">
                    Usar cashback
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Saldo disponível: {formatBRL(balance)}
                  </p>
                </div>
                <Switch
                  id="use-cashback"
                  checked={useCashback}
                  onCheckedChange={setUseCashback}
                  disabled={balance <= 0}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-ember/40 bg-ember/5 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-ember mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Cashback na sua próxima compra ({formatBRL(earning)})
                    </p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      <Link
                        to="/auth"
                        search={{ next: "/carrinho" }}
                        className="font-medium text-ember underline underline-offset-2 hover:text-ember/80"
                      >
                        Entre na sua conta com seu e-mail
                      </Link>{" "}
                      e receba 5% do valor do seu pedido em cashback para{" "}
                      <strong className="text-foreground font-semibold">usar na próxima compra</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <span className="font-semibold">Total estimado</span>
              <span className="text-xl font-bold text-ember">{formatBRL(total)}</span>
            </div>

            {session && (
              <p className="mt-2 text-xs text-muted-foreground">
                Você ganha {formatBRL(earning)} de cashback: quando o pedido é confirmado, 5% do total volta como crédito para a sua próxima compra.
              </p>
            )}

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            {/* Ações: Continuar para pagamento e WhatsApp */}
            <div className="mt-6 space-y-3">
              <Button
                className="w-full bg-ember py-6 text-base font-bold shadow-glow hover:opacity-95"
                size="lg"
                asChild
              >
                <Link to="/checkout">
                  Continuar para pagamento
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                size="sm"
              >
                <a
                  href={whatsAppOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={sendOrderViaWhatsApp}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{sending ? "Abrindo..." : "Ou pedir direto pelo WhatsApp"}</span>
                </a>
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Endereço e forma de pagamento serão solicitados na próxima etapa.</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

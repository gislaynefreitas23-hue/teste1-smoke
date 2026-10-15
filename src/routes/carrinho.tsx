import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { CASHBACK_RATE, WHATSAPP_NUMBER, formatBRL } from "@/lib/brasa";
import { useCart } from "@/lib/cart";
import { useAuthSession } from "@/lib/useAuth";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Pantanal Smoke" },
      {
        name: "description",
        content: "Revise o carrinho, aplique seu cashback e envie o pedido pelo WhatsApp.",
      },
      { property: "og:title", content: "Carrinho — Pantanal Smoke" },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      { property: "og:description", content: "Envie seu pedido pelo WhatsApp em um clique." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Carrinho,
});

function Carrinho() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { session } = useAuthSession();
  const [balance, setBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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

  const applied = useCashback && session ? Math.min(balance, subtotal) : 0;
  const total = subtotal - applied;
  const earning = Math.round(total * CASHBACK_RATE * 100) / 100;

  async function sendOrder() {
    setError(null);
    if (!session) {
      setError("Entre na sua conta para enviar o pedido e ativar o cashback.");
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Preencha nome, telefone e endereço para finalizar.");
      return;
    }

    setSending(true);
    try {
      const payload = items.map((i) => ({ id: i.id, qty: i.qty }));
      const { data, error: rpcError } = await supabase.rpc("place_order", {
        _items: payload,
        _use_cashback: useCashback,
        _name: name,
        _phone: phone,
        _address: address,
      });

      if (rpcError) throw rpcError;

      const order = data as {
        items: { name: string; qty: number; price: number }[];
        subtotal: number;
        cashback_used: number;
        total: number;
      };

      const lines = (order.items ?? [])
        .map((i) => `${i.qty}x ${i.name} — ${formatBRL(i.price)}`)
        .join("\n");

      const text = [
        "Olá! Quero fechar este pedido:",
        "",
        lines,
        "",
        `Subtotal: ${formatBRL(order.subtotal)}`,
        order.cashback_used > 0 ? `Cashback aplicado: -${formatBRL(order.cashback_used)}` : "",
        `Total: ${formatBRL(order.total)}`,
        "",
        `Nome: ${name}`,
        `Telefone: ${phone}`,
        `Endereço: ${address}`,
      ]
        .filter(Boolean)
        .join("\n");

      clear();
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o pedido.");
    } finally {
      setSending(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">
          Escolha seus produtos e volte aqui para finalizar pelo WhatsApp.
        </p>
        <Button className="mt-6 bg-ember shadow-glow" asChild>
          <Link to="/produtos">Ver produtos</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Carrinho</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-4 rounded-2xl border bg-card p-4"
            >
              <div className="flex-1">
                <p className="font-semibold">{i.name}</p>
                <p className="text-sm text-muted-foreground">{formatBRL(i.price)} cada</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Diminuir ${i.name}`}
                  onClick={() => setQty(i.id, i.qty - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{i.qty}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Aumentar ${i.name}`}
                  onClick={() => setQty(i.id, i.qty + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="w-24 text-right font-semibold">{formatBRL(i.price * i.qty)}</p>

              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remover ${i.name}`}
                onClick={() => remove(i.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatBRL(subtotal)}</span>
          </div>

          {session ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border p-3">
              <div>
                <Label htmlFor="use-cashback" className="cursor-pointer text-sm">
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
            <p className="mt-4 text-xs text-muted-foreground">
              <Link to="/auth" search={{ next: "/carrinho" }} className="text-primary">
                Entre na sua conta
              </Link>{" "}
              para usar e acumular cashback.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-ember">{formatBRL(total)}</span>
          </div>

          {applied > 0 && (
            <p className="mt-1 text-right text-xs text-success">
              Cashback aplicado: -{formatBRL(applied)}
            </p>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            Você ganha {formatBRL(earning)} de cashback quando a loja confirmar a entrega.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como a loja deve te chamar"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(65) 9 9999-9999"
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <Button
            className="mt-5 w-full bg-ember shadow-glow"
            size="lg"
            onClick={sendOrder}
            disabled={sending}
          >
            {sending ? "Enviando..." : "Enviar pedido no WhatsApp"}
          </Button>
        </aside>
      </div>
    </main>
  );
}

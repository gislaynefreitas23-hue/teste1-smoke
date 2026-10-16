import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, MapPin, Minus, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { CASHBACK_RATE, WHATSAPP_NUMBER, formatBRL } from "@/lib/brasa";
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
        content: "Revise o carrinho, preencha o endereço de entrega e finalize seu pedido pelo WhatsApp.",
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
  const { selectedCityId, selectCity, openSelector } = useCity();

  const [balance, setBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);

  // Dados do cliente
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Endereço de entrega
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState(selectedCityId === "cuiaba" ? "Cuiabá" : "");
  const [uf, setUf] = useState(selectedCityId === "cuiaba" ? "MT" : "");

  const [loadingCep, setLoadingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);

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

  // Atualiza cidade/uf padrão se selectedCityId mudar e campos estiverem vazios
  useEffect(() => {
    if (selectedCityId === "cuiaba" && !cidade) {
      setCidade("Cuiabá");
      setUf("MT");
    } else if (selectedCityId === "sao-paulo" && !cidade) {
      setCidade("São Paulo");
      setUf("SP");
    }
  }, [selectedCityId, cidade]);

  // Consulta automática no ViaCEP
  async function handleCepChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
    setCepMessage(null);

    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepMessage("CEP não encontrado. Preencha rua e bairro manualmente.");
        } else {
          if (data.logradouro) setRua(data.logradouro);
          if (data.bairro) setBairro(data.bairro);
          if (data.localidade) setCidade(data.localidade);
          if (data.uf) setUf(data.uf);
          setCepMessage(null);

          // Se o CEP for de Cuiabá, sincroniza a cidade selecionada
          if (data.localidade?.toLowerCase().includes("cuiab")) {
            if (selectedCityId !== "cuiaba") selectCity("cuiaba");
          }
        }
      } catch {
        setCepMessage("Não foi possível consultar o CEP automaticamente. Você pode preencher manualmente.");
      } finally {
        setLoadingCep(false);
      }
    }
  }

  // Regras de Entrega: Cuiabá tem taxa fixa de R$ 10,00
  const isCuiaba =
    selectedCityId === "cuiaba" ||
    cidade.toLowerCase().includes("cuiab") ||
    uf.toUpperCase() === "MT";

  const deliveryFee = isCuiaba ? TAXA_ENTREGA_CUIABA : 0;
  const applied = useCashback && session ? Math.min(balance, subtotal) : 0;
  const total = subtotal + deliveryFee - applied;
  const earning = Math.round((subtotal - applied) * CASHBACK_RATE * 100) / 100;

  async function sendOrder() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Preencha seu nome e telefone/WhatsApp.");
      return;
    }
    if (!rua.trim() || !numero.trim() || !bairro.trim()) {
      setError("Preencha a rua, número e bairro para a entrega.");
      return;
    }

    setSending(true);
    try {
      let orderItems = items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
      }));
      let orderSubtotal = subtotal;
      let orderCashbackUsed = applied;
      let orderTotal = total;

      const formattedAddress = [
        `Rua ${rua.trim()}, Nº ${numero.trim()}`,
        complemento.trim() ? `Complemento: ${complemento.trim()}` : "",
        `Bairro: ${bairro.trim()}`,
        cep.trim() ? `CEP: ${cep.trim()}` : "",
        `Cidade: ${cidade || (isCuiaba ? "Cuiabá" : "São Paulo")} - ${uf || (isCuiaba ? "MT" : "SP")}`,
      ]
        .filter(Boolean)
        .join(", ");

      // Se o cliente estiver logado, registra no banco
      if (session) {
        try {
          const payload = items.map((i) => ({ id: i.id, qty: i.qty }));
          const { data, error: rpcError } = await supabase.rpc("place_order", {
            _items: payload,
            _use_cashback: useCashback,
            _name: name,
            _phone: phone,
            _address: formattedAddress,
          });

          if (!rpcError && data) {
            const order = data as {
              items: { name: string; qty: number; price: number }[];
              subtotal: number;
              cashback_used: number;
              total: number;
            };
            if (order.items && order.items.length > 0) orderItems = order.items;
            if (typeof order.subtotal === "number") orderSubtotal = order.subtotal;
            if (typeof order.cashback_used === "number") orderCashbackUsed = order.cashback_used;
            // Soma a taxa de entrega ao total registrado no banco caso não esteja inclusa no RPC
            orderTotal = (order.total ?? (orderSubtotal - orderCashbackUsed)) + deliveryFee;
          }
        } catch (rpcErr) {
          console.warn("Aviso ao registrar pedido com cashback no banco:", rpcErr);
        }
      }

      const itemsLines = orderItems
        .map((i) => `• ${i.qty}x ${i.name} — ${formatBRL(i.price)} cada (${formatBRL(i.price * i.qty)})`)
        .join("\n");

      const text = [
        "🔥 *Olá! Quero fechar este pedido na Pantanal Smoke:*",
        "",
        "*Itens do pedido:*",
        itemsLines,
        "",
        `*Subtotal dos produtos:* ${formatBRL(orderSubtotal)}`,
        isCuiaba ? `*Taxa de entrega (Cuiabá):* ${formatBRL(deliveryFee)}` : "",
        orderCashbackUsed > 0 ? `*Cashback aplicado:* -${formatBRL(orderCashbackUsed)}` : "",
        `*Total a pagar:* ${formatBRL(orderTotal)}`,
        "",
        "📍 *Endereço de entrega:*",
        `Nome: ${name.trim()}`,
        `Telefone: ${phone.trim()}`,
        `Rua: ${rua.trim()}, Nº ${numero.trim()}`,
        complemento.trim() ? `Complemento: ${complemento.trim()}` : "",
        `Bairro: ${bairro.trim()}`,
        cep.trim() ? `CEP: ${cep.trim()}` : "",
        `Cidade: ${cidade || (isCuiaba ? "Cuiabá" : "São Paulo")} - ${uf || (isCuiaba ? "MT" : "SP")}`,
        "",
        isCuiaba ? "🕒 *Entrega local · Atendimento das 10h às 19h*" : "",
        session ? "✅ _Cliente com conta (Cashback ativo)_" : "⚡ _Pedido Rápido (Sem cadastro)_",
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
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
          {/* Seletor de cidade / Aviso de Cuiabá */}
          {isCuiaba && (
            <div className="mb-4 rounded-xl border border-primary/25 bg-card/70 p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">Cuiabá - MT</span>
                </div>
                <button
                  type="button"
                  onClick={() => openSelector()}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  Alterar cidade
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Entrega local · Atendimento das 10h às 19h
              </p>
            </div>
          )}

          {/* Resumo financeiro */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal dos produtos</span>
              <span className="font-semibold">{formatBRL(subtotal)}</span>
            </div>

            {isCuiaba && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Taxa de entrega (Cuiabá)</span>
                </div>
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
                    Quer acumular {formatBRL(earning)} de cashback?
                  </p>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    <Link
                      to="/auth"
                      search={{ next: "/carrinho" }}
                      className="font-medium text-ember underline underline-offset-2 hover:text-ember/80"
                    >
                      Entre com seu e-mail
                    </Link>{" "}
                    (opcional) para resgatar na próxima compra. Se não quiser, basta preencher os dados abaixo e pedir direto!
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-ember">{formatBRL(total)}</span>
          </div>

          {session && (
            <p className="mt-2 text-xs text-muted-foreground">
              Você ganha {formatBRL(earning)} de cashback quando a loja confirmar a entrega.
            </p>
          )}

          {/* Seção Endereço de Entrega */}
          <div className="mt-5 space-y-4 rounded-2xl border border-border/80 bg-background/50 p-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Endereço de entrega</h3>
              </div>
              {isCuiaba && (
                <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25">
                  Taxa fixa R$ 10,00
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* CEP */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cep" className="text-xs">CEP *</Label>
                  {loadingCep && (
                    <span className="flex items-center gap-1 text-[11px] text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" /> Buscando no ViaCEP...
                    </span>
                  )}
                </div>
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="78000-000"
                  maxLength={9}
                  className="mt-1 font-mono"
                />
                {cepMessage && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{cepMessage}</p>
                )}
              </div>

              {/* Rua */}
              <div>
                <Label htmlFor="rua" className="text-xs">Rua / Logradouro *</Label>
                <Input
                  id="rua"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  placeholder="Ex: Av. Getúlio Vargas"
                  className="mt-1"
                />
              </div>

              {/* Número e Complemento */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="numero" className="text-xs">Número *</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ex: 123"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="complemento" className="text-xs">Complemento</Label>
                  <Input
                    id="complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, bloco (opcional)"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <Label htmlFor="bairro" className="text-xs">Bairro *</Label>
                <Input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro-Norte"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="mt-4 space-y-3 rounded-2xl border border-border/80 bg-background/50 p-4">
            <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-muted-foreground">
              Seus dados para contato
            </h4>
            <div>
              <Label htmlFor="name" className="text-xs">Seu Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como a loja deve te chamar"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-xs">Seu Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(65) 9 9999-9999"
                className="mt-1"
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

          {!session && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              ⚡ Compra rápida e direta: não exige cadastro nem senha
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}

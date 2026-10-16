import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CASHBACK_RATE, formatBRL } from "@/lib/brasa";
import { useAuthSession } from "@/lib/useAuth";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Pantanal Smoke" },
      {
        name: "description",
        content: "Acompanhe seu cashback, seus pedidos e edite seu perfil na Pantanal Smoke.",
      },
      { property: "og:title", content: "Minha conta — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Acompanhe seu cashback e seus pedidos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conta,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando pagamento e entrega",
  confirmado: "Pago e entregue",
  cancelado: "Cancelado",
};

function Conta() {
  const { session, loading } = useAuthSession();
  const nav = useNavigate();
  const userId = session?.user.id;

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [balance, setBalance] = useState(0);
  const [name, setName] = useState("");
  const [preferences, setPreferences] = useState("");
  const [saved, setSaved] = useState(false);
  const [deletionAsked, setDeletionAsked] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc("my_cashback").then(({ data }) => setBalance(Number(data ?? 0)));
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPreferences(profile.preferences ?? "");
  }, [profile]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Carregando…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <p className="mt-2 text-muted-foreground">
          Entre com seu e-mail para ativar o cashback de 5%.
        </p>
        <Button className="mt-6 bg-ember shadow-glow" size="lg" asChild>
          <Link to="/auth" search={{ next: "/conta" }}>
            Entrar com e-mail
          </Link>
        </Button>
      </main>
    );
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, name, preferences });
    if (!error) setSaved(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  async function requestDeletion() {
    const ok = window.confirm(
      "Solicitar a exclusão da sua conta? Seus pedidos e seu saldo de cashback serão apagados.",
    );
    if (!ok) return;
    await supabase.rpc("request_account_deletion");
    setDeletionAsked(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Minha conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">{session.user.email}</p>

      <section className="mt-8 rounded-2xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Saldo de cashback</p>
        <p className="mt-1 text-4xl font-bold text-ember">{formatBRL(balance)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Quando o pedido é confirmado, 5% do total volta como crédito para a sua próxima compra.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Meus pedidos</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {(o.items as unknown as { qty: number; name: string }[] | null ?? [])
                    .map((i) => `${i.qty}x ${i.name}`)
                    .join(", ")}
                </p>
                <p className="mt-2 font-semibold">{formatBRL(o.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Nome e preferências</h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4 rounded-2xl border bg-card p-6">
          <div>
            <Label htmlFor="conta-nome">Nome</Label>
            <Input
              id="conta-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como a loja deve te chamar"
            />
          </div>
          <div>
            <Label htmlFor="conta-prefs">Preferências</Label>
            <Textarea
              id="conta-prefs"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Sabores, intensidade e o que você costuma fumar"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" className="bg-ember">
              Salvar
            </Button>
            {saved && <span className="text-sm text-success">Perfil atualizado.</span>}
          </div>
        </form>
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-3 border-t pt-6">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </Button>
        <Button variant="ghost" className="text-destructive" onClick={requestDeletion}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Solicitar exclusão da conta
        </Button>
        {deletionAsked && (
          <span className="text-sm text-muted-foreground">
            Solicitação registrada. Vamos concluir a exclusão em até 15 dias.
          </span>
        )}
      </section>
    </main>
  );
}

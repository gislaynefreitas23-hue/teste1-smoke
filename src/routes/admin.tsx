import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/brasa";
import { useAuthSession } from "@/lib/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel da loja — Pantanal Smoke" },
      {
        name: "description",
        content: "Área restrita: acompanhe pedidos e mantenha o catálogo da loja.",
      },
      { property: "og:title", content: "Painel da loja — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Área restrita da Pantanal Smoke.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type OrderItem = { qty: number; name: string; price: number };
type Order = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  status: string;
  items: OrderItem[];
  total: number;
};

const EMPTY_PRODUCT = {
  name: "",
  category: "",
  description: "",
  flavor_profile: "",
  intensity: "média",
  price: "",
  active: true,
  image_url: "",
};

function Admin() {
  const { session, loading } = useAuthSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: session.user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">
        Carregando…
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Área da loja</h1>
        <p className="mt-2 text-muted-foreground">
          Entre com uma conta autorizada para ver este painel.
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Sem permissão</h1>
        <p className="mt-2 text-muted-foreground">
          Esta conta não é da loja. Peça ao administrador para liberar o acesso.
        </p>
      </main>
    );
  }

  return <Panel />;
}

function Panel() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Painel da loja</h1>
      <Tabs defaultValue="pedidos" className="mt-8">
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="pedidos">
          <Orders />
        </TabsContent>
        <TabsContent value="produtos">
          <Products />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Orders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const setStatus = useCallback(
    async (id: string, status: string) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    },
    [queryClient],
  );

  if (isLoading) return <p className="text-muted-foreground">Carregando pedidos…</p>;
  if (orders.length === 0)
    return <p className="text-muted-foreground">Nenhum pedido ainda.</p>;

  return (
    <ul className="mt-6 space-y-4">
      {orders.map((o) => (
        <li key={o.id} className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{o.customer_name || "Cliente sem nome"}</p>
            <span className="text-xs uppercase tracking-wider text-primary">{o.status}</span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(o.created_at).toLocaleString("pt-BR")} · {o.phone}
          </p>

          <p className="mt-3 text-sm">
            {(o.items ?? [])
              .map((i) => `${i.qty}x ${i.name} — ${formatBRL(i.price)}`)
              .join(", ")}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">{o.address}</p>
          <p className="mt-2 text-lg font-bold text-ember">{formatBRL(o.total)}</p>

          {o.status === "pendente" && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStatus(o.id, "cancelado")}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-ember"
                onClick={() => setStatus(o.id, "confirmado")}
              >
                Confirmar pagamento e entrega
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Products() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<typeof EMPTY_PRODUCT | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    const payload = {
      ...draft,
      price: Number(String(draft.price).replace(",", ".")) || 0,
    };
    const { error } = await supabase.from("products").insert(payload);
    setBusy(false);
    if (!error) {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Excluir "${name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  }

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    setBusy(true);
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    setBusy(false);
    if (!error) setDraft({ ...draft, image_url: path });
  }

  const photoName = useMemo(
    () => (draft?.image_url ? draft.image_url.split("/").pop() : ""),
    [draft?.image_url],
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Catálogo</h2>
        <Button size="sm" className="bg-ember" onClick={() => setDraft({ ...EMPTY_PRODUCT })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo produto
        </Button>
      </div>

      {draft && (
        <form
          onSubmit={save}
          className="mt-6 space-y-4 rounded-2xl border bg-card p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-name">Nome</Label>
              <Input
                id="p-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-category">Categoria</Label>
              <Input
                id="p-category"
                required
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Essência, Narguilé, Carvão…"
              />
            </div>
            <div>
              <Label htmlFor="p-price">Preço</Label>
              <Input
                id="p-price"
                required
                inputMode="decimal"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="49,90"
              />
            </div>
            <div>
              <Label htmlFor="p-intensity">Intensidade</Label>
              <Input
                id="p-intensity"
                value={draft.intensity}
                onChange={(e) => setDraft({ ...draft, intensity: e.target.value })}
                placeholder="leve, média ou forte"
              />
            </div>
            <div>
              <Label htmlFor="p-flavor">Perfil de sabor</Label>
              <Input
                id="p-flavor"
                value={draft.flavor_profile}
                onChange={(e) => setDraft({ ...draft, flavor_profile: e.target.value })}
                placeholder="frutado, menta, cítrico…"
              />
            </div>
            <div>
              <Label htmlFor="p-photo">Foto</Label>
              <Input
                id="p-photo"
                type="file"
                accept="image/*"
                onChange={pickPhoto}
                className="pt-1.5"
              />
              {photoName && (
                <p className="mt-1 flex items-center gap-1 text-xs text-success">
                  <ImagePlus className="h-3 w-3" aria-hidden="true" />
                  {photoName}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />
            Ativo (visível na loja)
          </label>

          <div className="flex gap-2">
            <Button type="submit" className="bg-ember" disabled={busy}>
              {busy ? "Salvando…" : "Salvar produto"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-4"
          >
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.category} · {formatBRL(p.price)}
                {p.active ? "" : " · inativo"}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Excluir ${p.name}`}
              onClick={() => remove(p.id, p.name)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

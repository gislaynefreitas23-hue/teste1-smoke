import { Link, createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Wallet } from "lucide-react";

import brandImage from "@/assets/pantanal-brand.png";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pantanal Smoke — Conecte-se à sua vibe" },
      {
        name: "description",
        content:
          "Escolha, peça pelo WhatsApp e ganhe 5% de cashback em cada compra. Essências, narguilés e acessórios.",
      },
      { property: "og:title", content: "Pantanal Smoke — Conecte-se à sua vibe" },
      {
        property: "og:description",
        content: "Peça pelo WhatsApp e ganhe 5% de cashback em cada compra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-14 text-center sm:py-20">
        <img
          src={brandImage}
          alt="Pantanal Smoke"
          width={1536}
          height={512}
          className="mx-auto w-full max-w-2xl object-contain"
        />
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Conecte-se à sua <span className="text-ember">vibe</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Escolha, peça pelo WhatsApp e ganhe 5% de cashback em cada compra.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="bg-ember px-8 shadow-glow" asChild>
            <Link to="/produtos">Ver produtos</Link>
          </Button>
          <Button size="lg" variant="outline" className="px-8" asChild>
            <Link to="/recomendar">Me ajude a escolher</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 pb-6 sm:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Pedido no WhatsApp</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte o carrinho e finalize a compra direto na nossa conversa, sem cadastro e sem
            taxa de plataforma.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <Wallet className="h-6 w-6 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Cashback na conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando o pedido é confirmado, 5% do total volta como crédito para a sua próxima
            compra.
          </p>
        </div>
      </section>
    </main>
  );
}

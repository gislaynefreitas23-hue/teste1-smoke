import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, MapPin } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { productsQueryOptions } from "@/lib/brasa";
import { useCity } from "@/lib/city";
import {
  BUDGETS,
  EXPERIENCES,
  FLAVORS,
  INTENSITIES,
  suggestFor,
  summaryFor,
  type Answers,
} from "@/lib/recommend";

export const Route = createFileRoute("/recomendar")({
  head: () => ({
    meta: [
      { title: "Me ajude a escolher — Pantanal Smoke" },
      {
        name: "description",
        content:
          "Conte o que você curte — sabor, intensidade e quanto quer gastar — e receba sugestões sob medida.",
      },
      { property: "og:title", content: "Me ajude a escolher — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Sugestões sob medida de essências, narguilés e acessórios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recomendar,
});

const EMPTY: Answers = {
  flavors: [],
  intensity: "",
  budget: "",
  experience: "",
  notes: "",
};

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Pills({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={active}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              active
                ? "border-primary bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Recomendar() {
  const { selectedCityId, openSelector } = useCity();
  const currentCity = selectedCityId || "cuiaba";
  const { data: products = [] } = useQuery(productsQueryOptions(currentCity));
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [shown, setShown] = useState<Answers | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setShown(answers);
  }

  const picks = shown ? suggestFor(shown, products) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Me ajude a escolher</h1>
      <p className="mt-2 text-muted-foreground">
        Conte o que você curte e a gente separa as melhores opções para você.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-6 rounded-2xl border bg-card p-6">
        <div>
          <Label className="text-base">Sabores</Label>
          <p className="mb-2 text-sm text-muted-foreground">
            Pode marcar mais de um, se quiser.
          </p>
          <Pills
            options={FLAVORS}
            selected={answers.flavors}
            onToggle={(v) => setAnswers((a) => ({ ...a, flavors: toggle(a.flavors, v) }))}
          />
        </div>

        <div>
          <Label className="text-base">Intensidade</Label>
          <div className="mt-2">
            <Pills
              options={INTENSITIES}
              selected={answers.intensity ? [answers.intensity] : []}
              onToggle={(v) =>
                setAnswers((a) => ({ ...a, intensity: a.intensity === v ? "" : v }))
              }
            />
          </div>
        </div>

        <div>
          <Label className="text-base">Quanto quer gastar</Label>
          <div className="mt-2">
            <Pills
              options={BUDGETS}
              selected={answers.budget ? [answers.budget] : []}
              onToggle={(v) => setAnswers((a) => ({ ...a, budget: a.budget === v ? "" : v }))}
            />
          </div>
        </div>

        <div>
          <Label className="text-base">Experiência</Label>
          <div className="mt-2">
            <Pills
              options={EXPERIENCES}
              selected={answers.experience ? [answers.experience] : []}
              onToggle={(v) =>
                setAnswers((a) => ({ ...a, experience: a.experience === v ? "" : v }))
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Algo mais? (opcional)</Label>
          <Textarea
            id="notes"
            rows={3}
            value={answers.notes}
            onChange={(e) => setAnswers((a) => ({ ...a, notes: e.target.value }))}
            placeholder="Ex.: gosto de coisa gelada, prefiro algo suave para usar em casa"
          />
        </div>

        <Button type="submit" size="lg" className="w-full bg-ember shadow-glow">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Ver sugestões
        </Button>
      </form>

      {shown && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Sugestões para {summaryFor(shown)}</h2>

          {picks.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              Não encontramos nada com essas preferências. Tente marcar mais de um sabor ou
              abrir um pouco o orçamento.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {picks.map(({ product, reasons }) => (
                <div key={product.id}>
                  <ProductCard product={product} />
                  {reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 px-1 text-xs text-muted-foreground">
                      {reasons.map((r) => (
                        <li key={r}>• {r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

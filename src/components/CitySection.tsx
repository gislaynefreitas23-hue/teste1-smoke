import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CityCards } from "@/components/CityCards";
import { useCity } from "@/lib/city";

type CitySectionProps = {
  id?: string;
  className?: string;
};

export function CitySection({ id = "cidades", className = "" }: CitySectionProps) {
  const { selectedCity, openSelector } = useCity();

  return (
    <section
      id={id}
      aria-label="Seleção de cidade"
      className={`relative my-8 overflow-hidden rounded-3xl border border-primary/20 bg-card/40 p-6 sm:p-10 backdrop-blur-sm ${className}`}
    >
      {/* Luz ambiente de fundo neon roxo */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <MapPin className="h-3.5 w-3.5" />
          <span>Atendimento Regional</span>
        </div>

        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Estamos presentes em <span className="text-ember">Cuiabá</span> e{" "}
          <span className="text-ember">São Paulo</span>
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Escolha sua cidade para consultar as informações de atendimento e as condições
          disponíveis para sua região.
        </p>

        {selectedCity && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-4 py-1.5 text-xs text-muted-foreground">
            <span>
              Região ativa: <strong className="text-foreground">{selectedCity.name} ({selectedCity.shortState})</strong>
            </span>
            <span className="text-border">•</span>
            <button
              type="button"
              onClick={openSelector}
              className="font-semibold text-primary hover:underline cursor-pointer"
            >
              Alterar cidade
            </button>
          </div>
        )}
      </div>

      <div className="relative mt-8 sm:mt-10">
        <CityCards />
      </div>

      {selectedCity && (
        <div className="mt-8 flex justify-center">
          <Button size="lg" className="bg-ember shadow-glow px-8" asChild>
            <Link to="/produtos">
              Continuar para os produtos em {selectedCity.name}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

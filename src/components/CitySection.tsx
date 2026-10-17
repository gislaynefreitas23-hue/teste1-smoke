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
      className={`relative my-6 sm:my-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-card/40 p-3.5 sm:p-10 backdrop-blur-sm ${className}`}
    >
      {/* Luz ambiente de fundo neon roxo */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-primary">
          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span>Atendimento Regional</span>
        </div>

        <h2 className="mt-3 sm:mt-4 text-xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Estamos presentes em <span className="text-ember">Cuiabá</span> e{" "}
          <span className="text-ember">São Paulo</span>
        </h2>

        <p className="mx-auto mt-2 sm:mt-4 max-w-2xl text-xs sm:text-lg text-muted-foreground">
          Escolha sua cidade para consultar as informações de atendimento e as condições
          disponíveis para sua região.
        </p>

        {selectedCity && (
          <div className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 sm:px-4 sm:py-1.5 text-[11px] sm:text-xs text-muted-foreground">
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

      <div className="relative mt-5 sm:mt-10">
        <CityCards />
      </div>

      {selectedCity && (
        <div className="mt-5 sm:mt-8 flex justify-center">
          <Button size="lg" className="w-full sm:w-auto bg-ember shadow-glow px-4 sm:px-8 text-xs sm:text-base" asChild>
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

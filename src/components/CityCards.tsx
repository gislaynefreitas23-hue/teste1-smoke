import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CITIES, type CityId, useCity } from "@/lib/city";

type CityCardsProps = {
  onSelected?: (cityId: CityId) => void;
  compact?: boolean;
};

export function CityCards({ onSelected, compact = false }: CityCardsProps) {
  const { selectedCityId, selectCity } = useCity();

  const handleSelect = (id: CityId) => {
    selectCity(id);
    onSelected?.(id);
  };

  const cityList = [CITIES["cuiaba"], CITIES["sao-paulo"]];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {cityList.map((city) => {
        const isSelected = selectedCityId === city.id;

        return (
          <div
            key={city.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(city.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(city.id);
              }
            }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 sm:p-8 text-left transition-all duration-300 cursor-pointer ${
              isSelected
                ? "border-primary bg-card/90 shadow-glow ring-1 ring-primary"
                : "border-border/60 bg-card/60 hover:border-primary/80 hover:bg-card/90 hover:shadow-glow hover:-translate-y-1"
            }`}
          >
            {/* Efeito sutil de luz roxo neon no topo do card */}
            <div className="pointer-events-none absolute -top-14 left-1/2 h-28 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl transition-opacity duration-300 group-hover:bg-primary/25" />

            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:border-primary/60 group-hover:bg-primary/20">
                  <MapPin className="h-6 w-6" aria-hidden="true" />
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    <Check className="h-3.5 w-3.5" />
                    Região ativa
                  </span>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    Atendimento local
                  </span>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {city.name} - {city.shortState}
                </h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {city.state}
                </p>
                {city.id === "cuiaba" && (
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    Entrega local · Atendimento das 10h às 19h
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40">
              <Button
                type="button"
                size={compact ? "default" : "lg"}
                className={`w-full transition-all duration-300 ${
                  isSelected
                    ? "bg-ember text-primary-foreground font-semibold shadow-glow"
                    : "bg-secondary/70 text-foreground group-hover:bg-ember group-hover:text-primary-foreground group-hover:shadow-glow"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(city.id);
                }}
              >
                {isSelected ? `✓ ${city.name} Selecionada` : city.buttonText}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

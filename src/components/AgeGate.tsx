import { useEffect, useState } from "react";

import logoImage from "@/assets/pantanal-logo.png";
import { Button } from "@/components/ui/button";
import { AGE_GATE_KEY } from "@/lib/brasa";

/**
 * Porta de idade: esconde a loja até a pessoa confirmar que é maior de 18.
 * A confirmação fica guardada no navegador, então só aparece uma vez.
 */
export function AgeGate() {
  const [open, setOpen] = useState(false);
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(AGE_GATE_KEY) !== "1") setOpen(true);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center">
        <h2>
          <img
            src={logoImage}
            alt="Pantanal Smoke"
            className="mx-auto h-24 w-full object-contain"
          />
        </h2>

        {refused ? (
          <p className="mt-4 text-muted-foreground">
            Este site é exclusivo para maiores de 18 anos.
          </p>
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">Você tem 18 anos ou mais?</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRefused(true)}>
                Não
              </Button>
              <Button
                className="flex-1 bg-ember shadow-glow"
                onClick={() => {
                  localStorage.setItem(AGE_GATE_KEY, "1");
                  setOpen(false);
                }}
              >
                Sim, tenho
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Venda proibida para menores de 18 anos. Não vendemos cigarros eletrônicos.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

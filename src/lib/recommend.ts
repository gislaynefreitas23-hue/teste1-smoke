import type { Product } from "@/lib/brasa";

export type Answers = {
  flavors: string[];
  intensity: string;
  budget: string;
  experience: string;
  notes: string;
};

export const FLAVORS = ["Frutado", "Cítrico", "Menta", "Especiado", "Neutro"];
export const INTENSITIES = ["Leve", "Média", "Forte"];
export const BUDGETS = ["Até R$ 50", "R$ 50 a R$ 200", "Acima de R$ 200"];
export const EXPERIENCES = ["Iniciante", "Já tenho experiência"];

const BUDGET_RANGE: Record<string, [number, number]> = {
  "Até R$ 50": [0, 50],
  "R$ 50 a R$ 200": [50, 200],
  "Acima de R$ 200": [200, Infinity],
};

/** Palavras que a pessoa pode digitar e que apontam para um sabor. */
const NOTE_HINTS: Record<string, string> = {
  menta: "menta",
  gelad: "menta",
  refresc: "menta",
  fruita: "frutado",
  frut: "frutado",
  morango: "frutado",
  uva: "frutado",
  maca: "frutado",
  maça: "frutado",
  limao: "cítrico",
  limão: "cítrico",
  citric: "cítrico",
  cítric: "cítrico",
  especi: "especiado",
  tabaco: "especiado",
  suave: "neutro",
  classico: "especiado",
  clássico: "especiado",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function suggestFor(answers: Answers, products: Product[]) {
  const notes = normalize(answers.notes);
  const [min, max] = BUDGET_RANGE[answers.budget] ?? [0, Infinity];

  const scored = products.map((product) => {
    const reasons: string[] = [];
    let score = 0;

    const flavor = normalize(product.flavor_profile);
    if (answers.flavors.some((f) => normalize(f) === flavor)) {
      score += 4;
      reasons.push(`Perfil ${product.flavor_profile.toLowerCase()}`);
    }

    if (normalize(product.intensity) === normalize(answers.intensity)) {
      score += 3;
      reasons.push(`Intensidade ${product.intensity.toLowerCase()}`);
    }

    const price = Number(product.price);
    if (price >= min && price <= max) {
      score += 2;
      reasons.push("Dentro do seu orçamento");
    } else {
      score -= 2;
    }

    if (answers.experience === "Iniciante") {
      if (normalize(product.intensity) === "leve") {
        score += 2;
        reasons.push("Suave para começar");
      }
      if (normalize(product.category) === "kit") {
        score += 3;
        reasons.push("Vem pronto para usar");
      }
    } else if (normalize(product.intensity) === "forte") {
      score += 2;
      reasons.push("Para quem já conhece");
    }

    for (const [needle, flavorHint] of Object.entries(NOTE_HINTS)) {
      if (notes.includes(normalize(needle))) {
        if (flavorHint === flavor) {
          score += 3;
          reasons.push("Combina com o que você descreveu");
        }
        break;
      }
    }

    if (score > 0 && /kit|combo/i.test(product.name)) {
      score += 1;
    }

    return { product, score, reasons: reasons.slice(0, 3) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, 3);
}

export function summaryFor(answers: Answers) {
  const parts = [
    answers.flavors.length ? answers.flavors.join(" + ") : null,
    answers.intensity ? `intensidade ${answers.intensity.toLowerCase()}` : null,
    answers.budget ? `até ${answers.budget.toLowerCase()}` : null,
    answers.experience ? `perfil ${answers.experience.toLowerCase()}` : null,
  ].filter(Boolean);
  return parts.join(", ") || "uma sugestão equilibrada";
}

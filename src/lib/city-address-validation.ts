/**
 * Validação de compatibilidade entre endereço de entrega e praça ativa
 * Pantanal Smoke - Regras Estritas de Separação de Praças
 */

export type SupportedCityId = "cuiaba" | "sao-paulo";

export interface AddressValidationInput {
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  state?: string | null;
  rua?: string | null;
  bairro?: string | null;
}

export interface AddressValidationResult {
  isValid: boolean;
  detectedCityId: SupportedCityId | "other" | null;
  detectedCityName: string;
  detectedUf: string;
  targetCityId: SupportedCityId;
  targetCityName: string;
  targetUf: string;
  errorMessage?: string;
}

export const CITY_METADATA: Record<SupportedCityId, { name: string; uf: string }> = {
  cuiaba: {
    name: "Cuiabá",
    uf: "MT",
  },
  "sao-paulo": {
    name: "São Paulo",
    uf: "SP",
  },
};

/**
 * Remove formatação e caracteres não numéricos do CEP
 */
export function cleanCep(cep?: string | null): string {
  if (!cep) return "";
  return cep.replace(/\D/g, "").slice(0, 8);
}

/**
 * Normaliza textos removendo acentos e convertendo para minúsculas
 */
function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Detecta a cidade e UF com base em CEP, nome da cidade e estado
 */
export function detectCityAndUfFromAddress(address: AddressValidationInput): {
  detectedCityId: SupportedCityId | "other" | null;
  cityName: string;
  uf: string;
} {
  const digits = cleanCep(address.cep);
  const normCity = normalizeText(address.cidade);
  const normUf = normalizeText(address.uf || address.state);

  // 1. Detecção por CEP
  if (digits.length >= 2) {
    // Faixa MT: 78000-000 até 78899-999
    if (digits.startsWith("78")) {
      return {
        detectedCityId: "cuiaba",
        cityName: address.cidade?.trim() || "Cuiabá",
        uf: "MT",
      };
    }

    // Faixa SP: 01000-000 até 19999-999
    const firstTwo = parseInt(digits.slice(0, 2), 10);
    if ((firstTwo >= 1 && firstTwo <= 19) || digits.startsWith("0")) {
      return {
        detectedCityId: "sao-paulo",
        cityName: address.cidade?.trim() || "São Paulo",
        uf: "SP",
      };
    }

    // Outros estados brasileiros por CEP
    if (digits.length === 8) {
      return {
        detectedCityId: "other",
        cityName: address.cidade?.trim() || "Outra Cidade",
        uf: address.uf?.trim() || "BR",
      };
    }
  }

  // 2. Detecção por texto de Cidade / Estado
  if (
    normCity.includes("cuiaba") ||
    normCity.includes("varzea grande") ||
    normUf === "mt" ||
    normUf.includes("mato grosso")
  ) {
    return {
      detectedCityId: "cuiaba",
      cityName: "Cuiabá",
      uf: "MT",
    };
  }

  if (
    normCity.includes("sao paulo") ||
    normUf === "sp" ||
    normUf.includes("sao paulo")
  ) {
    return {
      detectedCityId: "sao-paulo",
      cityName: "São Paulo",
      uf: "SP",
    };
  }

  if (address.cidade || address.uf) {
    return {
      detectedCityId: "other",
      cityName: address.cidade?.trim() || "Outra Cidade",
      uf: address.uf?.trim() || "BR",
    };
  }

  return {
    detectedCityId: null,
    cityName: "",
    uf: "",
  };
}

/**
 * Valida se um endereço é estritamente compatível com a praça ativa
 */
export function validateAddressForPlaza(
  address: AddressValidationInput,
  targetCityId: SupportedCityId = "cuiaba"
): AddressValidationResult {
  const targetMeta = CITY_METADATA[targetCityId] || CITY_METADATA.cuiaba;
  const detection = detectCityAndUfFromAddress(address);

  // Se nada foi informado ainda, não há conflito explícito detectado
  if (!detection.detectedCityId) {
    return {
      isValid: true,
      detectedCityId: null,
      detectedCityName: targetMeta.name,
      detectedUf: targetMeta.uf,
      targetCityId,
      targetCityName: targetMeta.name,
      targetUf: targetMeta.uf,
    };
  }

  // Compatibilidade estrita:
  if (detection.detectedCityId === targetCityId) {
    return {
      isValid: true,
      detectedCityId: detection.detectedCityId,
      detectedCityName: detection.cityName || targetMeta.name,
      detectedUf: detection.uf || targetMeta.uf,
      targetCityId,
      targetCityName: targetMeta.name,
      targetUf: targetMeta.uf,
    };
  }

  // Incompatibilidade detectada
  const detectedLabel = `${detection.cityName || "outra localidade"}${
    detection.uf ? `/${detection.uf}` : ""
  }`;
  const targetLabel = `${targetMeta.name}/${targetMeta.uf}`;

  let errorMessage = `O endereço detectado (${detectedLabel}) não pertence à praça selecionada (${targetLabel}).`;

  if (targetCityId === "cuiaba" && detection.detectedCityId === "sao-paulo") {
    errorMessage = `Identificamos que este endereço pertence a São Paulo/SP, mas sua compra está ativa para a praça de Cuiabá/MT. Troque a praça para São Paulo ou informe um endereço em Cuiabá.`;
  } else if (targetCityId === "sao-paulo" && detection.detectedCityId === "cuiaba") {
    errorMessage = `Identificamos que este endereço pertence a Cuiabá/MT, mas sua compra está ativa para a praça de São Paulo/SP. Troque a praça para Cuiabá ou informe um endereço em São Paulo.`;
  }

  return {
    isValid: false,
    detectedCityId: detection.detectedCityId,
    detectedCityName: detection.cityName,
    detectedUf: detection.uf,
    targetCityId,
    targetCityName: targetMeta.name,
    targetUf: targetMeta.uf,
    errorMessage,
  };
}

/**
 * Guarda de Segurança e Isolamento do Ambiente de Homologação (Staging)
 *
 * Impede estritamente que qualquer instância de staging inicie caso as variáveis
 * de conexão apontem para o projeto Supabase de PRODUÇÃO.
 */

export const PRODUCTION_SUPABASE_PROJECT_ID = "whvvxnwrldzyafwiflir";
export const PRODUCTION_SUPABASE_HOST = "whvvxnwrldzyafwiflir.supabase.co";

export interface StagingValidationResult {
  valid: boolean;
  isStaging: boolean;
  error?: string;
}

function checkIsStaging(): boolean {
  if (typeof process !== "undefined" && process.env) {
    if (
      process.env.VITE_APP_ENV === "staging" ||
      process.env.APP_ENV === "staging" ||
      process.env.NODE_ENV === "staging"
    ) {
      return true;
    }
  }

  try {
    if (typeof import.meta !== "undefined" && (import.meta as any)?.env) {
      const env = (import.meta as any).env;
      if (env.VITE_APP_ENV === "staging" || env.MODE === "staging") {
        return true;
      }
    }
  } catch {
    // ambiente sem import.meta.env
  }

  return false;
}

function getEnvValue(key: string): string {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key]!;
  }
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any)?.env) {
      return (import.meta as any).env[key] || "";
    }
  } catch {
    // ignore
  }
  return "";
}

export function validateStagingIsolation(options?: {
  supabaseUrl?: string;
  projectId?: string;
  isStaging?: boolean;
}): StagingValidationResult {
  const isStaging = options?.isStaging ?? checkIsStaging();

  if (!isStaging) {
    return { valid: true, isStaging: false };
  }

  const currentUrl = (
    options?.supabaseUrl ||
    getEnvValue("VITE_SUPABASE_URL") ||
    getEnvValue("SUPABASE_URL") ||
    ""
  ).toLowerCase();

  const currentProjectId = (
    options?.projectId ||
    getEnvValue("VITE_SUPABASE_PROJECT_ID") ||
    getEnvValue("SUPABASE_PROJECT_ID") ||
    ""
  ).toLowerCase();

  if (
    currentProjectId === PRODUCTION_SUPABASE_PROJECT_ID.toLowerCase() ||
    currentUrl.includes(PRODUCTION_SUPABASE_HOST.toLowerCase())
  ) {
    const errorMsg =
      `[BLOQUEIO DE SEGURANÇA CRÍTICO] O ambiente de homologação (staging) foi configurado para apontar para o projeto Supabase de PRODUÇÃO (${PRODUCTION_SUPABASE_PROJECT_ID}). ` +
      `O boot foi abortado imediatamente para impedir qualquer contaminação ou alteração acidental na base real de produção.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return { valid: true, isStaging: true };
}

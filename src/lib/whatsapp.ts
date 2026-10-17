import { WHATSAPP_NUMBER } from "./brasa";

/**
 * Normaliza o número de telefone para o formato internacional oficial exigido pelo WhatsApp (DDI + DDD + Número)
 * Exemplo: "(65) 99921-0066" -> "5565999210066"
 */
export function formatWhatsAppNumber(phone?: string | null): string {
  const digits = (phone || WHATSAPP_NUMBER).replace(/\D/g, "");
  // Se já tiver 12 ou 13 dígitos e começar com 55 (ex: 5565999210066), retorna diretamente
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  // Se tiver 10 ou 11 dígitos (DDD + número), prefixa com o DDI do Brasil (55)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits || WHATSAPP_NUMBER;
}

/**
 * Constrói a URL no formato oficial do WhatsApp:
 * https://wa.me/NUMERO?text=MENSAGEM
 * Garante número com DDI 55 e codificação de caracteres URI padrão.
 */
export function buildWhatsAppUrl(phone: string | undefined | null, message: string): string {
  const cleanNumber = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Detecta se a página está rodando dentro de um iframe (como a prévia embutida do Lovable)
 */
export function isRunningInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Abre o WhatsApp externamente fora de iframes.
 * Garante target="_blank", noopener e noreferrer para evitar bloqueios de CSP / X-Frame-Options no Lovable.
 */
export function openWhatsAppExternal(url: string, e?: React.SyntheticEvent): void {
  if (typeof window === "undefined") return;

  // Se o evento estiver presente, podemos assegurar a abertura limpa
  try {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow && !newWindow.closed) {
      newWindow.focus();
      if (e) e.preventDefault();
      return;
    }
  } catch {
    // Popup bloqueado pelo navegador ou restrição de sandbox
  }

  // Fallback via elemento âncora fora do iframe
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (e) e.preventDefault();
  } catch {
    // Se a sandbox bloquear ambos, não impede o comportamento nativo do <a>
  }
}

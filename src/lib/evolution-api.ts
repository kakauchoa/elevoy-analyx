import { prisma } from "@/lib/prisma";

// ── Envio de mensagem (existente) ────────────────────────────────────────────

interface EnvioMensagem {
  baseUrl: string;
  apiKey: string;
  instancia: string;
  numero: string;
  texto: string;
}

export async function enviarMensagemWhatsApp({ baseUrl, apiKey, instancia, numero, texto }: EnvioMensagem): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${instancia}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Evolution API ${res.status}: ${corpo}`);
  }
}

// ── Gestão de instâncias (rastreamento WhatsApp) ─────────────────────────────

export interface EvolutionConfig {
  url: string;
  apiKey: string;
}

export async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  const config = await prisma.configuracaoPlataforma.findFirst();
  if (!config?.evolutionApiUrl || !config?.evolutionApiKey) return null;
  return {
    url: config.evolutionApiUrl.replace(/\/$/, ""),
    apiKey: config.evolutionApiKey,
  };
}

function evoHeaders(apiKey: string) {
  return { "Content-Type": "application/json", apikey: apiKey };
}

export type EvolutionState = "open" | "close" | "connecting" | "unknown";

export interface QrResult {
  base64: string | null;
  state: EvolutionState;
}

/** Cria instância e configura webhook para nosso endpoint. */
export async function criarInstancia(
  cfg: EvolutionConfig,
  instanceName: string,
  webhookUrl: string
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const res = await fetch(`${cfg.url}/instance/create`, {
      method: "POST",
      headers: evoHeaders(cfg.apiKey),
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { message?: string };
      return { ok: false, erro: err.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: String(err) };
  }
}

/** Busca QR code base64. Retorna null se já conectado. */
export async function buscarQr(
  cfg: EvolutionConfig,
  instanceName: string
): Promise<QrResult> {
  try {
    const res = await fetch(`${cfg.url}/instance/connect/${instanceName}`, {
      headers: evoHeaders(cfg.apiKey),
    });
    if (!res.ok) return { base64: null, state: "unknown" };
    const data = (await res.json()) as { base64?: string };
    if (data.base64) return { base64: data.base64, state: "connecting" };
    return { base64: null, state: "open" };
  } catch {
    return { base64: null, state: "unknown" };
  }
}

/** Verifica estado da conexão. */
export async function verificarStatus(
  cfg: EvolutionConfig,
  instanceName: string
): Promise<EvolutionState> {
  try {
    const res = await fetch(`${cfg.url}/instance/connectionState/${instanceName}`, {
      headers: evoHeaders(cfg.apiKey),
    });
    if (!res.ok) return "unknown";
    const data = (await res.json()) as { instance?: { state?: string } };
    const state = data.instance?.state;
    if (state === "open") return "open";
    if (state === "connecting") return "connecting";
    return "close";
  } catch {
    return "unknown";
  }
}

/** Desconecta (logout) sem deletar a instância. */
export async function desconectarInstancia(
  cfg: EvolutionConfig,
  instanceName: string
): Promise<boolean> {
  try {
    const res = await fetch(`${cfg.url}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: evoHeaders(cfg.apiKey),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Deleta a instância completamente (recriar após erro de versão). */
export async function deletarInstancia(
  cfg: EvolutionConfig,
  instanceName: string
): Promise<boolean> {
  try {
    const res = await fetch(`${cfg.url}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: evoHeaders(cfg.apiKey),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Reinicia instância (regenera QR sem deletar). */
export async function reiniciarInstancia(
  cfg: EvolutionConfig,
  instanceName: string
): Promise<boolean> {
  try {
    const res = await fetch(`${cfg.url}/instance/restart/${instanceName}`, {
      method: "PUT",
      headers: evoHeaders(cfg.apiKey),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Gera nome de instância sanitizado a partir do ID da conta. */
export function nomeInstancia(contaId: string): string {
  return `elevoy-${contaId.replace(/-/g, "").slice(0, 20)}`;
}

import { prisma } from "./prisma";

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

// Retorna access_token válido, renovando se necessário
async function getAccessToken(usuarioId: string): Promise<string | null> {
  const integracao = await prisma.integracaoGoogle.findUnique({ where: { usuarioId } });
  if (!integracao) return null;

  // Ainda válido (com 60s de margem)
  if (integracao.expiresAt.getTime() > Date.now() + 60_000) {
    return integracao.accessToken;
  }

  // Renovar via refresh_token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: integracao.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = (await res.json()) as AccessTokenResponse;
  if (tokens.error || !tokens.access_token) return null;

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.integracaoGoogle.update({
    where: { usuarioId },
    data: { accessToken: tokens.access_token, expiresAt },
  });

  return tokens.access_token;
}

interface CriarEventoParams {
  usuarioId: string;
  summary: string;
  description?: string;
  dataFollowUp: Date;
}

export async function criarEventoCalendario(params: CriarEventoParams): Promise<string | null> {
  const token = await getAccessToken(params.usuarioId);
  if (!token) return null;

  const inicio = new Date(params.dataFollowUp);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000); // 1 hora depois

  const evento = {
    summary: `CRM: ${params.summary}`,
    description: params.description ?? "Follow-up de lead via Elevoy",
    start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(evento),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { id: string };
  return data.id ?? null;
}

export async function atualizarEventoCalendario(
  usuarioId: string,
  eventId: string,
  summary: string,
  dataFollowUp: Date
): Promise<boolean> {
  const token = await getAccessToken(usuarioId);
  if (!token) return false;

  const inicio = new Date(dataFollowUp);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: `CRM: ${summary}`,
      start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
    }),
  });

  return res.ok;
}

export async function deletarEventoCalendario(usuarioId: string, eventId: string): Promise<void> {
  const token = await getAccessToken(usuarioId);
  if (!token) return;

  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

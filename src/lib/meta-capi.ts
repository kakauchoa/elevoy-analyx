import crypto from "crypto";

export type EventoCapi =
  | "LeadSubmitted"
  | "QualifiedLead"
  | "InitiateCheckout"
  | "Purchase";

interface PayloadCapi {
  pixelId: string;
  accessToken: string;
  pageId: string;
  evento: EventoCapi;
  telefone: string;
  ctwa: string;
  valor?: number;
}

function hashTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, "");
  return crypto.createHash("sha256").update(limpo).digest("hex");
}

export async function dispararEventoCapi(payload: PayloadCapi): Promise<{ sucesso: boolean; resposta: string }> {
  const { pixelId, accessToken, pageId, evento, telefone, ctwa, valor } = payload;

  const eventTime = Math.floor(Date.now() / 1000);
  const phoneSha = hashTelefone(telefone);

  const userData: Record<string, string> = {
    page_id: pageId,
    ctwa_clid: ctwa,
    ph: phoneSha,
  };

  const customData: Record<string, unknown> =
    evento === "Purchase" || evento === "InitiateCheckout"
      ? { currency: "BRL", value: valor ?? 0 }
      : {};

  const body = {
    data: [
      {
        action_source: "business_messaging",
        event_name: evento,
        event_time: eventTime,
        messaging_channel: "whatsapp",
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json() as unknown;
    return { sucesso: res.ok, resposta: JSON.stringify(data) };
  } catch (err) {
    return { sucesso: false, resposta: String(err) };
  }
}

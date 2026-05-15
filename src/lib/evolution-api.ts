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
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Evolution API ${res.status}: ${corpo}`);
  }
}

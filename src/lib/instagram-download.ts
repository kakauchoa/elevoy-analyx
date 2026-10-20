// Busca de mídia pública do Instagram (reels, vídeos e fotos) a partir do link.
// Uso interno da Elevoy. Funciona só com posts públicos e sem login.
// O Instagram muda esse formato com frequência — se parar de funcionar, o ajuste é aqui.

export interface ItemMidia {
  tipo: "video" | "foto";
  url: string;
  miniatura: string | null;
}

export interface ResultadoInstagram {
  titulo: string;
  itens: ItemMidia[];
}

// Hosts de CDN permitidos no proxy de download (evita usar a rota para acessar qualquer URL)
const HOSTS_PERMITIDOS = [/\.cdninstagram\.com$/i, /\.fbcdn\.net$/i];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function hostPermitido(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOSTS_PERMITIDOS.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

// Extrai o shortcode de links /p/, /reel/, /reels/ e /tv/
export function extrairShortcode(link: string): string | null {
  try {
    const u = new URL(link.trim());
    if (!/(^|\.)instagram\.com$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/(?:p|reels?|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Decodifica sequências como & e \/ vindas de JSON embutido no HTML
function desescapar(texto: string): string {
  try {
    return JSON.parse(`"${texto}"`) as string;
  } catch {
    return texto.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  }
}

function coletar(html: string, campo: string): string[] {
  const re = new RegExp(`\\\\?"${campo}\\\\?":\\\\?"(https:[^"\\\\]*(?:\\\\.[^"\\\\]*)*)`, "g");
  const achados: string[] = [];
  for (const m of html.matchAll(re)) {
    // O valor pode estar com 1 ou 2 níveis de escape dependendo do formato da página
    let valor = m[1];
    for (let i = 0; i < 2; i++) valor = desescapar(valor.replace(/\\+$/, ""));
    if (valor.startsWith("https://") && !achados.includes(valor)) achados.push(valor);
  }
  return achados;
}

export async function buscarMidiaInstagram(link: string): Promise<ResultadoInstagram> {
  const codigo = extrairShortcode(link);
  if (!codigo) throw new Error("Link inválido. Use um link de post, reel ou vídeo do Instagram.");

  const resposta = await fetch(`https://www.instagram.com/p/${codigo}/embed/captioned/`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR,pt;q=0.9" },
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível acessar o post. Ele pode ser privado ou ter sido removido.");
  }
  const html = await resposta.text();

  const videos = coletar(html, "video_url");
  const fotos = coletar(html, "display_url");

  const itens: ItemMidia[] = [];
  if (videos.length > 0) {
    videos.forEach((url, i) => itens.push({ tipo: "video", url, miniatura: fotos[i] ?? fotos[0] ?? null }));
  } else {
    fotos.forEach((url) => itens.push({ tipo: "foto", url, miniatura: url }));
  }

  if (itens.length === 0) {
    throw new Error("Nenhuma mídia encontrada. O post pode ser privado ou o Instagram bloqueou a consulta.");
  }

  const tituloMatch = html.match(/<title>([^<]*)<\/title>/i);
  return { titulo: tituloMatch ? tituloMatch[1].trim() : "Post do Instagram", itens };
}

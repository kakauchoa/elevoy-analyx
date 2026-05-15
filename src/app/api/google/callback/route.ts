import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const rawState = searchParams.get("state") ?? "";
  const erro = searchParams.get("error");

  const appUrl = process.env.NEXTAUTH_URL ?? "";

  // State pode ser "userId" ou "userId:popup"
  const isPopup = rawState.endsWith(":popup");
  const usuarioId = isPopup ? rawState.slice(0, -":popup".length) : rawState;

  if (erro || !code || !usuarioId) {
    if (isPopup) return popupResponse("erro");
    return NextResponse.redirect(`${appUrl}/perfil?google=erro`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as TokenResponse;

    if (tokens.error || !tokens.access_token) {
      if (isPopup) return popupResponse("erro");
      return NextResponse.redirect(`${appUrl}/perfil?google=erro`);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.integracaoGoogle.upsert({
      where: { usuarioId },
      create: {
        usuarioId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
      },
    });

    if (isPopup) return popupResponse("conectado");
    return NextResponse.redirect(`${appUrl}/perfil?google=conectado`);
  } catch {
    if (isPopup) return popupResponse("erro");
    return NextResponse.redirect(`${appUrl}/perfil?google=erro`);
  }
}

// Retorna página HTML que notifica a janela pai e fecha o popup
function popupResponse(status: "conectado" | "erro") {
  const html = `<!DOCTYPE html><html><body><script>
    try { window.opener.postMessage({ google: '${status}' }, '*'); } catch(_) {}
    window.close();
  </script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

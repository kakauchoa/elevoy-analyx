import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"].join(" ");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/callback`;

  if (!clientId) {
    return NextResponse.json({ erro: "Google OAuth não configurado. Adicione GOOGLE_CLIENT_ID no .env" }, { status: 503 });
  }

  // Encoda se veio de popup para o callback saber fechar a janela
  const isPopup = req.nextUrl.searchParams.get("popup") === "1";
  const state = isPopup ? `${session.user.id}:popup` : session.user.id;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri!,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}

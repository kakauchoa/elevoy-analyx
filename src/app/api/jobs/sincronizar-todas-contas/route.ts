import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sincronizarTodasContas } from "@/services/sincronizacao.service";

export async function POST(req: NextRequest) {
  const segredo = req.headers.get("x-cron-secret");
  const cronOk = segredo && segredo === process.env.CRON_SECRET;

  if (!cronOk) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  // Inicia em background — não bloqueia a resposta
  void sincronizarTodasContas();

  return NextResponse.json({ ok: true, iniciado: true });
}

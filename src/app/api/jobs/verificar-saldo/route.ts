import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verificarSaldoContas } from "@/lib/verificar-saldo";

export async function POST(req: NextRequest) {
  const segredo = req.headers.get("x-cron-secret");
  const cronOk = segredo && segredo === process.env.CRON_SECRET;

  if (!cronOk) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const resultado = await verificarSaldoContas();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verificarSaldoContas } from "@/lib/verificar-saldo";

export async function POST(req: NextRequest) {
  const segredo = req.headers.get("x-cron-secret");
  if (segredo !== process.env.CRON_SECRET) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const resultado = await verificarSaldoContas();
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolverAcesso } from "@/lib/acesso-contas";
import { baileysManager } from "@/lib/baileys-manager";

type Params = Promise<{ contaId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaId } = await params;
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(contaId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const resultado = await baileysManager.conectar(contaId);
    return NextResponse.json({ base64: resultado.qrBase64, state: resultado.estado });
  } catch (err) {
    console.error("[POST /api/rastreamento/whatsapp/[contaId]/conectar]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

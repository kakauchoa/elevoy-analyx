import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = (await req.json()) as { crmContatoId: string };

    await prisma.prospeccaoGmn.update({
      where: { id, usuarioId: session.user.id },
      data: { enviadoCrm: true, crmContatoId: body.crmContatoId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

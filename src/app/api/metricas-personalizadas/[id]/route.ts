import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const metrica = await prisma.metricaPersonalizada.findFirst({
      where: { id, usuarioId: session.user.id },
    });
    if (!metrica) {
      return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });
    }

    await prisma.metricaPersonalizada.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

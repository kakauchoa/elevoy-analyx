import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const sessionUser = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { perfil: true },
    });
    if (sessionUser?.perfil !== "admin") {
      return NextResponse.json({ erro: "Apenas admins podem alterar planos" }, { status: 403 });
    }

    const { id } = await params;

    const body = (await req.json()) as {
      plano?: "free" | "basico" | "intermediario" | "personalizado";
      contasMaximas?: number;
      assinaturaAtiva?: boolean;
    };

    const atualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(body.plano !== undefined && { plano: body.plano }),
        ...(body.contasMaximas !== undefined && { contasMaximas: body.contasMaximas }),
        ...(body.assinaturaAtiva !== undefined && { assinaturaAtiva: body.assinaturaAtiva }),
      },
      select: { id: true, plano: true, contasMaximas: true, assinaturaAtiva: true },
    });

    return NextResponse.json(atualizado);
  } catch (err) {
    console.error("[PATCH /api/usuarios/[id]/plano]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

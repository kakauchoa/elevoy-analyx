import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarAdminMaster } from "@/lib/admin-master-auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  if (!verificarAdminMaster()) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
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
    console.error("[PATCH /api/admin-master/usuarios/[id]/plano]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

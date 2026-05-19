import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email: string };

    if (!email) {
      return NextResponse.json({ erro: "Email obrigatório" }, { status: 400 });
    }

    const cliente = await prisma.clienteCrm.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Não revela se o email existe ou não
    if (!cliente || cliente.status === "rejeitado") {
      return NextResponse.json({ ok: true });
    }

    // Invalida solicitações anteriores pendentes
    await prisma.solicitacaoResetCrm.updateMany({
      where: { clienteId: cliente.id, status: "pendente" },
      data: { status: "rejeitado" },
    });

    // Cria nova solicitação com token de 24h
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.solicitacaoResetCrm.create({
      data: {
        clienteId: cliente.id,
        token,
        expiresAt,
        status: "pendente",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/cliente-crm/reset-senha]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

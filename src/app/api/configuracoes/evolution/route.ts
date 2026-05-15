import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";

async function verificarAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const { isAdmin } = await resolverAcesso(session.user.id);
  if (!isAdmin) return null;
  return session;
}

export async function GET() {
  try {
    const session = await verificarAdmin();
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const config = await prisma.configuracaoPlataforma.findFirst();

    return NextResponse.json(config ?? {});
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verificarAdmin();
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      evolutionApiUrl?: string;
      evolutionApiKey?: string;
      evolutionInstance?: string;
      evolutionWhatsapp?: string;
    };

    const existente = await prisma.configuracaoPlataforma.findFirst();

    const dados = {
      evolutionApiUrl: body.evolutionApiUrl ?? null,
      evolutionApiKey: body.evolutionApiKey ?? null,
      evolutionInstance: body.evolutionInstance ?? null,
      evolutionWhatsapp: body.evolutionWhatsapp ?? null,
    };

    if (existente) {
      await prisma.configuracaoPlataforma.update({ where: { id: existente.id }, data: dados });
    } else {
      await prisma.configuracaoPlataforma.create({ data: dados });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

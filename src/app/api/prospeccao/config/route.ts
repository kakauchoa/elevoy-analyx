import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const config = await prisma.configuracaoPlataforma.findFirst();
  return NextResponse.json({ configurado: !!config?.googlePlacesApiKey });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

  const body = (await req.json()) as { apiKey?: string };
  if (!body.apiKey?.trim()) return NextResponse.json({ erro: "Chave inválida" }, { status: 400 });

  const config = await prisma.configuracaoPlataforma.findFirst();
  if (config) {
    await prisma.configuracaoPlataforma.update({
      where: { id: config.id },
      data: { googlePlacesApiKey: body.apiKey.trim() },
    });
  } else {
    await prisma.configuracaoPlataforma.create({
      data: { googlePlacesApiKey: body.apiKey.trim() },
    });
  }

  return NextResponse.json({ ok: true });
}

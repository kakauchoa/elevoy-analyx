import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolverAcesso } from "@/lib/acesso-contas";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { contaIds } = await resolverAcesso(session.user.id);

    const clientes = await prisma.clienteCrm.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        status: true,
        aprovadoEm: true,
        criadoEm: true,
        contaAnuncioId: true,
        conta: { select: { nomeCliente: true } },
      },
    });

    const contasSet = new Set(contaIds);

    return NextResponse.json(
      clientes.map((c) => ({
        ...c,
        contaAnuncioId: c.contaAnuncioId,
        nomeCliente: c.conta?.nomeCliente ?? null,
        aprovadoEm: c.aprovadoEm?.toISOString() ?? null,
        criadoEm: c.criadoEm.toISOString(),
        contaDoGestor: c.contaAnuncioId ? contasSet.has(c.contaAnuncioId) : false,
      }))
    );
  } catch (err) {
    console.error("[GET /api/rastreamento/clientes]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as {
      nome: string;
      email: string;
      telefone?: string;
      senha: string;
      contaAnuncioId: string;
    };

    if (!body.nome || !body.email || !body.senha || !body.contaAnuncioId) {
      return NextResponse.json({ erro: "Campos obrigatórios faltando" }, { status: 400 });
    }

    // Verifica que o gestor tem acesso à conta
    const { contaIds } = await resolverAcesso(session.user.id);
    if (!contaIds.includes(body.contaAnuncioId)) {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const emailExistente = await prisma.clienteCrm.findUnique({
      where: { email: body.email },
    });
    if (emailExistente) {
      return NextResponse.json({ erro: "E-mail já cadastrado" }, { status: 409 });
    }

    const senhaHash = await bcrypt.hash(body.senha, 10);

    const cliente = await prisma.clienteCrm.create({
      data: {
        nome: body.nome,
        email: body.email,
        telefone: body.telefone ?? null,
        senhaHash,
        status: "aprovado",
        contaAnuncioId: body.contaAnuncioId,
        aprovadoEm: new Date(),
        aprovadoPorId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true, id: cliente.id });
  } catch (err) {
    console.error("[POST /api/rastreamento/clientes]", err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}

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

    const { isAdmin, contaIds } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

    // Carrega todos os gestores: o próprio admin + sub-gestores vinculados
    const gestores = await prisma.usuario.findMany({
      where: { tipo: "gestor", ativo: true },
      select: {
        id: true,
        nome: true,
        email: true,
        criadoEm: true,
        plano: true,
        contasMaximas: true,
        assinaturaAtiva: true,
        gestorContas: {
          where: { contaAnuncioId: { in: contaIds } },
          select: {
            conta: { select: { id: true, nomeCliente: true } },
          },
        },
      },
      orderBy: { criadoEm: "asc" },
    });

    // Carrega as contas do admin para exibir no card do próprio admin
    const contasAdmin = await prisma.contaAnuncio.findMany({
      where: { usuarioId: session.user.id, ativo: true },
      select: { id: true, nomeCliente: true },
      orderBy: { nomeCliente: "asc" },
    });

    const resultado = gestores.map((g) => ({
      id: g.id,
      nome: g.nome,
      email: g.email,
      criadoEm: g.criadoEm.toISOString(),
      isAdmin: g.id === session.user.id,
      plano: g.plano,
      contasMaximas: g.contasMaximas,
      assinaturaAtiva: g.assinaturaAtiva,
      contasComAcesso:
        g.id === session.user.id
          ? contasAdmin
          : g.gestorContas.map((gc) => gc.conta),
    }));

    return NextResponse.json({ gestores: resultado, contasAdmin });
  } catch (erro) {
    console.error("[GET /api/usuarios]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { isAdmin } = await resolverAcesso(session.user.id);
    if (!isAdmin) return NextResponse.json({ erro: "Acesso restrito ao administrador" }, { status: 403 });

    const body = await req.json() as { nome?: string; email?: string; senha?: string };
    const { nome, email, senha } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json({ erro: "Nome, email e senha são obrigatórios" }, { status: 400 });
    }

    if (senha.length < 6) {
      return NextResponse.json({ erro: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json({ erro: "Este email já está em uso" }, { status: 400 });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const novoGestor = await prisma.usuario.create({
      data: { nome, email, senhaHash, tipo: "gestor" },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });

    return NextResponse.json(
      { ...novoGestor, criadoEm: novoGestor.criadoEm.toISOString(), isAdmin: false, contasComAcesso: [] },
      { status: 201 }
    );
  } catch (erro) {
    console.error("[POST /api/usuarios]", erro);
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buscarMidiaInstagram } from "@/lib/instagram-download";

// Recebe o link do Instagram e devolve as mídias encontradas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ erro: "Informe o link." }, { status: 400 });

    const resultado = await buscarMidiaInstagram(url);
    return NextResponse.json(resultado);
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Erro interno do servidor";
    return NextResponse.json({ erro: mensagem }, { status: 422 });
  }
}

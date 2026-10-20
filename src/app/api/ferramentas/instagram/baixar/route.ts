import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hostPermitido } from "@/lib/instagram-download";

// Faz o download do arquivo pelo servidor (evita bloqueio de CORS e força o "salvar como")
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const alvo = req.nextUrl.searchParams.get("u");
    const nome = (req.nextUrl.searchParams.get("nome") ?? "instagram").replace(/[^\w.-]/g, "_");
    if (!alvo || !hostPermitido(alvo)) {
      return NextResponse.json({ erro: "URL não permitida" }, { status: 400 });
    }

    const origem = await fetch(alvo, { cache: "no-store" });
    if (!origem.ok || !origem.body) {
      return NextResponse.json({ erro: "Arquivo indisponível" }, { status: 502 });
    }

    const tipo = origem.headers.get("content-type") ?? "application/octet-stream";
    const ext = tipo.includes("video") ? "mp4" : tipo.includes("png") ? "png" : "jpg";

    return new NextResponse(origem.body, {
      headers: {
        "Content-Type": tipo,
        "Content-Disposition": `attachment; filename="${nome}.${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function detectarDispositivo(userAgent: string): "desktop" | "mobile" | "tablet" | "desconhecido" {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/.test(ua)) return "mobile";
  if (ua.length > 0) return "desktop";
  return "desconhecido";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as { referrer?: string; duracao?: number };

    const conta = await prisma.contaAnuncio.findUnique({
      where: { slugCompartilhavel: slug },
      select: { id: true, compartilhamentoAtivo: true },
    });

    if (!conta || !conta.compartilhamentoAtivo) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const userAgent = req.headers.get("user-agent") ?? "";
    const dispositivo = detectarDispositivo(userAgent);

    // Geolocalização por IP (serviço gratuito, fire-and-forget)
    let pais: string | null = null;
    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      try {
        const geo = await fetch(`http://ip-api.com/json/${ip}?fields=country`, {
          signal: AbortSignal.timeout(2000),
        });
        const data = (await geo.json()) as { country?: string };
        pais = data.country ?? null;
      } catch {
        // geolocalização é melhor-esforço
      }
    }

    await prisma.acessoDashboard.create({
      data: {
        contaAnuncioId: conta.id,
        slug,
        ipVisitante: ip,
        userAgent: userAgent || null,
        referrer: body.referrer ?? null,
        pais,
        dispositivo,
        duracaoSegundos: body.duracao ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[POST /api/compartilhavel/[slug]/acesso]", erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function detectarDispositivo(userAgent: string): "desktop" | "mobile" | "tablet" | "desconhecido" {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/.test(ua)) return "mobile";
  if (ua.length > 0) return "desktop";
  return "desconhecido";
}

async function geolocalizarIp(ip: string): Promise<string | null> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,regionName,city`,
      { signal: AbortSignal.timeout(2000) }
    );
    const data = (await res.json()) as {
      country?: string;
      regionName?: string;
      city?: string;
    };
    const partes = [data.city, data.regionName, data.country].filter(Boolean);
    return partes.length > 0 ? partes.join(", ") : null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await req.json()) as {
      referrer?: string;
      duracao?: number;
      nome?: string;
    };

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

    const pais =
      ip && ip !== "127.0.0.1" && ip !== "::1"
        ? await geolocalizarIp(ip)
        : null;

    const dadosBase = {
      contaAnuncioId: conta.id,
      slug,
      ipVisitante: ip,
      userAgent: userAgent || null,
      referrer: body.referrer ?? null,
      pais,
      dispositivo,
      duracaoSegundos: body.duracao ?? null,
    };

    try {
      // Tenta salvar com nomeVisitante (requer migration 20260510200000)
      await prisma.acessoDashboard.create({
        data: { ...dadosBase, nomeVisitante: body.nome?.trim() || null },
      });
    } catch {
      // Migration ainda não aplicada na DB — salva sem o campo
      await prisma.acessoDashboard.create({ data: dadosBase });
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[POST /api/compartilhavel/[slug]/acesso]", erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

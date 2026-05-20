import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!usuario?.stripeCustomerId) {
      return NextResponse.json({ erro: "Nenhuma assinatura encontrada" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: usuario.stripeCustomerId,
      return_url: `${appUrl}/planos`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[POST /api/stripe/portal]", err);
    return NextResponse.json({ erro: "Erro ao abrir portal" }, { status: 500 });
  }
}

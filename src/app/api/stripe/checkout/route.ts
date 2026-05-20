import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe, PLANOS, PlanoKey } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as { plano: PlanoKey; quantidade?: number };
    const { plano, quantidade = 1 } = body;

    if (!PLANOS[plano]) {
      return NextResponse.json({ erro: "Plano inválido" }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, nome: true },
    });

    if (!usuario) {
      return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
    }

    let customerId = usuario.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: usuario.email,
        name: usuario.nome,
        metadata: { usuarioId: session.user.id },
      });
      customerId = customer.id;
      await prisma.usuario.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const config = PLANOS[plano];
    const lineItem: { price: string; quantity: number } = {
      price: config.priceId,
      quantity: plano === "personalizado" ? Math.max(1, quantidade) : 1,
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [lineItem],
      success_url: `${appUrl}/planos?sucesso=1`,
      cancel_url: `${appUrl}/planos?cancelado=1`,
      metadata: { usuarioId: session.user.id, plano, quantidade: String(quantidade) },
      subscription_data: {
        metadata: { usuarioId: session.user.id, plano, quantidade: String(quantidade) },
      },
      locale: "pt-BR",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[POST /api/stripe/checkout]", err);
    return NextResponse.json({ erro: "Erro ao criar sessão de pagamento" }, { status: 500 });
  }
}

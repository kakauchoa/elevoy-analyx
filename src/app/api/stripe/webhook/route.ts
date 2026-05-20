import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ erro: "Sem assinatura" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await ativarAssinatura(session);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await atualizarAssinatura(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await cancelarAssinatura(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await marcarPagamentoFalhou(invoice);
        break;
      }
    }
  } catch (err) {
    console.error("[webhook stripe]", event.type, err);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function ativarAssinatura(session: Stripe.Checkout.Session) {
  const usuarioId = session.metadata?.usuarioId;
  const plano = session.metadata?.plano as string;
  const quantidade = Number(session.metadata?.quantidade ?? 1);

  if (!usuarioId || !plano) return;

  const contasMaximas = calcularContas(plano, quantidade);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      plano: plano as "basico" | "intermediario" | "personalizado",
      contasMaximas,
      assinaturaAtiva: true,
      stripeSubscriptionId: session.subscription as string,
    },
  });
}

async function atualizarAssinatura(sub: Stripe.Subscription) {
  const usuarioId = sub.metadata?.usuarioId;
  const plano = sub.metadata?.plano as string;
  const quantidade = Number(sub.metadata?.quantidade ?? 1);

  if (!usuarioId || !plano) {
    const cliente = await getStripe().customers.retrieve(sub.customer as string) as Stripe.Customer;
    const uid = cliente.metadata?.usuarioId;
    if (!uid) return;

    const p = sub.items.data[0]?.price?.metadata?.plano ?? "basico";
    await prisma.usuario.update({
      where: { id: uid },
      data: {
        assinaturaAtiva: sub.status === "active",
        assinaturaVenceEm: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
      },
    });
    return;
  }

  const contasMaximas = calcularContas(plano, quantidade);
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      plano: plano as "basico" | "intermediario" | "personalizado",
      contasMaximas,
      assinaturaAtiva: sub.status === "active",
      assinaturaVenceEm: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
    },
  });
}

async function cancelarAssinatura(sub: Stripe.Subscription) {
  const usuarioId = sub.metadata?.usuarioId;
  if (!usuarioId) {
    const cliente = await getStripe().customers.retrieve(sub.customer as string) as Stripe.Customer;
    const uid = cliente.metadata?.usuarioId;
    if (!uid) return;
    await prisma.usuario.update({
      where: { id: uid },
      data: { plano: "free", contasMaximas: 3, assinaturaAtiva: false },
    });
    return;
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { plano: "free", contasMaximas: 3, assinaturaAtiva: false },
  });
}

async function marcarPagamentoFalhou(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  await prisma.usuario.updateMany({
    where: { stripeCustomerId: customerId },
    data: { assinaturaAtiva: false },
  });
}

function calcularContas(plano: string, quantidade: number): number {
  if (plano === "basico") return 10;
  if (plano === "intermediario") return 30;
  if (plano === "personalizado") return quantidade * 10;
  return 3;
}

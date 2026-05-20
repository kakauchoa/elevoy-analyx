import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY não configurado");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

export const PLANOS = {
  basico: {
    priceId: process.env.STRIPE_PRICE_BASICO ?? "",
    nome: "Básico",
    preco: 49.9,
    contasMaximas: 10,
    descricao: "Ideal para gestores iniciando",
    recursos: [
      "Até 10 contas de anúncio",
      "Dashboard compartilhável",
      "Alertas de saldo via WhatsApp",
      "Rastreamento WhatsApp",
      "Relatórios com IA",
    ],
  },
  intermediario: {
    priceId: process.env.STRIPE_PRICE_INTERMEDIARIO ?? "",
    nome: "Intermediário",
    preco: 149.9,
    contasMaximas: 30,
    descricao: "Para agências em crescimento",
    recursos: [
      "Até 30 contas de anúncio",
      "Dashboard compartilhável",
      "Alertas de saldo via WhatsApp",
      "Rastreamento WhatsApp",
      "Relatórios com IA",
      "Construtor de dashboard",
      "Suporte prioritário",
    ],
  },
  personalizado: {
    priceId: process.env.STRIPE_PRICE_PERSONALIZADO ?? "",
    nome: "Personalizado",
    precoPorPacote: 30,
    contasPorPacote: 10,
    descricao: "Para grandes agências",
    recursos: [
      "Contas ilimitadas (R$ 30/10 contas)",
      "Dashboard compartilhável",
      "Alertas de saldo via WhatsApp",
      "Rastreamento WhatsApp",
      "Relatórios com IA",
      "Construtor de dashboard",
      "Suporte dedicado",
    ],
  },
} as const;

export type PlanoKey = keyof typeof PLANOS;

export const LIMITES_PLANO: Record<string, number> = {
  free: 3,
  basico: 10,
  intermediario: 30,
  personalizado: 9999,
};

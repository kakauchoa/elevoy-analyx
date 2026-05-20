"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { PLANOS, PlanoKey } from "@/lib/stripe";

type PlanoInfo = {
  plano: string;
  contasMaximas: number;
  assinaturaAtiva: boolean;
  assinaturaVenceEm: string | null;
  stripeCustomerId: string | null;
};

const ICONE_CHECK = (
  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

export default function PlanosPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [info, setInfo] = useState<PlanoInfo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [qtdPersonalizado, setQtdPersonalizado] = useState(1);

  const sucesso = searchParams.get("sucesso") === "1";
  const cancelado = searchParams.get("cancelado") === "1";

  useEffect(() => {
    buscarPlanoAtual();
  }, []);

  async function buscarPlanoAtual() {
    try {
      const res = await fetch("/api/stripe/plano");
      if (res.ok) {
        setInfo(await res.json() as PlanoInfo);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function assinar(plano: PlanoKey, quantidade = 1) {
    setErro("");
    setProcessando(plano);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, quantidade }),
      });
      const dados = await res.json() as { url?: string; erro?: string };
      if (!res.ok || !dados.url) {
        setErro(dados.erro ?? "Erro ao iniciar pagamento");
        return;
      }
      window.location.href = dados.url;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setProcessando(null);
    }
  }

  async function abrirPortal() {
    setProcessando("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const dados = await res.json() as { url?: string; erro?: string };
      if (dados.url) window.location.href = dados.url;
      else setErro(dados.erro ?? "Erro ao abrir portal");
    } finally {
      setProcessando(null);
    }
  }

  const planoAtual = info?.plano ?? "free";
  const ativo = info?.assinaturaAtiva ?? false;

  if (carregando) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-[#e5e5e5]">
          <h1 className="text-xl font-bold text-gray-900">Planos e assinatura</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Planos e assinatura</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Escolha o plano ideal para o tamanho da sua agência
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
        {sucesso && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
            Assinatura ativada com sucesso! Bem-vindo ao plano {planoAtual}.
          </div>
        )}
        {cancelado && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            Pagamento cancelado. Seu plano não foi alterado.
          </div>
        )}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Status atual */}
        {info && planoAtual !== "free" && (
          <div className="bg-gray-50 border border-[#e5e5e5] rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Plano atual:{" "}
                <span className="capitalize">
                  {planoAtual === "basico"
                    ? "Básico"
                    : planoAtual === "intermediario"
                    ? "Intermediário"
                    : "Personalizado"}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {info.contasMaximas} contas · {ativo ? "Ativo" : "Inativo"}
                {info.assinaturaVenceEm &&
                  ` · Renova em ${new Date(info.assinaturaVenceEm).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <button
              onClick={abrirPortal}
              disabled={processando === "portal"}
              className="text-sm font-medium text-gray-700 border border-[#e5e5e5] rounded-lg px-4 py-2 hover:bg-white transition-colors disabled:opacity-50"
            >
              {processando === "portal" ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          </div>
        )}

        {/* Cards de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Básico */}
          <CartaoPlano
            titulo="Básico"
            preco="R$ 49,90"
            periodo="/mês"
            descricao={PLANOS.basico.descricao}
            recursos={PLANOS.basico.recursos as unknown as string[]}
            destaque={false}
            planoAtual={planoAtual === "basico" && ativo}
            onAssinar={() => assinar("basico")}
            carregando={processando === "basico"}
          />

          {/* Intermediário */}
          <CartaoPlano
            titulo="Intermediário"
            preco="R$ 149,90"
            periodo="/mês"
            descricao={PLANOS.intermediario.descricao}
            recursos={PLANOS.intermediario.recursos as unknown as string[]}
            destaque
            planoAtual={planoAtual === "intermediario" && ativo}
            onAssinar={() => assinar("intermediario")}
            carregando={processando === "intermediario"}
          />

          {/* Personalizado */}
          <div className="border border-[#e5e5e5] rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Personalizado</p>
              <p className="text-xs text-gray-500 mt-0.5">{PLANOS.personalizado.descricao}</p>
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-900">
                R$ {(qtdPersonalizado * 30).toFixed(2).replace(".", ",")}
              </span>
              <span className="text-sm text-gray-500">/mês</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">
                Pacotes de contas ({qtdPersonalizado * 10} contas)
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQtdPersonalizado((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 border border-[#e5e5e5] rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium">{qtdPersonalizado}</span>
                <button
                  onClick={() => setQtdPersonalizado((q) => q + 1)}
                  className="w-8 h-8 border border-[#e5e5e5] rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            <ul className="flex flex-col gap-2">
              {(PLANOS.personalizado.recursos as unknown as string[]).map((r) => (
                <li key={r} className="flex items-start gap-2 text-xs text-gray-600">
                  {ICONE_CHECK}
                  {r}
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              {planoAtual === "personalizado" && ativo ? (
                <button
                  onClick={abrirPortal}
                  className="w-full border border-[#e5e5e5] text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Gerenciar
                </button>
              ) : (
                <button
                  onClick={() => assinar("personalizado", qtdPersonalizado)}
                  disabled={!!processando}
                  className="w-full bg-gray-900 hover:bg-black text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {processando === "personalizado" ? "Aguarde..." : "Assinar"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Free notice */}
        {planoAtual === "free" && (
          <p className="text-xs text-center text-gray-400">
            Você está no plano gratuito (3 contas). Faça upgrade para desbloquear mais contas.
          </p>
        )}
      </div>
    </div>
  );
}

function CartaoPlano({
  titulo,
  preco,
  periodo,
  descricao,
  recursos,
  destaque,
  planoAtual,
  onAssinar,
  carregando,
}: {
  titulo: string;
  preco: string;
  periodo: string;
  descricao: string;
  recursos: string[];
  destaque: boolean;
  planoAtual: boolean;
  onAssinar: () => void;
  carregando: boolean;
}) {
  return (
    <div
      className={`relative border rounded-2xl p-6 flex flex-col gap-4 ${
        destaque
          ? "border-black shadow-lg"
          : "border-[#e5e5e5]"
      }`}
    >
      {destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">
          Mais popular
        </span>
      )}
      <div>
        <p className="text-base font-semibold text-gray-900">{titulo}</p>
        <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>
      </div>
      <div>
        <span className="text-3xl font-bold text-gray-900">{preco}</span>
        <span className="text-sm text-gray-500">{periodo}</span>
      </div>
      <ul className="flex flex-col gap-2 flex-1">
        {recursos.map((r) => (
          <li key={r} className="flex items-start gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {r}
          </li>
        ))}
      </ul>
      <div>
        {planoAtual ? (
          <div className="w-full border border-green-200 bg-green-50 text-green-700 text-sm font-medium py-2.5 rounded-xl text-center">
            Plano atual
          </div>
        ) : (
          <button
            onClick={onAssinar}
            disabled={carregando}
            className={`w-full text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
              destaque
                ? "bg-black hover:bg-gray-900 text-white"
                : "bg-gray-900 hover:bg-black text-white"
            }`}
          >
            {carregando ? "Aguarde..." : "Assinar"}
          </button>
        )}
      </div>
    </div>
  );
}

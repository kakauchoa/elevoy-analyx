"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ESTADO_CLIENTE,
  LINKS_PADRAO,
  OPCOES_MAPA,
  RESULTADOS,
  SERVICOS_MAPA,
  STATUS_CLIENTE,
  type FichaCliente,
  type LinkCliente,
  type PastaDrive,
  type ValorMapa,
} from "@/lib/claude-clientes";

interface Props {
  inicial: FichaCliente;
  ultimoRelatorio?: string | null;
}

const CAMPO =
  "w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#e85a23] bg-white";
const ROTULO = "block text-xs font-medium text-gray-600 mb-1";

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-[#e5e5e5] rounded-xl p-5">
      <p className="text-sm font-semibold text-gray-900">{titulo}</p>
      {descricao && <p className="text-xs text-gray-500 mt-0.5">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Junta os links salvos com os campos padrão, mantendo os extras no final. */
function linksIniciais(salvos: LinkCliente[]): LinkCliente[] {
  const restantes = [...salvos];
  const lista = LINKS_PADRAO.map((rotulo) => {
    const i = restantes.findIndex((l) => l.rotulo.toLowerCase() === rotulo.toLowerCase());
    if (i === -1) return { rotulo, url: "" };
    const [achado] = restantes.splice(i, 1);
    return achado;
  });
  return [...lista, ...restantes];
}

export function FichaClienteForm({ inicial, ultimoRelatorio }: Props) {
  const router = useRouter();
  const novo = !inicial.id;

  const [ficha, setFicha] = useState<FichaCliente>(inicial);
  const [metaIds, setMetaIds] = useState<string[]>(inicial.metaAdAccountIds.length ? inicial.metaAdAccountIds : [""]);
  const [links, setLinks] = useState<LinkCliente[]>(() => linksIniciais(inicial.links));
  const [pastas, setPastas] = useState<PastaDrive[]>(inicial.pastasDrive.length ? inicial.pastasDrive : [{ titulo: "", url: "" }]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function campo<K extends keyof FichaCliente>(chave: K, valor: FichaCliente[K]) {
    setFicha((f) => ({ ...f, [chave]: valor }));
  }

  function numeroOuNulo(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const corpo = {
      ...ficha,
      metaAdAccountIds: metaIds.filter((m) => m.trim()),
      links: links.filter((l) => l.rotulo.trim() && l.url.trim()),
      pastasDrive: pastas.filter((p) => p.url.trim()),
    };
    try {
      const resp = await fetch(novo ? "/api/claude/clientes" : `/api/claude/clientes/${inicial.id}`, {
        method: novo ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = (await resp.json()) as { id?: string; erro?: string };
      if (!resp.ok) {
        setMensagem({ tipo: "erro", texto: dados.erro ?? "Não foi possível salvar." });
        return;
      }
      setMensagem({ tipo: "ok", texto: "Ficha salva" });
      if (novo && dados.id) router.push(`/claude/clientes/${dados.id}`);
      router.refresh();
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível salvar. Confira a conexão e tente de novo." });
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!inicial.id) return;
    if (!window.confirm(`Excluir o cadastro de ${inicial.nome}? Os relatórios já gerados continuam no histórico.`)) return;
    setSalvando(true);
    try {
      const resp = await fetch(`/api/claude/clientes/${inicial.id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error();
      router.push("/claude/clientes");
      router.refresh();
    } catch {
      setMensagem({ tipo: "erro", texto: "Não foi possível excluir." });
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href="/claude/clientes" className="text-xs text-gray-500 hover:text-[#e85a23]">← Clientes</Link>
          <h1 className="text-xl font-bold text-gray-900 truncate">{novo ? "Novo cliente" : ficha.nome || "Cliente"}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mensagem && (
            <span className={`text-xs ${mensagem.tipo === "ok" ? "text-green-600" : "text-red-600"}`}>{mensagem.texto}</span>
          )}
          {!novo && (
            <Link
              href={`/claude/${inicial.slug}`}
              className="px-3 py-2 text-sm rounded-lg border border-[#e5e5e5] text-gray-700 hover:bg-gray-50"
            >
              Relatórios
            </Link>
          )}
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 bg-[#e85a23] text-white text-sm font-medium rounded-lg hover:bg-[#d14d1e] disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl space-y-5">
          <Secao titulo="Cliente e contrato">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className={ROTULO}>Nome do cliente *</label>
                <input className={CAMPO} value={ficha.nome} onChange={(e) => campo("nome", e.target.value)} placeholder="Vox2You Nove de Julho" />
              </div>
              <div>
                <label className={ROTULO}>Segmento</label>
                <input className={CAMPO} value={ficha.segmento} onChange={(e) => campo("segmento", e.target.value)} placeholder="Escola, e-commerce, serviço local..." />
              </div>
              <div>
                <label className={ROTULO}>Status</label>
                <select className={CAMPO} value={ficha.status} onChange={(e) => campo("status", e.target.value as FichaCliente["status"])}>
                  {Object.entries(STATUS_CLIENTE).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className={ROTULO}>Estado do cliente</label>
                <select className={CAMPO} value={ficha.estado} onChange={(e) => campo("estado", e.target.value as FichaCliente["estado"])}>
                  {Object.entries(ESTADO_CLIENTE).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className={ROTULO}>Cidade</label>
                <input className={CAMPO} value={ficha.cidade} onChange={(e) => campo("cidade", e.target.value)} placeholder="Ribeirão Preto" />
              </div>
              <div>
                <label className={ROTULO}>Ticket mensal (R$)</label>
                <input
                  className={CAMPO}
                  inputMode="decimal"
                  value={ficha.ticketMensal ?? ""}
                  onChange={(e) => campo("ticketMensal", numeroOuNulo(e.target.value))}
                  placeholder="1500"
                />
              </div>
              <div>
                <label className={ROTULO}>Entrou com a gente em</label>
                <input type="date" className={CAMPO} value={ficha.dataEntrada ?? ""} onChange={(e) => campo("dataEntrada", e.target.value || null)} />
              </div>
              <div>
                <label className={ROTULO}>Última visita</label>
                <input type="date" className={CAMPO} value={ficha.ultimaVisita ?? ""} onChange={(e) => campo("ultimaVisita", e.target.value || null)} />
              </div>
            </div>
            {!novo && (
              <p className="text-xs text-gray-500 mt-3">
                Última análise do Claude: {ultimoRelatorio ? new Date(`${ultimoRelatorio}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "nenhuma ainda"}
              </p>
            )}
          </Secao>

          <Secao titulo="Contas conectadas" descricao="Só as contas listadas aqui entram nos relatórios. Conta que não roda mais, tira daqui.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={ROTULO}>Meta Ads (ID da conta de anúncio)</label>
                <div className="space-y-2">
                  {metaIds.map((id, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className={CAMPO}
                        value={id}
                        onChange={(e) => setMetaIds((l) => l.map((v, j) => (j === i ? e.target.value : v)))}
                        placeholder="1528368841469081"
                      />
                      {metaIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMetaIds((l) => l.filter((_, j) => j !== i))}
                          className="px-3 text-sm text-gray-400 hover:text-red-600"
                          aria-label="Remover conta"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setMetaIds((l) => [...l, ""])} className="text-xs font-medium text-[#e85a23] hover:underline">
                    + Adicionar conta do Meta
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={ROTULO}>Google Ads (Customer ID)</label>
                  <input className={CAMPO} value={ficha.googleAdsCustomerId} onChange={(e) => campo("googleAdsCustomerId", e.target.value)} placeholder="384-373-3162" />
                </div>
                <div>
                  <label className={ROTULO}>Google Analytics 4 (ID da propriedade)</label>
                  <input className={CAMPO} value={ficha.ga4PropertyId} onChange={(e) => campo("ga4PropertyId", e.target.value)} placeholder="123456789" />
                </div>
                <div>
                  <label className={ROTULO}>Kommo (subdomínio ou ID do funil)</label>
                  <input className={CAMPO} value={ficha.kommoConta} onChange={(e) => campo("kommoConta", e.target.value)} placeholder="voxnovedejulho" />
                </div>
              </div>
            </div>
          </Secao>

          <Secao titulo="Objetivo das campanhas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={ROTULO}>Resultado principal</label>
                <select className={CAMPO} value={ficha.resultadoPrincipal} onChange={(e) => campo("resultadoPrincipal", e.target.value)}>
                  <option value="">Selecione</option>
                  {RESULTADOS.map((r) => <option key={r.valor} value={r.valor}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className={ROTULO}>Meta de custo por resultado (R$)</label>
                <input
                  className={CAMPO}
                  inputMode="decimal"
                  value={ficha.metaCustoPorResultado ?? ""}
                  onChange={(e) => campo("metaCustoPorResultado", numeroOuNulo(e.target.value))}
                  placeholder="15"
                />
              </div>
              <div>
                <label className={ROTULO}>Orçamento de mídia mensal (R$)</label>
                <input
                  className={CAMPO}
                  inputMode="decimal"
                  value={ficha.orcamentoMidia ?? ""}
                  onChange={(e) => campo("orcamentoMidia", numeroOuNulo(e.target.value))}
                  placeholder="3000"
                />
              </div>
            </div>
          </Secao>

          <Secao titulo="Sobre o cliente" descricao="Tudo aqui vira contexto para o Claude nas análises e sugestões.">
            <div className="space-y-4">
              <div>
                <label className={ROTULO}>Briefing: o que o cliente faz, para quem vende, diferenciais, oferta</label>
                <textarea
                  className={`${CAMPO} min-h-[180px]`}
                  value={ficha.briefing}
                  onChange={(e) => campo("briefing", e.target.value)}
                  placeholder="Cola aqui o briefing feito com o cliente"
                />
              </div>
              <div>
                <label className={ROTULO}>Observações para as análises: sazonalidade, horário de atendimento, o que não pode ser feito</label>
                <textarea
                  className={`${CAMPO} min-h-[100px]`}
                  value={ficha.contexto}
                  onChange={(e) => campo("contexto", e.target.value)}
                  placeholder="Ex.: matrículas fortes em janeiro e julho. Atende WhatsApp até 18h. Não anunciar preço."
                />
              </div>
            </div>
          </Secao>

          <Secao titulo="Redes e site">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {links.map((l, i) => {
                const padrao = i < LINKS_PADRAO.length;
                return (
                  <div key={i} className="flex gap-2 items-center">
                    {padrao ? (
                      <span className="w-36 shrink-0 text-xs font-medium text-gray-600">{l.rotulo}</span>
                    ) : (
                      <input
                        className={`${CAMPO} w-36 shrink-0`}
                        value={l.rotulo}
                        onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)))}
                        placeholder="Nome"
                      />
                    )}
                    <input
                      className={CAMPO}
                      value={l.url}
                      onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                      placeholder="https://"
                    />
                    {!padrao && (
                      <button
                        type="button"
                        onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                        className="px-2 text-sm text-gray-400 hover:text-red-600"
                        aria-label="Remover link"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setLinks((ls) => [...ls, { rotulo: "", url: "" }])} className="mt-3 text-xs font-medium text-[#e85a23] hover:underline">
              + Adicionar outro link
            </button>
          </Secao>

          <Secao titulo="Pastas do Google Drive" descricao="Criativos, briefing, contratos, materiais do cliente.">
            <div className="space-y-2">
              {pastas.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={`${CAMPO} md:w-56 shrink-0`}
                    value={p.titulo}
                    onChange={(e) => setPastas((ps) => ps.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                    placeholder="Criativos"
                  />
                  <input
                    className={CAMPO}
                    value={p.url}
                    onChange={(e) => setPastas((ps) => ps.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    placeholder="https://drive.google.com/drive/folders/..."
                  />
                  {p.url && /^https?:\/\//.test(p.url) && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-xs text-[#e85a23] hover:underline shrink-0">
                      Abrir
                    </a>
                  )}
                  {pastas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPastas((ps) => ps.filter((_, j) => j !== i))}
                      className="px-2 text-sm text-gray-400 hover:text-red-600"
                      aria-label="Remover pasta"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setPastas((ps) => [...ps, { titulo: "", url: "" }])} className="mt-3 text-xs font-medium text-[#e85a23] hover:underline">
              + Adicionar pasta
            </button>
          </Secao>

          <Secao titulo="Mapa de serviços" descricao="Quem faz cada serviço hoje para esse cliente. Vermelho é oportunidade.">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SERVICOS_MAPA.map((servico) => {
                const valor: ValorMapa = ficha.mapaServicos[servico] ?? "nao_identificado";
                const opcao = OPCOES_MAPA.find((o) => o.valor === valor) ?? OPCOES_MAPA[0];
                return (
                  <div key={servico}>
                    <label className={ROTULO}>{servico}</label>
                    <select
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e85a23] ${opcao.classe}`}
                      value={valor}
                      onChange={(e) => campo("mapaServicos", { ...ficha.mapaServicos, [servico]: e.target.value as ValorMapa })}
                    >
                      {OPCOES_MAPA.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </Secao>

          {!novo && (
            <div className="flex justify-end pb-6">
              <button onClick={excluir} disabled={salvando} className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50">
                Excluir cadastro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

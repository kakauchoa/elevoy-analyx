import { Fragment, type ReactNode } from "react";

// Renderizador mínimo de Markdown para os relatórios do Claude (títulos, listas, negrito e código).
// Monta elementos React direto, sem dangerouslySetInnerHTML.

function inline(texto: string, chave: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={`${chave}-${i}`} className="font-semibold text-gray-900">{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith("`") && parte.endsWith("`")) {
      return <code key={`${chave}-${i}`} className="px-1 py-0.5 bg-gray-100 rounded text-[0.85em]">{parte.slice(1, -1)}</code>;
    }
    return <Fragment key={`${chave}-${i}`}>{parte}</Fragment>;
  });
}

type Bloco =
  | { tipo: "titulo"; nivel: 1 | 2 | 3; texto: string }
  | { tipo: "lista"; ordenada: boolean; itens: string[] }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "separador" };

function parse(conteudo: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];
  let lista: { ordenada: boolean; itens: string[] } | null = null;

  const fecharParagrafo = () => {
    if (paragrafo.length) blocos.push({ tipo: "paragrafo", texto: paragrafo.join(" ") });
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista) blocos.push({ tipo: "lista", ...lista });
    lista = null;
  };

  for (const bruta of conteudo.replace(/\r\n/g, "\n").split("\n")) {
    const linha = bruta.trim();
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linha);
    const itemSimples = /^[-*]\s+(.*)$/.exec(linha);
    const itemNumerado = /^\d+[.)]\s+(.*)$/.exec(linha);

    if (!linha) {
      fecharParagrafo();
      fecharLista();
    } else if (/^(-{3,}|\*{3,})$/.test(linha)) {
      fecharParagrafo();
      fecharLista();
      blocos.push({ tipo: "separador" });
    } else if (titulo) {
      fecharParagrafo();
      fecharLista();
      blocos.push({ tipo: "titulo", nivel: titulo[1].length as 1 | 2 | 3, texto: titulo[2] });
    } else if (itemSimples || itemNumerado) {
      fecharParagrafo();
      const ordenada = !!itemNumerado;
      if (lista && lista.ordenada !== ordenada) fecharLista();
      if (!lista) lista = { ordenada, itens: [] };
      lista.itens.push((itemSimples ?? itemNumerado)![1]);
    } else {
      fecharLista();
      paragrafo.push(linha);
    }
  }
  fecharParagrafo();
  fecharLista();
  return blocos;
}

export function MarkdownSimples({ conteudo }: { conteudo: string }) {
  const blocos = parse(conteudo);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700">
      {blocos.map((b, i) => {
        const k = `b${i}`;
        if (b.tipo === "titulo") {
          const classe =
            b.nivel === 1
              ? "text-lg font-bold text-gray-900 pt-2"
              : b.nivel === 2
                ? "text-base font-semibold text-gray-900 pt-2"
                : "text-sm font-semibold text-gray-900 pt-1";
          return <p key={k} className={classe}>{inline(b.texto, k)}</p>;
        }
        if (b.tipo === "lista") {
          const Tag = b.ordenada ? "ol" : "ul";
          return (
            <Tag key={k} className={`${b.ordenada ? "list-decimal" : "list-disc"} pl-5 space-y-1`}>
              {b.itens.map((item, j) => <li key={`${k}-${j}`}>{inline(item, `${k}-${j}`)}</li>)}
            </Tag>
          );
        }
        if (b.tipo === "separador") return <hr key={k} className="border-[#e5e5e5]" />;
        return <p key={k}>{inline(b.texto, k)}</p>;
      })}
    </div>
  );
}

"use client";

import { useState } from "react";

interface ItemMidia {
  tipo: "video" | "foto";
  url: string;
  miniatura: string | null;
}

interface Resultado {
  titulo: string;
  itens: ItemMidia[];
}

export default function BaixarInstagramPage() {
  const [link, setLink] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await fetch("/api/ferramentas/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      const dados = (await res.json()) as Resultado & { erro?: string };
      if (!res.ok) {
        setErro(dados.erro ?? "Não foi possível buscar o link.");
      } else {
        setResultado(dados);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  // Miniaturas também passam pelo servidor, pois o CDN do Instagram bloqueia hotlink
  const urlArquivo = (url: string, nome: string) =>
    `/api/ferramentas/instagram/baixar?u=${encodeURIComponent(url)}&nome=${encodeURIComponent(nome)}`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-[#e5e5e5]">
        <h1 className="text-xl font-bold text-gray-900">Baixar do Instagram</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cole o link de um reel, vídeo ou foto público para baixar o arquivo.
        </p>
      </div>

      <div className="px-8 py-6 max-w-3xl w-full">
        <form onSubmit={buscar} className="flex gap-3">
          <input
            type="url"
            required
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.instagram.com/reel/..."
            className="flex-1 border border-[#e5e5e5] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            disabled={carregando}
            className="bg-gray-900 text-white text-sm font-medium rounded-lg px-5 py-2.5 disabled:opacity-50"
          >
            {carregando ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {erro && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{erro}</p>
        )}

        {resultado && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-gray-900">{resultado.titulo}</p>
            {resultado.itens.map((item, i) => (
              <div key={item.url} className="flex items-center gap-4 bg-white border border-[#e5e5e5] rounded-xl p-4">
                {item.miniatura && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlArquivo(item.miniatura, "miniatura")}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                  />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.tipo === "video" ? "Vídeo (MP4)" : "Foto"} {resultado.itens.length > 1 ? i + 1 : ""}
                  </p>
                </div>
                <a
                  href={urlArquivo(item.url, `instagram-${i + 1}`)}
                  className="bg-gray-900 text-white text-sm font-medium rounded-lg px-4 py-2"
                >
                  Baixar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

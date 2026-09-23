"use client";

import type { CrmOportunidade } from "./types";
import { estaAtrasado, formatarData, telefoneSemFormatacao } from "./utils";

interface CardOportunidadeProps {
  oportunidade: CrmOportunidade;
  onDragStart: (id: string) => void;
  onClick: (oportunidade: CrmOportunidade) => void;
}

export function CardOportunidade({ oportunidade, onDragStart, onClick }: CardOportunidadeProps) {
  const atrasado = estaAtrasado(oportunidade.dataContato);
  const telefone = oportunidade.contato.telefone;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(oportunidade.id)}
      onClick={() => onClick(oportunidade)}
      className={`bg-white border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none ${
        atrasado ? "border-red-300 bg-red-50/30" : "border-[#e5e5e5] hover:border-gray-300"
      }`}
    >
      {atrasado && (
        <div className="flex items-center gap-1 mb-2">
          <svg className="w-3 h-3 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Atrasado</span>
        </div>
      )}

      <p className="text-sm font-medium text-gray-900 truncate">{oportunidade.titulo}</p>
      {oportunidade.negocio && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{oportunidade.negocio.nome}</p>
      )}
      {oportunidade.origem && (
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{oportunidade.origem.nome}</p>
      )}

      {oportunidade.dataContato && (
        <div className={`mt-2 flex items-center gap-1 ${atrasado ? "text-red-600" : "text-gray-500"}`}>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[11px]">Contato: {formatarData(oportunidade.dataContato)}</span>
        </div>
      )}
      {oportunidade.dataReuniao && (
        <div className="mt-1 flex items-center gap-1 text-blue-600">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <span className="text-[11px]">Reunião: {formatarData(oportunidade.dataReuniao)}</span>
        </div>
      )}
      {oportunidade.dataMensagem && (
        <div className="mt-1 flex items-center gap-1 text-gray-400">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[11px]">Msg: {formatarData(oportunidade.dataMensagem)}</span>
        </div>
      )}

      {oportunidade.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {oportunidade.tags.map((ct) => (
            <span
              key={ct.id}
              className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: ct.tag.cor }}
            >
              {ct.tag.nome}
            </span>
          ))}
        </div>
      )}

      {telefone && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-400 truncate">{telefone}</p>
          <a
            href={`https://wa.me/55${telefoneSemFormatacao(telefone)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Abrir no WhatsApp"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

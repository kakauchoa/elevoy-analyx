export interface CrmTag {
  id: string;
  nome: string;
  cor: string;
}

export interface CrmOportunidadeTag {
  id: string;
  tagId: string;
  tag: CrmTag;
}

export interface CrmOrigem {
  id: string;
  nome: string;
  aprovado: boolean;
}

export interface CrmContatoResumo {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
}

export interface CrmNegocioResumo {
  id: string;
  nome: string;
  observacoes: string | null;
}

export interface CrmCampoPersonalizadoDefinicao {
  id: string;
  nome: string;
  tipo: "texto" | "numero" | "data" | "select";
  opcoes: string[] | null;
  ordem: number;
}

export interface CrmCampoPersonalizadoValor {
  id: string;
  definicaoId: string;
  oportunidadeId: string;
  valor: string;
  definicao: CrmCampoPersonalizadoDefinicao;
}

export interface CrmOportunidade {
  id: string;
  etapaId: string;
  leadId: string | null;
  contatoId: string;
  negocioId: string | null;
  titulo: string;
  valor: string | null;
  origemId: string | null;
  meioCampanha: string | null;
  campanha: string | null;
  conteudo: string | null;
  termo: string | null;
  notas: string | null;
  dataContato: string | null;
  dataMensagem: string | null;
  dataReuniao: string | null;
  googleCalendarEventId: string | null;
  criadoEm: string;
  atualizadoEm: string;
  contato: CrmContatoResumo;
  negocio: CrmNegocioResumo | null;
  origem: CrmOrigem | null;
  tags: CrmOportunidadeTag[];
  campos: CrmCampoPersonalizadoValor[];
}

export interface CrmEtapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  fixo: boolean;
  oportunidades: CrmOportunidade[];
}

export const includeOportunidadeCompleto = {
  contato: true,
  negocio: true,
  origem: true,
  lead: true,
  tags: { include: { tag: true } },
  campos: { include: { definicao: true } },
} as const;

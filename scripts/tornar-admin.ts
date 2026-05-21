/**
 * Torna um usuário administrador da plataforma.
 * Uso: npx ts-node -e "require('./scripts/tornar-admin').main('email@exemplo.com')"
 * Ou direto: npx ts-node scripts/tornar-admin.ts email@exemplo.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function main(email?: string) {
  const alvo = email ?? process.argv[2];
  if (!alvo) {
    console.error("Uso: npx ts-node scripts/tornar-admin.ts <email>");
    process.exit(1);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email: alvo } });
  if (!usuario) {
    console.error(`Usuário com email "${alvo}" não encontrado.`);
    process.exit(1);
  }

  await prisma.usuario.update({
    where: { email: alvo },
    data: { perfil: "admin" },
  });

  console.log(`✓ Usuário "${usuario.nome}" (${alvo}) agora é administrador.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

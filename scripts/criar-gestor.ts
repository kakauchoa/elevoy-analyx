/**
 * Cria ou atualiza a senha de um gestor no banco.
 * Uso: npx tsx scripts/criar-gestor.ts <email> <nome> <senha>
 * Exemplo: npx tsx scripts/criar-gestor.ts admin@exemplo.com "João Silva" minhasenha123
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, nome, senha] = process.argv.slice(2);

  if (!email || !nome || !senha) {
    console.error("Uso: npx tsx scripts/criar-gestor.ts <email> <nome> <senha>");
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { senhaHash, nome, ativo: true },
    create: {
      email,
      nome,
      senhaHash,
      tipo: "gestor",
      ativo: true,
    },
  });

  console.log(`✓ Gestor criado/atualizado: ${usuario.email} (id: ${usuario.id})`);
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prisma } = await import("./lib/prisma");

    // Aplica colunas/tabelas que podem estar faltando no banco (idempotente)
    try {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `contas_anuncio` ADD COLUMN IF NOT EXISTS `rastreamento_apenas` BOOLEAN NOT NULL DEFAULT false"
      );
    } catch {}

    // rastreamento_ativo nunca foi adicionado via migration — aplicar aqui
    try {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `contas_anuncio` ADD COLUMN IF NOT EXISTS `rastreamento_ativo` BOOLEAN NOT NULL DEFAULT true"
      );
    } catch {}

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`configuracoes_dashboard\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`conta_anuncio_id\` VARCHAR(191) NOT NULL,
          \`layout\` JSON NOT NULL,
          \`atualizado_em\` DATETIME(3) NOT NULL,
          UNIQUE INDEX \`configuracoes_dashboard_conta_anuncio_id_key\`(\`conta_anuncio_id\`),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch {}

    // Tabela de configuração global (API key Google Places, Evolution, etc.)
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`configuracoes_plataforma\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`google_places_api_key\` VARCHAR(500) NULL,
          \`evolution_api_url\` VARCHAR(500) NULL,
          \`evolution_api_key\` VARCHAR(500) NULL,
          \`evolution_instance\` VARCHAR(255) NULL,
          \`evolution_whatsapp\` VARCHAR(50) NULL,
          \`evolution_version\` VARCHAR(30) NULL,
          \`atualizado_em\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch {}

    // Tabela de prospecções do Google Meu Negócio
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`prospeccoes_gmn\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`usuario_id\` VARCHAR(191) NOT NULL,
          \`place_id\` VARCHAR(255) NOT NULL,
          \`cidade\` VARCHAR(255) NOT NULL,
          \`nicho\` VARCHAR(255) NOT NULL,
          \`nome\` VARCHAR(500) NOT NULL,
          \`telefone\` VARCHAR(50) NULL,
          \`site\` VARCHAR(500) NULL,
          \`endereco\` TEXT NULL,
          \`avaliacao\` DECIMAL(3,1) NULL,
          \`qtd_avaliacoes\` INT NULL,
          \`extraido_em\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`enviado_crm\` BOOLEAN NOT NULL DEFAULT false,
          \`crm_contato_id\` VARCHAR(191) NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`prospeccoes_gmn_usuario_id_place_id_key\`(\`usuario_id\`, \`place_id\`),
          CONSTRAINT \`prospeccoes_gmn_usuario_id_fkey\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch {}

    // Histórico de pesquisas GMN
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`historico_pesquisa_gmn\` (
          \`id\` VARCHAR(191) NOT NULL,
          \`usuario_id\` VARCHAR(191) NOT NULL,
          \`cidade\` VARCHAR(255) NOT NULL,
          \`nicho\` VARCHAR(255) NOT NULL,
          \`pesquisado_em\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`historico_pesquisa_gmn_usuario_id_fkey\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
    } catch {}

    const { baileysManager } = await import("./lib/baileys-manager");
    await baileysManager.reconectarInstanciasAtivas();

    // Cron sem biblioteca externa: agenda sincronização às 4h e verificação de saldo às 8h
    agendarCronDiario(4, 0, async () => {
      const { sincronizarTodasContas } = await import("./services/sincronizacao.service");
      await sincronizarTodasContas();
    });

    agendarCronDiario(8, 0, async () => {
      const { verificarSaldoContas } = await import("./lib/verificar-saldo");
      await verificarSaldoContas();
    });
  }
}

// Agenda uma função para rodar todo dia no horário especificado (hora local do servidor)
function agendarCronDiario(hora: number, minuto: number, fn: () => Promise<void>): void {
  function msAteProxima(): number {
    const agora = new Date();
    const proxima = new Date();
    proxima.setHours(hora, minuto, 0, 0);
    if (proxima <= agora) proxima.setDate(proxima.getDate() + 1);
    return proxima.getTime() - agora.getTime();
  }

  function agendar() {
    const delay = msAteProxima();
    const horaStr = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`;
    console.log(`[cron] Próxima execução às ${horaStr} em ${Math.round(delay / 60000)}min`);
    setTimeout(async () => {
      try {
        await fn();
      } catch (e) {
        console.error(`[cron ${hora}h] Erro:`, e);
      }
      agendar();
    }, delay);
  }

  agendar();
}

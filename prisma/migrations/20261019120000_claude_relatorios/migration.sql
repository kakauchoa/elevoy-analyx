-- Aba Claude: relatórios diários/semanais gerados pelas rotinas agendadas do Claude
-- e as otimizações sugeridas em cada um. Tabelas novas, nenhuma tabela existente é alterada.

-- CreateTable: claude_relatorios
CREATE TABLE `claude_relatorios` (
  `id` VARCHAR(191) NOT NULL,
  `cliente_slug` VARCHAR(100) NOT NULL,
  `cliente_nome` VARCHAR(255) NOT NULL,
  `tipo` ENUM('diario', 'semanal') NOT NULL,
  `data_referencia` DATE NOT NULL,
  `tendencia` ENUM('melhorando', 'estavel', 'caindo', 'sem_dados') NOT NULL DEFAULT 'sem_dados',
  `resumo` TEXT NOT NULL,
  `conteudo` LONGTEXT NOT NULL,
  `metricas` JSON NULL,
  `pedidos_cliente` JSON NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  UNIQUE INDEX `claude_relatorios_cliente_slug_tipo_data_referencia_key` (`cliente_slug`, `tipo`, `data_referencia`),
  INDEX `claude_relatorios_data_referencia_idx` (`data_referencia`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: claude_otimizacoes
CREATE TABLE `claude_otimizacoes` (
  `id` VARCHAR(191) NOT NULL,
  `relatorio_id` VARCHAR(191) NOT NULL,
  `cliente_slug` VARCHAR(100) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descricao` TEXT NOT NULL,
  `plataforma` VARCHAR(30) NOT NULL DEFAULT 'meta',
  `prioridade` ENUM('alta', 'media', 'baixa') NOT NULL DEFAULT 'media',
  `status` ENUM('pendente', 'feita', 'descartada') NOT NULL DEFAULT 'pendente',
  `feita_em` DATETIME(3) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `claude_otimizacoes_cliente_slug_status_idx` (`cliente_slug`, `status`),
  INDEX `claude_otimizacoes_relatorio_id_idx` (`relatorio_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `claude_otimizacoes_relatorio_id_fkey` FOREIGN KEY (`relatorio_id`) REFERENCES `claude_relatorios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

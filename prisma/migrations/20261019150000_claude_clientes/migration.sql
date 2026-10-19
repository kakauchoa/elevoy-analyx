-- Aba Claude: cadastro de clientes usado pelas rotinas de relatório (contas, contrato, briefing,
-- links, pastas do Drive e mapa de serviços). Tabela nova, nada existente é alterado.

-- CreateTable: claude_clientes
CREATE TABLE `claude_clientes` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `segmento` VARCHAR(120) NULL,
  `cidade` VARCHAR(120) NULL,
  `status` ENUM('ativo', 'pausado', 'encerrado') NOT NULL DEFAULT 'ativo',
  `estado` ENUM('saudavel', 'atencao', 'risco') NOT NULL DEFAULT 'saudavel',
  `ticket_mensal` DECIMAL(10, 2) NULL,
  `data_entrada` DATE NULL,
  `ultima_visita` DATE NULL,
  `meta_ad_account_ids` JSON NULL,
  `google_ads_customer_id` VARCHAR(20) NULL,
  `ga4_property_id` VARCHAR(30) NULL,
  `kommo_conta` VARCHAR(120) NULL,
  `resultado_principal` VARCHAR(60) NULL,
  `meta_custo_por_resultado` DECIMAL(10, 2) NULL,
  `orcamento_midia` DECIMAL(10, 2) NULL,
  `briefing` LONGTEXT NULL,
  `contexto` TEXT NULL,
  `links` JSON NULL,
  `pastas_drive` JSON NULL,
  `mapa_servicos` JSON NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  UNIQUE INDEX `claude_clientes_slug_key` (`slug`),
  INDEX `claude_clientes_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

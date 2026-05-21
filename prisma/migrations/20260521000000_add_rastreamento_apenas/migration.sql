-- Coluna para identificar contas WPP-only (sem integração com Meta Ads)
ALTER TABLE `contas_anuncio`
  ADD COLUMN IF NOT EXISTS `rastreamento_apenas` BOOLEAN NOT NULL DEFAULT false;

-- Tabela de configuração de layout do dashboard por conta
CREATE TABLE IF NOT EXISTS `configuracoes_dashboard` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `layout` JSON NOT NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracoes_dashboard_conta_anuncio_id_key`(`conta_anuncio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


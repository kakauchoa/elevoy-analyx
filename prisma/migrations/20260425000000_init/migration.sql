Loaded Prisma config from prisma.config.ts.

-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha_hash` TEXT NOT NULL,
    `tipo` ENUM('gestor', 'cliente') NOT NULL DEFAULT 'gestor',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contas_anuncio` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `nome_cliente` VARCHAR(191) NOT NULL,
    `slug_compartilhavel` VARCHAR(191) NOT NULL,
    `account_id_meta` VARCHAR(191) NOT NULL,
    `token_acesso` TEXT NOT NULL,
    `tipo_funil` ENUM('whatsapp', 'landing_page_lead', 'landing_page_contato', 'ecommerce', 'conteudo', 'ecommerce_conteudo', 'outro') NOT NULL,
    `metrica_principal` VARCHAR(191) NOT NULL,
    `label_metrica_principal` VARCHAR(191) NOT NULL,
    `label_custo_por_resultado` VARCHAR(191) NOT NULL,
    `compartilhamento_ativo` BOOLEAN NOT NULL DEFAULT false,
    `ultima_sincronizacao` DATETIME(3) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contas_anuncio_slug_compartilhavel_key`(`slug_compartilhavel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campanhas` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `campanha_id_meta` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(500) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED') NOT NULL,
    `objetivo` VARCHAR(191) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campanhas_campanha_id_meta_key`(`campanha_id_meta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conjuntos_anuncio` (
    `id` VARCHAR(191) NOT NULL,
    `campanha_id` VARCHAR(191) NOT NULL,
    `adset_id_meta` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(500) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED') NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conjuntos_anuncio_adset_id_meta_key`(`adset_id_meta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anuncios` (
    `id` VARCHAR(191) NOT NULL,
    `conjunto_anuncio_id` VARCHAR(191) NOT NULL,
    `anuncio_id_meta` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(500) NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED') NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `anuncios_anuncio_id_meta_key`(`anuncio_id_meta`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `insights_diarios` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `nivel` ENUM('conta', 'campanha', 'conjunto', 'anuncio') NOT NULL,
    `referencia_id` VARCHAR(191) NULL,
    `referencia_meta_id` VARCHAR(191) NOT NULL,
    `data` DATE NOT NULL,
    `spend` DECIMAL(15, 4) NULL,
    `impressions` BIGINT NULL,
    `reach` BIGINT NULL,
    `clicks` BIGINT NULL,
    `inline_link_clicks` BIGINT NULL,
    `cpm` DECIMAL(10, 4) NULL,
    `ctr` DECIMAL(10, 6) NULL,
    `cpc` DECIMAL(10, 4) NULL,
    `cpp` DECIMAL(10, 4) NULL,
    `frequency` DECIMAL(10, 4) NULL,
    `unique_clicks` BIGINT NULL,
    `unique_ctr` DECIMAL(10, 6) NULL,
    `landing_page_views` BIGINT NULL,
    `landing_page_view_rate` DECIMAL(10, 6) NULL,
    `outbound_clicks` BIGINT NULL,
    `outbound_ctr` DECIMAL(10, 6) NULL,
    `resultado_principal` BIGINT NULL,
    `tipo_resultado_principal` VARCHAR(191) NULL,
    `custo_por_resultado` DECIMAL(10, 4) NULL,
    `whatsapp_clicks` BIGINT NULL,
    `whatsapp_cost` DECIMAL(10, 4) NULL,
    `lead_count` BIGINT NULL,
    `cost_per_lead` DECIMAL(10, 4) NULL,
    `purchase_count` BIGINT NULL,
    `purchase_value` DECIMAL(15, 4) NULL,
    `purchase_roas` DECIMAL(10, 4) NULL,
    `cost_per_purchase` DECIMAL(10, 4) NULL,
    `add_to_cart` BIGINT NULL,
    `initiate_checkout` BIGINT NULL,
    `contact_count` BIGINT NULL,
    `cost_per_contact` DECIMAL(10, 4) NULL,
    `post_engagement` BIGINT NULL,
    `post_reactions` BIGINT NULL,
    `post_comments` BIGINT NULL,
    `post_shares` BIGINT NULL,
    `page_likes` BIGINT NULL,
    `video_view_3s` BIGINT NULL,
    `video_view_10s` BIGINT NULL,
    `video_view_25pct` BIGINT NULL,
    `video_view_50pct` BIGINT NULL,
    `video_view_75pct` BIGINT NULL,
    `video_view_95pct` BIGINT NULL,
    `video_view_100pct` BIGINT NULL,
    `video_avg_time_watched` DECIMAL(10, 4) NULL,
    `video_play_actions` BIGINT NULL,
    `video_thruplay` BIGINT NULL,
    `cost_per_thruplay` DECIMAL(10, 4) NULL,
    `sincronizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `insights_diarios_conta_anuncio_id_nivel_referencia_meta_id_d_key`(`conta_anuncio_id`, `nivel`, `referencia_meta_id`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `acessos_dashboard` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `ip_visitante` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `referrer` TEXT NULL,
    `pais` VARCHAR(100) NULL,
    `dispositivo` ENUM('desktop', 'mobile', 'tablet', 'desconhecido') NOT NULL DEFAULT 'desconhecido',
    `duracao_segundos` INTEGER NULL,
    `acessado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relatorios_gerados` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `gerado_por_id` VARCHAR(191) NOT NULL,
    `conteudo` LONGTEXT NOT NULL,
    `periodo_inicio` DATE NOT NULL,
    `periodo_fim` DATE NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracoes_gtm` (
    `id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `gtm_container_id` VARCHAR(50) NULL,
    `meta_pixel_id` VARCHAR(50) NULL,
    `eventos_customizados` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT false,
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracoes_gtm_conta_anuncio_id_key`(`conta_anuncio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contas_anuncio` ADD CONSTRAINT `contas_anuncio_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campanhas` ADD CONSTRAINT `campanhas_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conjuntos_anuncio` ADD CONSTRAINT `conjuntos_anuncio_campanha_id_fkey` FOREIGN KEY (`campanha_id`) REFERENCES `campanhas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anuncios` ADD CONSTRAINT `anuncios_conjunto_anuncio_id_fkey` FOREIGN KEY (`conjunto_anuncio_id`) REFERENCES `conjuntos_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insights_diarios` ADD CONSTRAINT `insights_diarios_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `acessos_dashboard` ADD CONSTRAINT `acessos_dashboard_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relatorios_gerados` ADD CONSTRAINT `relatorios_gerados_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relatorios_gerados` ADD CONSTRAINT `relatorios_gerados_gerado_por_id_fkey` FOREIGN KEY (`gerado_por_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `configuracoes_gtm` ADD CONSTRAINT `configuracoes_gtm_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Adiciona campo fixo nas etapas do CRM
ALTER TABLE `crm_etapas` ADD COLUMN `fixo` BOOLEAN NOT NULL DEFAULT false;

-- Adiciona data_mensagem nos contatos do CRM
ALTER TABLE `crm_contatos` ADD COLUMN `data_mensagem` DATETIME(3) NULL;

-- Tabela de prospecções do Google Meu Negócio
CREATE TABLE `prospeccoes_gmn` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(255) NOT NULL,
    `cidade` VARCHAR(255) NOT NULL,
    `nicho` VARCHAR(255) NOT NULL,
    `nome` VARCHAR(500) NOT NULL,
    `telefone` VARCHAR(50) NULL,
    `site` VARCHAR(500) NULL,
    `endereco` TEXT NULL,
    `avaliacao` DECIMAL(3,1) NULL,
    `qtd_avaliacoes` INT NULL,
    `extraido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `enviado_crm` BOOLEAN NOT NULL DEFAULT false,
    `crm_contato_id` VARCHAR(191) NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `prospeccoes_gmn_usuario_id_place_id_key` (`usuario_id`, `place_id`),
    INDEX `prospeccoes_gmn_usuario_id_idx` (`usuario_id`),
    CONSTRAINT `prospeccoes_gmn_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Histórico de pesquisas (cidades e nichos buscados)
CREATE TABLE `historico_pesquisa_gmn` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(255) NOT NULL,
    `nicho` VARCHAR(255) NOT NULL,
    `pesquisado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `historico_pesquisa_gmn_usuario_id_idx` (`usuario_id`),
    CONSTRAINT `historico_pesquisa_gmn_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Configurações globais da plataforma (API key do Google Places, etc)
CREATE TABLE `configuracoes_plataforma` (
    `id` VARCHAR(191) NOT NULL,
    `google_places_api_key` VARCHAR(500) NULL,
    `atualizado_em` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

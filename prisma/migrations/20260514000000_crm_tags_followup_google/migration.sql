-- AlterTable: adicionar campos de follow-up e Google Calendar no CrmContato
ALTER TABLE `crm_contatos`
  ADD COLUMN `data_follow_up` DATETIME(3) NULL,
  ADD COLUMN `google_calendar_event_id` VARCHAR(255) NULL;

-- CreateTable: crm_tags
CREATE TABLE `crm_tags` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(50) NOT NULL,
  `cor` VARCHAR(20) NOT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `crm_tags_usuario_id_idx` (`usuario_id`),
  CONSTRAINT `crm_tags_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_contato_tags
CREATE TABLE `crm_contato_tags` (
  `id` VARCHAR(191) NOT NULL,
  `contato_id` VARCHAR(191) NOT NULL,
  `tag_id` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `crm_contato_tags_contato_id_tag_id_key` (`contato_id`, `tag_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `crm_contato_tags_contato_id_fkey` FOREIGN KEY (`contato_id`) REFERENCES `crm_contatos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_contato_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `crm_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: integracoes_google
CREATE TABLE `integracoes_google` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `access_token` TEXT NOT NULL,
  `refresh_token` TEXT NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  UNIQUE INDEX `integracoes_google_usuario_id_key` (`usuario_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `integracoes_google_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

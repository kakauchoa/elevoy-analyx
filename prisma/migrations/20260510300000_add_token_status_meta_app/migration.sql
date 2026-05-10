-- AlterTable: campos de expiração e status do token em contas_anuncio
ALTER TABLE `contas_anuncio`
  ADD COLUMN `token_expira_em` DATETIME(3) NULL,
  ADD COLUMN `token_status` ENUM('ok','expirando','expirado','erro') NOT NULL DEFAULT 'ok';

-- CreateTable: configuração do App Meta por administrador
CREATE TABLE `configuracoes_meta_app` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `app_id` VARCHAR(100) NOT NULL,
    `app_secret` TEXT NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `configuracoes_meta_app_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `configuracoes_meta_app` ADD CONSTRAINT `configuracoes_meta_app_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: campo perfil em usuarios
ALTER TABLE `usuarios`
  ADD COLUMN `perfil` ENUM('admin','gestor','comercial') NOT NULL DEFAULT 'gestor';

-- CreateTable: permissoes de secao por usuario
CREATE TABLE `usuario_permissoes` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `secao` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `usuario_permissoes_usuario_id_secao_key`(`usuario_id`, `secao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `usuario_permissoes` ADD CONSTRAINT `usuario_permissoes_usuario_id_fkey`
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: etapas do kanban CRM
CREATE TABLE `crm_etapas` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `cor` VARCHAR(20) NOT NULL,
    `ordem` INT NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_etapas` ADD CONSTRAINT `crm_etapas_usuario_id_fkey`
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: contatos do CRM
CREATE TABLE `crm_contatos` (
    `id` VARCHAR(191) NOT NULL,
    `etapa_id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `telefone` VARCHAR(30) NULL,
    `empresa` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `notas` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_contatos` ADD CONSTRAINT `crm_contatos_etapa_id_fkey`
  FOREIGN KEY (`etapa_id`) REFERENCES `crm_etapas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `crm_contatos` ADD CONSTRAINT `crm_contatos_usuario_id_fkey`
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: campos customizados por contato
CREATE TABLE `crm_campos_customizados` (
    `id` VARCHAR(191) NOT NULL,
    `contato_id` VARCHAR(191) NOT NULL,
    `chave` VARCHAR(100) NOT NULL,
    `valor` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `crm_campos_customizados` ADD CONSTRAINT `crm_campos_customizados_contato_id_fkey`
  FOREIGN KEY (`contato_id`) REFERENCES `crm_contatos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

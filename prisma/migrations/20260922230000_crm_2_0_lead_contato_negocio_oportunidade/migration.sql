-- CRM Comercial 2.0: separa Lead / Contato / Negócio / Oportunidade.
-- O CrmContato antigo (crm_contatos) NÃO é alterado nem migrado — vira model
-- "legado" só no Prisma Client, a tabela e os dados continuam intactos.

-- CreateTable: crm_origens
CREATE TABLE `crm_origens` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `aprovado` BOOLEAN NOT NULL DEFAULT true,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `crm_origens_usuario_id_nome_key` (`usuario_id`, `nome`),
  PRIMARY KEY (`id`),
  INDEX `crm_origens_usuario_id_idx` (`usuario_id`),
  CONSTRAINT `crm_origens_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_leads
CREATE TABLE `crm_leads` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(255) NULL,
  `telefone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `mensagem` TEXT NULL,
  `origem_id` VARCHAR(191) NULL,
  `meio_campanha` VARCHAR(255) NULL,
  `campanha` VARCHAR(500) NULL,
  `conteudo` VARCHAR(500) NULL,
  `termo` VARCHAR(500) NULL,
  `canal` VARCHAR(50) NULL,
  `convertido_em` DATETIME(3) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `crm_leads_usuario_id_idx` (`usuario_id`),
  INDEX `crm_leads_origem_id_idx` (`origem_id`),
  CONSTRAINT `crm_leads_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_leads_origem_id_fkey` FOREIGN KEY (`origem_id`) REFERENCES `crm_origens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_pessoas (novo CrmContato — a pessoa, não mais o card do Kanban)
CREATE TABLE `crm_pessoas` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `crm_pessoas_usuario_id_idx` (`usuario_id`),
  CONSTRAINT `crm_pessoas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_negocios
CREATE TABLE `crm_negocios` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `observacoes` TEXT NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `crm_negocios_usuario_id_idx` (`usuario_id`),
  CONSTRAINT `crm_negocios_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_oportunidades (o card que roda no Kanban)
CREATE TABLE `crm_oportunidades` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `etapa_id` VARCHAR(191) NOT NULL,
  `lead_id` VARCHAR(191) NULL,
  `contato_id` VARCHAR(191) NOT NULL,
  `negocio_id` VARCHAR(191) NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `valor` DECIMAL(10, 2) NULL,
  `origem_id` VARCHAR(191) NULL,
  `meio_campanha` VARCHAR(255) NULL,
  `campanha` VARCHAR(500) NULL,
  `conteudo` VARCHAR(500) NULL,
  `termo` VARCHAR(500) NULL,
  `notas` TEXT NULL,
  `data_follow_up` DATETIME(3) NULL,
  `data_mensagem` DATETIME(3) NULL,
  `data_reuniao` DATETIME(3) NULL,
  `google_calendar_event_id` VARCHAR(255) NULL,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  UNIQUE INDEX `crm_oportunidades_lead_id_key` (`lead_id`),
  PRIMARY KEY (`id`),
  INDEX `crm_oportunidades_usuario_id_idx` (`usuario_id`),
  INDEX `crm_oportunidades_etapa_id_idx` (`etapa_id`),
  INDEX `crm_oportunidades_contato_id_idx` (`contato_id`),
  INDEX `crm_oportunidades_negocio_id_idx` (`negocio_id`),
  INDEX `crm_oportunidades_origem_id_idx` (`origem_id`),
  CONSTRAINT `crm_oportunidades_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidades_etapa_id_fkey` FOREIGN KEY (`etapa_id`) REFERENCES `crm_etapas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidades_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `crm_leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidades_contato_id_fkey` FOREIGN KEY (`contato_id`) REFERENCES `crm_pessoas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidades_negocio_id_fkey` FOREIGN KEY (`negocio_id`) REFERENCES `crm_negocios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidades_origem_id_fkey` FOREIGN KEY (`origem_id`) REFERENCES `crm_origens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_oportunidade_tags
CREATE TABLE `crm_oportunidade_tags` (
  `id` VARCHAR(191) NOT NULL,
  `oportunidade_id` VARCHAR(191) NOT NULL,
  `tag_id` VARCHAR(191) NOT NULL,

  UNIQUE INDEX `crm_oportunidade_tags_oportunidade_id_tag_id_key` (`oportunidade_id`, `tag_id`),
  PRIMARY KEY (`id`),
  INDEX `crm_oportunidade_tags_tag_id_idx` (`tag_id`),
  CONSTRAINT `crm_oportunidade_tags_oportunidade_id_fkey` FOREIGN KEY (`oportunidade_id`) REFERENCES `crm_oportunidades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_oportunidade_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `crm_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_campos_personalizados_definicao
CREATE TABLE `crm_campos_personalizados_definicao` (
  `id` VARCHAR(191) NOT NULL,
  `usuario_id` VARCHAR(191) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `tipo` VARCHAR(20) NOT NULL,
  `opcoes` JSON NULL,
  `ordem` INTEGER NOT NULL DEFAULT 0,
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `crm_campos_personalizados_definicao_usuario_id_idx` (`usuario_id`),
  CONSTRAINT `crm_campos_personalizados_definicao_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: crm_campos_personalizados_valor
CREATE TABLE `crm_campos_personalizados_valor` (
  `id` VARCHAR(191) NOT NULL,
  `definicao_id` VARCHAR(191) NOT NULL,
  `oportunidade_id` VARCHAR(191) NOT NULL,
  `valor` TEXT NOT NULL,

  UNIQUE INDEX `crm_campos_personalizados_valor_definicao_id_oportunidade_id_key` (`definicao_id`, `oportunidade_id`),
  PRIMARY KEY (`id`),
  INDEX `crm_campos_personalizados_valor_oportunidade_id_idx` (`oportunidade_id`),
  CONSTRAINT `crm_campos_personalizados_valor_definicao_id_fkey` FOREIGN KEY (`definicao_id`) REFERENCES `crm_campos_personalizados_definicao`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `crm_campos_personalizados_valor_oportunidade_id_fkey` FOREIGN KEY (`oportunidade_id`) REFERENCES `crm_oportunidades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateEnum
CREATE TABLE IF NOT EXISTS `metricas_personalizadas` (
  `id` VARCHAR(36) NOT NULL,
  `conta_anuncio_id` VARCHAR(36) NOT NULL,
  `usuario_id` VARCHAR(36) NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `formula` JSON NOT NULL,
  `formato` ENUM('moeda', 'percentual', 'numero') NOT NULL DEFAULT 'numero',
  `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizado_em` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `metricas_personalizadas_conta_anuncio_id_fkey` (`conta_anuncio_id`),
  INDEX `metricas_personalizadas_usuario_id_fkey` (`usuario_id`),
  CONSTRAINT `metricas_personalizadas_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `metricas_personalizadas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

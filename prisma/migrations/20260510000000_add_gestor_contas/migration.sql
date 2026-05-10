-- CreateTable
CREATE TABLE `gestor_contas` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` VARCHAR(191) NOT NULL,
    `conta_anuncio_id` VARCHAR(191) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `gestor_contas_usuario_id_conta_anuncio_id_key`(`usuario_id`, `conta_anuncio_id`),
    INDEX `gestor_contas_conta_anuncio_id_idx`(`conta_anuncio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `gestor_contas` ADD CONSTRAINT `gestor_contas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gestor_contas` ADD CONSTRAINT `gestor_contas_conta_anuncio_id_fkey` FOREIGN KEY (`conta_anuncio_id`) REFERENCES `contas_anuncio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

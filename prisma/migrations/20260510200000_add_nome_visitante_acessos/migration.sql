-- AlterTable: adiciona nome do visitante e expande campo pais para cidade+estado+país
ALTER TABLE `acessos_dashboard` ADD COLUMN `nome_visitante` VARCHAR(255) NULL;
ALTER TABLE `acessos_dashboard` MODIFY COLUMN `pais` VARCHAR(300) NULL;

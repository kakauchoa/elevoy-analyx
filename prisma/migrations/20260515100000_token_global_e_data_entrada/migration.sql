-- Token de acesso por conta passa a ser nullable (substituído por token global)
ALTER TABLE `contas_anuncio` MODIFY `token_acesso` TEXT NULL;

-- Data de entrada do cliente (desde quando buscar dados no Meta)
ALTER TABLE `contas_anuncio` ADD COLUMN `data_entrada` DATE NULL;

-- Token global armazenado na configuração do App Meta
ALTER TABLE `configuracoes_meta_app`
  ADD COLUMN `token_acesso` TEXT NULL,
  ADD COLUMN `token_expira_em` DATETIME(3) NULL,
  ADD COLUMN `token_status` ENUM('ok','expirando','expirado','erro') NOT NULL DEFAULT 'ok';

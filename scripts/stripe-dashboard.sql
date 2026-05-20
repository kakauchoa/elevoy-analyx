-- Migração: Stripe + construtor de dashboard
-- Rodar na VPS via MySQL

-- Colunas de assinatura no usuario
ALTER TABLE usuarios
  ADD COLUMN stripe_customer_id VARCHAR(255) NULL UNIQUE,
  ADD COLUMN stripe_subscription_id VARCHAR(255) NULL,
  ADD COLUMN plano ENUM('free','basico','intermediario','personalizado') NOT NULL DEFAULT 'free',
  ADD COLUMN contas_maximas INT NOT NULL DEFAULT 3,
  ADD COLUMN assinatura_ativa TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN assinatura_vence_em DATETIME NULL;

-- Tabela de layout de dashboard por conta
CREATE TABLE configuracoes_dashboard (
  id VARCHAR(36) NOT NULL,
  conta_anuncio_id VARCHAR(36) NOT NULL,
  layout JSON NOT NULL,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_config_dashboard_conta (conta_anuncio_id),
  CONSTRAINT fk_config_dashboard_conta FOREIGN KEY (conta_anuncio_id) REFERENCES contas_anuncio(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

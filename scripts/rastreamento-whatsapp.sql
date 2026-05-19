-- ============================================================
-- Rastreamento WhatsApp — Script de migração MySQL
-- Rodar no painel admin (EasyPanel → MySQL → Query)
-- ============================================================

-- 1. Novos ENUMs adicionados via ALTER TABLE abaixo (MySQL não usa CREATE TYPE)

-- 2. Colunas novas em contas_anuncio
ALTER TABLE contas_anuncio
  ADD COLUMN page_id_meta  VARCHAR(100) NULL AFTER token_acesso,
  ADD COLUMN webhook_token VARCHAR(100) NULL AFTER page_id_meta;

ALTER TABLE contas_anuncio
  ADD UNIQUE KEY uq_conta_webhook_token (webhook_token);

-- 3. Tabela leads_wpp
CREATE TABLE leads_wpp (
  id             VARCHAR(36)  NOT NULL,
  conta_anuncio_id VARCHAR(36) NOT NULL,
  nome           VARCHAR(255) NOT NULL,
  telefone       VARCHAR(30)  NOT NULL,
  mensagem       TEXT         NULL,
  ctwa           VARCHAR(500) NULL,
  source_id      VARCHAR(100) NULL,
  campanha       VARCHAR(500) NULL,
  publico        VARCHAR(500) NULL,
  anuncio        VARCHAR(500) NULL,
  origem         VARCHAR(100) NULL,
  midia          VARCHAR(100) NULL,
  status         ENUM('ENTROU','QUALIFICADO','PAGAMENTO','VENDA') NOT NULL DEFAULT 'ENTROU',
  valor          DECIMAL(10,2) NULL,
  observacoes    TEXT         NULL,
  criado_em      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_leads_conta_tel (conta_anuncio_id, telefone),
  CONSTRAINT fk_leads_wpp_conta FOREIGN KEY (conta_anuncio_id)
    REFERENCES contas_anuncio(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela leads_wpp_historico
CREATE TABLE leads_wpp_historico (
  id            VARCHAR(36)  NOT NULL,
  lead_id       VARCHAR(36)  NOT NULL,
  status_antes  ENUM('ENTROU','QUALIFICADO','PAGAMENTO','VENDA') NULL,
  status_depois ENUM('ENTROU','QUALIFICADO','PAGAMENTO','VENDA') NOT NULL,
  evento_meta   VARCHAR(100) NULL,
  sucesso       TINYINT(1)   NOT NULL DEFAULT 1,
  resposta      TEXT         NULL,
  criado_em     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT fk_hist_lead FOREIGN KEY (lead_id)
    REFERENCES leads_wpp(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela clientes_crm
CREATE TABLE clientes_crm (
  id               VARCHAR(36)  NOT NULL,
  conta_anuncio_id VARCHAR(36)  NULL,
  nome             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  telefone         VARCHAR(30)  NULL,
  senha_hash       TEXT         NOT NULL,
  status           ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  aprovado_em      DATETIME(3)  NULL,
  aprovado_por_id  VARCHAR(36)  NULL,
  criado_em        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  atualizado_em    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cliente_email (email),
  CONSTRAINT fk_cliente_conta FOREIGN KEY (conta_anuncio_id)
    REFERENCES contas_anuncio(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela solicitacoes_reset_crm
CREATE TABLE solicitacoes_reset_crm (
  id          VARCHAR(36)  NOT NULL,
  cliente_id  VARCHAR(36)  NOT NULL,
  status      ENUM('pendente','aprovado','rejeitado') NOT NULL DEFAULT 'pendente',
  token       VARCHAR(255) NOT NULL,
  expires_at  DATETIME(3)  NOT NULL,
  aprovado_em DATETIME(3)  NULL,
  criado_em   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token),
  CONSTRAINT fk_reset_cliente FOREIGN KEY (cliente_id)
    REFERENCES clientes_crm(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

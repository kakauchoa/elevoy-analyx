-- ============================================================
-- Rastreamento ativo por conta + limite de alerta de saldo
-- Rodar no painel MySQL (EasyPanel → MySQL → Query)
-- ============================================================

ALTER TABLE contas_anuncio
  ADD COLUMN rastreamento_ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER saldo_atualizado_em,
  ADD COLUMN limite_alerta_saldo DECIMAL(10,2) NULL AFTER rastreamento_ativo;

-- Conta rastreamento-apenas (WPP sem Meta Ads)
ALTER TABLE contas_anuncio
  ADD COLUMN rastreamento_apenas TINYINT(1) NOT NULL DEFAULT 0;

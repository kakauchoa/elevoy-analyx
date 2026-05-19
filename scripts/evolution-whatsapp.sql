-- ============================================================
-- Evolution API — Colunas adicionais
-- Rodar após rastreamento-whatsapp.sql
-- ============================================================

-- Colunas de instância Evolution por conta de anúncio
ALTER TABLE contas_anuncio
  ADD COLUMN evolution_instance_name VARCHAR(100) NULL AFTER webhook_token,
  ADD COLUMN evolution_status        VARCHAR(30)  NULL AFTER evolution_instance_name;

-- Versão do WhatsApp Web (gerenciada pelo admin para contornar erros de reconexão)
ALTER TABLE configuracoes_plataforma
  ADD COLUMN evolution_version VARCHAR(30) NULL AFTER evolution_whatsapp;

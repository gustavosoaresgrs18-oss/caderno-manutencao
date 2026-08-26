-- ═══════════════════════════════════════════════════════════════
--  COPILOTO — coluna km_ok (v3.81)
-- ═══════════════════════════════════════════════════════════════
--
--  POR QUE ISTO EXISTE
--
--  O app marca como "km errado" todo abastecimento cuja conta nao fecha
--  (menos de 4 km/L num carro, mais de 28, ou custo acima de R$ 3/km).
--  Mas as vezes o km esta CERTO: quem poe R$ 50 e roda 9 km ate o proximo
--  abastecimento tem 1,3 km/L reais naquele registro.
--
--  Desde a v3.81 o motorista pode dizer "esta certo, pode contar" — isso
--  grava `kmOk: true` no registro. Sem esta coluna, essa decisao morre no
--  aparelho: trocando de celular, o registro volta a ser marcado como errado
--  e o alerta reaparece pra sempre.
--
--  E REPETIVEL: rodar duas vezes nao quebra nada (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.abastecimentos
  ADD COLUMN IF NOT EXISTS km_ok boolean NOT NULL DEFAULT false;

-- Conferir:
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'abastecimentos' AND column_name = 'km_ok';

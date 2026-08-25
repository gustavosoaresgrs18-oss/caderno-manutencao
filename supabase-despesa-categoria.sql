-- ═══════════════════════════════════════════════════════════════
--  COPILOTO · CATEGORIA DA DESPESA NA NUVEM
--  Rodar UMA vez no SQL Editor. É repetível (o IF NOT EXISTS
--  protege) e não apaga nada.
--
--  POR QUE
--  A despesa subia só com a descrição. Na volta, o app não tinha
--  como saber a categoria e chutava "outros" pra tudo: o pedágio
--  do motorista virava "outros" ao trocar de aparelho, e a análise
--  por categoria (Fatia 3) nascia sem matéria-prima.
--
--  Só uma coluna nova. O ícone não precisa ir junto — ele é
--  derivado da categoria pelo app.
-- ═══════════════════════════════════════════════════════════════

alter table public.despesas
  add column if not exists cat text;

-- Preenche o que já está lá, a partir da descrição que foi gravada.
-- As linhas antigas guardaram o label ("Pedágio", "Alimentação"...),
-- então dá pra recuperar a categoria sem perder nada.
update public.despesas set cat = 'pedagio'
  where cat is null and descricao ilike '%ped%gio%';
update public.despesas set cat = 'alimentacao'
  where cat is null and descricao ilike '%aliment%';
update public.despesas set cat = 'lavagem'
  where cat is null and descricao ilike '%lavagem%';
update public.despesas set cat = 'estacionamento'
  where cat is null and descricao ilike '%estacion%';
update public.despesas set cat = 'internet'
  where cat is null and (descricao ilike '%internet%' or descricao ilike '%chip%');
update public.despesas set cat = 'outro'
  where cat is null;

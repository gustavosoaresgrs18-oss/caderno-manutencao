-- ═══════════════════════════════════════════════════════════════
--  COPILOTO · EXCLUSÃO DE CONTA (LGPD + exigência do Google Play)
--  Rodar UMA vez no SQL Editor do Supabase. É repetível: rodar de
--  novo só substitui a função.
--
--  POR QUE ISTO EXISTE
--  O "Apagar tudo" do app limpava só o celular (localStorage). A
--  conta e as 7 tabelas continuavam na nuvem — o motorista achava
--  que tinha apagado, e não tinha. O Google Play exige exclusão de
--  verdade, e a LGPD garante esse direito por lei.
--
--  POR QUE UMA FUNÇÃO E NÃO O APP DIRETO
--  Apagar as linhas das tabelas o app até consegue (o RLS deixa
--  cada um mexer no que é seu). Mas apagar a CONTA DE LOGIN exige
--  permissão de administrador — e essa chave nunca pode ir para o
--  front-end. SECURITY DEFINER resolve: a função roda com poder de
--  admin, mas só apaga os dados de quem a chamou (auth.uid()).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
-- search_path fixo: sem isto, alguém poderia criar um schema com o
-- mesmo nome de tabela e sequestrar o que a função apaga.
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  -- Só apaga a conta de quem está chamando. Nunca a de outro.
  if uid is null then
    raise exception 'Nenhum usuário autenticado.';
  end if;

  -- 1. Os dados do motorista, tabela por tabela
  delete from public.abastecimentos where usuario_id = uid;
  delete from public.financas       where usuario_id = uid;
  delete from public.despesas       where usuario_id = uid;
  delete from public.documentos     where usuario_id = uid;
  delete from public.manutencao     where usuario_id = uid;
  delete from public.veiculos       where usuario_id = uid;
  delete from public.perfil         where usuario_id = uid;

  -- 2. A conta de login (leva junto sessões e tokens)
  delete from auth.users where id = uid;
end;
$$;

-- Ninguém executa por padrão; só quem está logado, e só pra si.
revoke all     on function public.excluir_minha_conta() from public;
revoke all     on function public.excluir_minha_conta() from anon;
grant  execute on function public.excluir_minha_conta() to authenticated;

// ═══════════════════════════════════════════════════════════════
//  COPILOTO — Supabase Service (supabase-service.js)
//  Inicialização + Camada Híbrida (Abordagem B) + Fila Offline
//
//  ⚠️  SEGURANÇA — LEIA ANTES DE ALTERAR:
//  - A chave abaixo é a PUBLISHABLE KEY (segura para front-end).
//  - NUNCA coloque a 'service_role' / 'secret key' aqui.
//  - O projeto depende estritamente do Row Level Security (RLS)
//    configurado no banco — cada motorista só acessa os próprios dados.
//  - Este arquivo vai para o GitHub (público) — a chave publishable
//    é projetada para isso, desde que o RLS esteja ativo.
// ═══════════════════════════════════════════════════════════════

// ── Configuração ────────────────────────────────────────────────
const SUPABASE_URL  = 'https://mrnvapqxomyecbjyjobw.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_VO10AiANSgnMfNFS9e-KWA_K8ZhFnQW';

// ── Cliente Supabase (via CDN — sem build tool) ─────────────────
// O <script> do Supabase já foi adicionado no index.html.
// 'supabase' é a variável global exposta pelo CDN.
let _sb = null;
function getSB() {
  if (!_sb) {
    try {
      _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
      console.warn('[Copiloto] Supabase não inicializado:', e);
    }
  }
  return _sb;
}

// ── Estado do usuário logado ────────────────────────────────────
let _usuarioAtual = null;

async function obterUsuario() {
  try {
    const { data } = await getSB().auth.getUser();
    _usuarioAtual = data?.user || null;
    return _usuarioAtual;
  } catch (e) {
    return null;
  }
}

function usuarioId() {
  return _usuarioAtual?.id || null;
}

// Quem está logado agora (ou null). Usado pela seção "Minha conta" dos Ajustes.
function usuarioLogado() {
  return _usuarioAtual || null;
}

function estaLogado() {
  return !!_usuarioAtual;
}

// ── Chave da fila offline no localStorage ──────────────────────
const FILA_OFFLINE_KEY = 'filaOffline';

// ═══════════════════════════════════════════════════════════════
//  CAMADA HÍBRIDA DE GRAVAÇÃO (Abordagem B)
//
//  Lógica:
//  1. Grava IMEDIATAMENTE no localStorage (UI nunca trava).
//  2. Se online, tenta salvar no Supabase de forma assíncrona.
//  3. Se offline ou falhar, marca como pendente na fila offline.
// ═══════════════════════════════════════════════════════════════
// ⚠️ CORREÇÃO (auditoria): a versão original sempre fazia upsert com
// onConflict:'id' e deduplicava a fila comparando `dados.id`. Isso só
// funciona pra tabelas que têm 'id' (abastecimentos, veículos). A tabela
// 'financas' usa a chave composta (usuario_id, data_iso) — sem 'id' —
// e 'documentos' usa (usuario_id, tipo_id). Com o código antigo:
//   - o upsert ia falhar (ou duplicar linha) nessas tabelas;
//   - na fila offline, dois dias DIFERENTES de finanças tinham
//     `dados.id === undefined` pros dois → undefined===undefined→true,
//     e o mais novo apagava o mais velho da fila silenciosamente.
// Agora onConflict é passado por quem chama, e a chave de dedup usa
// o id quando existe, senão a data (finanças) ou o tipo (documentos).
async function salvarRegistroHibrido(nomeTabela, dados, onConflict) {
  const conflitoAlvo = onConflict || 'id';
  const chaveDedup = dados.id != null ? String(dados.id)
                    : dados.data_iso ? 'dia:' + dados.data_iso
                    : dados.tipo_id  ? 'tipo:' + dados.tipo_id
                    : JSON.stringify(dados);

  // 1. Local já foi salvo por quem chamou (resposta instantânea, UI nunca trava)
  // 2. Tenta enviar ao Supabase se online e logado
  if (navigator.onLine && usuarioId()) {
    try {
      const payload = { ...dados, usuario_id: usuarioId() };
      const { error } = await getSB()
        .from(nomeTabela)
        .upsert(payload, { onConflict: conflitoAlvo });

      if (error) throw error;

      // Sucesso — remove da fila se estava pendente
      const filaLocal = lerLS(FILA_OFFLINE_KEY, []);
      const filaAtualizada = filaLocal.filter(
        item => !(item.tabela === nomeTabela && item.chave === chaveDedup)
      );
      salvarLS(FILA_OFFLINE_KEY, filaAtualizada);
      return { ok: true, origem: 'supabase' };

    } catch (e) {
      console.warn('[Copiloto] Falha no Supabase, enfileirando:', e.message);
      _enfileirarOffline(nomeTabela, dados, chaveDedup, conflitoAlvo);
      return { ok: false, origem: 'fila', erro: e.message };
    }
  } else {
    // Offline ou não logado — enfileira pra sincronizar depois
    _enfileirarOffline(nomeTabela, dados, chaveDedup, conflitoAlvo);
    return { ok: false, origem: 'fila', motivo: 'offline' };
  }
}

function _enfileirarOffline(nomeTabela, dados, chaveDedup, onConflict) {
  const fila = lerLS(FILA_OFFLINE_KEY, []);
  const chave = chaveDedup || (dados.id != null ? String(dados.id) : JSON.stringify(dados));
  // Evita duplicatas (mesma chave na mesma tabela) — agora sem colidir
  // registros diferentes que não têm 'id' (ex: dois dias de finanças)
  const semDuplicata = fila.filter(
    item => !(item.tabela === nomeTabela && item.chave === chave)
  );
  semDuplicata.push({
    op: 'salvar',
    tabela: nomeTabela,
    chave: chave,
    onConflict: onConflict || 'id',
    dados: { ...dados, sincronizado: false },
    tentativas: 0,
    ts: Date.now()
  });
  salvarLS(FILA_OFFLINE_KEY, semDuplicata);
}

// ═══════════════════════════════════════════════════════════════
//  EXCLUSÃO HÍBRIDA
//  Mesmo espírito do salvarRegistroHibrido: quem chama já apagou
//  local (resposta instantânea). Aqui só tenta refletir na nuvem —
//  se falhar ou estiver offline, entra na MESMA fila de sincronização,
//  marcada como 'excluir' em vez de 'salvar'.
// ═══════════════════════════════════════════════════════════════
async function excluirRegistroHibrido(nomeTabela, colunaFiltro, valorFiltro) {
  const chave = 'del:' + colunaFiltro + ':' + valorFiltro;

  if (navigator.onLine && usuarioId()) {
    try {
      const { error } = await getSB()
        .from(nomeTabela)
        .delete()
        .eq(colunaFiltro, valorFiltro)
        .eq('usuario_id', usuarioId());   // nunca apaga fora da própria conta

      if (error) throw error;

      const filaLocal = lerLS(FILA_OFFLINE_KEY, []);
      salvarLS(FILA_OFFLINE_KEY, filaLocal.filter(item => !(item.tabela === nomeTabela && item.chave === chave)));
      return { ok: true, origem: 'supabase' };

    } catch (e) {
      console.warn('[Copiloto] Falha ao excluir no Supabase, enfileirando:', e.message);
      _enfileirarExclusaoOffline(nomeTabela, colunaFiltro, valorFiltro, chave);
      return { ok: false, origem: 'fila', erro: e.message };
    }
  } else {
    _enfileirarExclusaoOffline(nomeTabela, colunaFiltro, valorFiltro, chave);
    return { ok: false, origem: 'fila', motivo: 'offline' };
  }
}

function _enfileirarExclusaoOffline(nomeTabela, colunaFiltro, valorFiltro, chave) {
  const fila = lerLS(FILA_OFFLINE_KEY, []);
  // Se existia uma GRAVAÇÃO pendente desse mesmo registro, ela vira letra
  // morta (apagar depois de gravar não faz sentido) — remove as duas e
  // fica só a exclusão.
  const semObsoletos = fila.filter(item => {
    if (item.tabela !== nomeTabela) return true;
    if (item.chave === chave) return false;
    if (item.op !== 'excluir' && item.dados && item.dados[colunaFiltro] === valorFiltro) return false;
    return true;
  });
  semObsoletos.push({
    op: 'excluir',
    tabela: nomeTabela,
    chave: chave,
    colunaFiltro, valorFiltro,
    tentativas: 0,
    ts: Date.now()
  });
  salvarLS(FILA_OFFLINE_KEY, semObsoletos);
}

// ═══════════════════════════════════════════════════════════════
//  SINCRONIZADOR DE SEGUNDO PLANO (fila offline)
//
//  Varre o localStorage em busca de registros pendentes
//  e tenta enviá-los ao Supabase.
//  Dispara:
//  - No carregamento inicial do app
//  - Sempre que o navegador voltar a ficar online
// ═══════════════════════════════════════════════════════════════
async function sincronizarFilaOffline() {
  if (!navigator.onLine || !usuarioId()) return;

  const fila = lerLS(FILA_OFFLINE_KEY, []);
  if (fila.length === 0) return;

  console.log(`[Copiloto] Sincronizando ${fila.length} item(ns) pendente(s)...`);

  const filaRestante = [];

  for (const item of fila) {
    try {
      if (item.op === 'excluir') {
        const { error } = await getSB()
          .from(item.tabela)
          .delete()
          .eq(item.colunaFiltro, item.valorFiltro)
          .eq('usuario_id', usuarioId());
        if (error) throw error;
        console.log(`[Copiloto] ✓ Excluído: ${item.tabela} / ${item.chave}`);
      } else {
        const payload = { ...item.dados, usuario_id: usuarioId(), sincronizado: true };
        const { error } = await getSB()
          .from(item.tabela)
          .upsert(payload, { onConflict: item.onConflict || 'id' });
        if (error) throw error;
        // Sucesso — não adiciona de volta na fila
        console.log(`[Copiloto] ✓ Sincronizado: ${item.tabela} / ${item.chave || item.dados.id}`);
      }

    } catch (e) {
      item.tentativas = (item.tentativas || 0) + 1;
      if (item.tentativas < 5) {
        filaRestante.push(item); // tenta de novo nas próximas vezes
      } else {
        console.warn(`[Copiloto] ✗ Desistindo após 5 tentativas: ${item.tabela}`);
      }
    }
  }

  salvarLS(FILA_OFFLINE_KEY, filaRestante);

  if (filaRestante.length === 0) {
    console.log('[Copiloto] ✓ Fila offline zerada — tudo sincronizado.');
  }
}

// Dispara quando o navegador volta a ficar online
window.addEventListener('online', () => {
  console.log('[Copiloto] Conexão restaurada — sincronizando...');
  sincronizarFilaOffline();
});

// ═══════════════════════════════════════════════════════════════
//  AUTENTICAÇÃO — helpers básicos
// ═══════════════════════════════════════════════════════════════

async function sbCadastrar(email, senha) {
  try {
    const { data, error } = await getSB().auth.signUp({ email, password: senha });

    if (error) {
      // Separa o que o app precisa CONTAR pro motorista do que ele pode
      // resolver sozinho depois:
      //  - jaExiste  → tem que avisar: o cara acha que criou conta e não criou
      //  - offline   → segue a vida, a fila sincroniza quando a internet voltar
      const msg = (error.message || '').toLowerCase();
      const jaExiste = msg.includes('already registered')
                    || msg.includes('already been registered')
                    || msg.includes('user already exists');
      const offline  = msg.includes('fetch') || msg.includes('network') || !navigator.onLine;
      return { ok: false, jaExiste, offline, erro: error.message };
    }

    // ⚠️ Quando "Confirm email" está DESLIGADO e o e-mail já existe, o Supabase
    // não devolve erro: por privacidade (não vazar quem tem conta), ele responde
    // sucesso com um usuário "fantasma", sem identities. Sem esta checagem o app
    // acha que criou a conta e segue calado — que é exatamente o bug relatado.
    const semIdentidade = data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (semIdentidade) {
      return { ok: false, jaExiste: true, erro: 'E-mail já cadastrado' };
    }

    return { ok: true, usuario: data.user };
  } catch (e) {
    return { ok: false, offline: true, erro: e.message };
  }
}

async function sbEntrar(email, senha) {
  try {
    const { data, error } = await getSB().auth.signInWithPassword({ email, password: senha });
    if (error) return { ok: false, erro: error.message };
    _usuarioAtual = data.user;
    return { ok: true, usuario: data.user };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

// Manda o e-mail de "esqueci minha senha". O link volta pro próprio app
// (o endereço configurado em Authentication → URL Configuration).
// ⚠️ No plano grátis, o servidor de e-mail do Supabase é limitado a poucos
// envios por hora. Antes de abrir pra motoristas de verdade, plugar um
// serviço próprio (ex: Resend) em Authentication → SMTP Settings.
async function sbRecuperarSenha(email) {
  try {
    const { error } = await getSB().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const msg = (e.message || '').toLowerCase();
    return {
      ok: false,
      limite: msg.includes('rate limit') || msg.includes('too many'),
      erro: e.message
    };
  }
}

// Define a senha nova. Só funciona logo depois do link de recuperação,
// quando o Supabase já criou uma sessão temporária a partir do e-mail.
async function sbTrocarSenha(novaSenha) {
  try {
    const { error } = await getSB().auth.updateUser({ password: novaSenha });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

async function sbSair() {
  try {
    await getSB().auth.signOut();
    _usuarioAtual = null;
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

// ─── Escuta mudanças de sessão (login/logout/refresh) ──────────
function inicializarAuth(callbackMudanca) {
  getSB().auth.onAuthStateChange((evento, sessao) => {
    _usuarioAtual = sessao?.user || null;
    console.log('[Copiloto] Auth:', evento, _usuarioAtual?.email || 'sem sessão');
    if (typeof callbackMudanca === 'function') callbackMudanca(evento, _usuarioAtual);
    // Quando faz login, sincroniza a fila offline
    if (evento === 'SIGNED_IN') sincronizarFilaOffline();
  });
}

// ═══════════════════════════════════════════════════════════════
//  MIGRAÇÃO DO 1º LOGIN (Comando 4)
//
//  Roda UMA VEZ, logo após o primeiro login.
//  Pega todo o histórico do localStorage e sobe pro Supabase.
//  Garante que o motorista não perde dados antigos ao migrar.
// ═══════════════════════════════════════════════════════════════
async function migrarMotoristaAntigo(userId) {
  if (!userId) return;
  // Verificar se já migrou (evita rodar 2x)
  const jaMigrou = lerLS('supaMigradoV1', false);
  if (jaMigrou) return;

  console.log('[Copiloto] Iniciando migração do localStorage...');

  const erros = [];

  try {
    // 1. PERFIL
    const perfil = lerLS('perfilUsuario', null);
    if (perfil) {
      // ⚠️ CORREÇÃO (auditoria): 'meta' e 'reservaDiaria' nunca existiram no
      // objeto local — os campos reais são 'metaDiaria' e 'reservaDia' (ver
      // finalizarCadastro em script.js). Com os nomes errados, TODO motorista
      // migrava com meta 100 e reserva 10, mesmo quem tinha personalizado pra
      // outro valor — silenciosamente, sem erro nenhum. E 'taxa: perfil.taxa
      // || 25' inventava 25% pra quem ainda não tinha taxa configurada
      // (perfil.taxa == null), o que fere a regra do próprio app de nunca
      // inventar número.
      const { error } = await getSB().from('perfil').upsert({
        usuario_id:      userId,
        nome:            perfil.nome        || '',
        veiculo_tipo:    perfil.veiculo     || 'moto',
        modelo:          perfil.modelo      || '',
        placa:           perfil.placa       || '',
        taxa:            (perfil.taxa != null && perfil.taxa > 0) ? perfil.taxa : null,
        meta:            perfil.metaDiaria  || 250,
        reserva_diaria:  perfil.reservaDia  || 20,
        plataformas:     perfil.plataformas || [],
        reserva_acumulada: lerLS('reservaAcumulada', 0),
        streak:          lerLS('streak', 0),
        pontos_patente:  lerLS('pontosPatente', 0),
        migrado_em:      new Date().toISOString()
      }, { onConflict: 'usuario_id' });
      if (error) erros.push('perfil: ' + error.message);
    }

    // 2. VEÍCULOS
    const veiculos = lerLS('veiculos', []);
    for (const v of veiculos) {
      const { error } = await getSB().from('veiculos').upsert({
        id:              v.id,
        usuario_id:      userId,
        tipo:            v.tipo    || 'moto',
        modelo:          v.modelo  || '',
        placa:           v.placa   || '',
        odo:             v.odo     || null,
        reserva_manut_km: v.reservaManutKm || null,
        desde:           v.desde   || null,
        ate:             v.ate     || null
      }, { onConflict: 'id' });
      if (error) erros.push('veículo ' + v.id + ': ' + error.message);
    }

    // 3. FINANÇAS (histórico de fechamentos)
    // ⚠️ CORREÇÃO (auditoria): o registro local de historicoFinancas tem os
    // campos `lucro`, `taxa`, `desp` — NUNCA teve `liquido`, `taxaReal`,
    // `horaInicio`/`horaFim` (não existe controle de hora de início/fim por
    // dia no app, só o total acumulado em horasPorDia). Com os nomes
    // errados, `liquido: f.liquido || 0` gravava ZERO de lucro líquido pra
    // TODOS os dias de TODOS os motoristas que já migraram — o número mais
    // importante do app ia pra nuvem sempre zerado, sem erro nenhum.
    const financas = lerLS('historicoFinancas', []);
    for (const f of financas) {
      if (!f.dataISO) continue;
      const { error } = await getSB().from('financas').upsert({
        usuario_id:   userId,
        data_iso:     f.dataISO,
        receita:      f.receita   || 0,
        liquido:      f.lucro     || 0,
        taxa_real:    (f.taxa != null) ? f.taxa : null,
        hora_inicio:  null,   // o app não guarda horário de início/fim por dia, só o total (horasPorDia)
        hora_fim:     null,
        km_dia:       f.kmDia     || null,
        despesas:     f.desp      || 0
      }, { onConflict: 'usuario_id,data_iso' });
      if (error) erros.push('finanças ' + f.dataISO + ': ' + error.message);
    }

    // 4. ABASTECIMENTOS
    // ⚠️ CORREÇÃO (auditoria): estava `a.data || a.dataISO`, ou seja, dava
    // prioridade à string curta de EXIBIÇÃO ("seg, 12/08" — sem ano, sem
    // formato ISO) sobre a data real (a.dataISO = "2026-08-12"). Como
    // a.data é sempre preenchida, a.dataISO NUNCA era usada. Toda a coluna
    // data_iso na nuvem ficava com um valor que não é uma data ISO de
    // verdade — quebraria qualquer filtro por mês/período feito no banco,
    // e quebraria a restauração em outro aparelho (ver restaurarDoSupabase).
    const abastecimentos = lerLS('historicoAbastecimentos', []);
    for (const a of abastecimentos) {
      if (!a.id) continue;
      const { error } = await getSB().from('abastecimentos').upsert({
        id:          a.id,
        usuario_id:  userId,
        data_iso:    a.dataISO || a.data || null,
        tipo:        a.tipo   || 'Gasolina',
        valor:       a.valor  || 0,
        litros:      a.litros || null,
        km:          a.km     || null,
        cpm:         a.cpm    || null,
        posto:       a.posto  || null
      }, { onConflict: 'id' });
      if (error) erros.push('abast ' + a.id + ': ' + error.message);
    }

    // 5. DOCUMENTOS
    const documentos = lerLS('documentos', {});
    for (const [tipoId, doc] of Object.entries(documentos)) {
      if (!doc || !doc.vencimento) continue;
      const { error } = await getSB().from('documentos').upsert({
        usuario_id:  userId,
        tipo_id:     tipoId,
        nome:        doc.nome       || tipoId,
        vencimento:  doc.vencimento || null,
        obs:         doc.obs        || null
      }, { onConflict: 'usuario_id,tipo_id' });
      if (error) erros.push('doc ' + tipoId + ': ' + error.message);
    }

    // 6. RESULTADO
    if (erros.length === 0) {
      salvarLS('supaMigradoV1', true);
      console.log('[Copiloto] ✓ Migração concluída com sucesso!');
      return { ok: true };
    } else {
      console.warn('[Copiloto] Migração com erros parciais:', erros);
      return { ok: false, erros };
    }

  } catch (e) {
    console.error('[Copiloto] Erro crítico na migração:', e);
    return { ok: false, erro: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  RESTAURAR DO SUPABASE (o caminho inverso da migração)
//
//  Usado no LOGIN de uma conta que já existe (motorista trocou de
//  celular ou limpou o navegador — o localStorage está vazio).
//  Puxa perfil, veículos, finanças, abastecimentos e documentos da
//  nuvem e repõe no localStorage, do jeito que o resto do app espera.
//
//  ⚠️ AINDA NÃO COBRE: manutenção e despesas. Essas duas tabelas
//  existem no banco mas `migrarMotoristaAntigo` também não as sobe
//  ainda — não dá pra restaurar o que nunca foi salvo na nuvem.
//  Fica pra uma próxima fatia, junto com a troca geral de salvarLS
//  por salvarRegistroHibrido nesses dois pontos.
// ═══════════════════════════════════════════════════════════════
async function restaurarDoSupabase(userId) {
  if (!userId) return { ok: false, erro: 'sem usuário' };
  try {
    const sb = getSB();
    let achouAlgo = false;

    // 1. PERFIL
    const { data: p } = await sb.from('perfil').select('*').eq('usuario_id', userId).maybeSingle();
    if (p) {
      achouAlgo = true;
      salvarLS('perfilUsuario', {
        nome:            p.nome || '',
        veiculo:         p.veiculo_tipo || 'moto',
        modelo:          p.modelo || '',
        placa:           p.placa || '',
        taxa:            p.taxa != null ? p.taxa : null,
        metaDiaria:      p.meta || 250,
        reservaDia:      p.reserva_diaria || 20,
        plataformas:     p.plataformas || [],
        reservaManutKm:  undefined,   // deixa o backfill do iniciarApp() calcular pelo tipo do veículo
        reservaObjetivo: 0
      });
      salvarLS('reservaAcumulada', p.reserva_acumulada || 0);
      salvarLS('streak',           p.streak || 0);
      salvarLS('pontosPatente',    p.pontos_patente || 0);
    }

    // 2. VEÍCULOS
    const { data: veics } = await sb.from('veiculos').select('*').eq('usuario_id', userId);
    if (veics && veics.length) {
      achouAlgo = true;
      const veiculos = veics.map(v => ({
        id: v.id, tipo: v.tipo || 'moto', modelo: v.modelo || '', placa: v.placa || '',
        odo: v.odo != null ? v.odo : null,
        reservaManutKm: v.reserva_manut_km != null ? v.reserva_manut_km : null,
        desde: v.desde || null, ate: v.ate || null
      }));
      salvarLS('veiculos', veiculos);
      const ativo = veiculos.find(v => !v.ate) || veiculos[0];
      if (ativo) localStorage.setItem('veiculoAtivo', ativo.id);   // mesma regra do script.js: string pura, sem JSON
    }

    // 3. FINANÇAS
    const { data: fins } = await sb.from('financas').select('*').eq('usuario_id', userId);
    if (fins && fins.length) {
      achouAlgo = true;
      salvarLS('historicoFinancas', fins.map(f => {
        const receita = f.receita || 0;
        const liquido = f.liquido || 0;
        return {
          data: f.data_iso, dataISO: f.data_iso,
          receita, taxa: Math.max(0, receita - liquido),
          comb: 0, desp: f.despesas || 0,     // recalculados na hora (ressincronizarReceitaHoje cobre o dia de hoje)
          lucro: liquido, odo: null, kmDia: f.km_dia != null ? f.km_dia : null
        };
      }));
    }

    // 4. ABASTECIMENTOS
    const { data: abs } = await sb.from('abastecimentos').select('*').eq('usuario_id', userId);
    if (abs && abs.length) {
      achouAlgo = true;
      salvarLS('historicoAbastecimentos', abs.map(a => ({
        id: a.id, data: a.data_iso, dataISO: a.data_iso,
        tipo: a.tipo || 'Gasolina', valor: a.valor || 0,
        litros: a.litros != null ? a.litros : null,
        km: a.km != null ? a.km : null,
        cpm: a.cpm != null ? a.cpm : null,
        posto: a.posto || null
      })));
    }

    // 5. DOCUMENTOS
    const { data: docs } = await sb.from('documentos').select('*').eq('usuario_id', userId);
    if (docs && docs.length) {
      achouAlgo = true;
      const mapa = {};
      docs.forEach(d => { mapa[d.tipo_id] = { nome: d.nome, vencimento: d.vencimento, obs: d.obs }; });
      salvarLS('documentos', mapa);
    }

    if (achouAlgo) salvarLS('supaMigradoV1', true);   // já tem base na nuvem: não roda a migração de novo
    return { ok: achouAlgo };

  } catch (e) {
    console.error('[Copiloto] Erro ao restaurar do Supabase:', e);
    return { ok: false, erro: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
//  INICIALIZAÇÃO GERAL
//  Chame esta função logo que o app carrega (no script.js).
// ═══════════════════════════════════════════════════════════════
async function inicializarSupabase(callbackAuth) {
  // 1. Inicia o cliente
  getSB();
  // 2. Escuta mudanças de sessão
  inicializarAuth(callbackAuth);
  // 3. Tenta recuperar sessão existente
  await obterUsuario();
  // 4. Sincroniza fila offline (se já tiver sessão e conexão)
  await sincronizarFilaOffline();
  console.log('[Copiloto] Supabase inicializado. Usuário:', _usuarioAtual?.email || 'não logado');
}

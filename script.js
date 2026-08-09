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
async function salvarRegistroHibrido(nomeTabela, dados) {
  // 1. Salva local primeiro (resposta instantânea)
  const filaLocal = lerLS(FILA_OFFLINE_KEY, []);

  // 2. Tenta enviar ao Supabase se online e logado
  if (navigator.onLine && usuarioId()) {
    try {
      const payload = { ...dados, usuario_id: usuarioId() };
      const { error } = await getSB()
        .from(nomeTabela)
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      // Sucesso — remove da fila se estava pendente
      const filaAtualizada = filaLocal.filter(
        item => !(item.tabela === nomeTabela && item.dados.id === dados.id)
      );
      salvarLS(FILA_OFFLINE_KEY, filaAtualizada);
      return { ok: true, origem: 'supabase' };

    } catch (e) {
      console.warn('[Copiloto] Falha no Supabase, enfileirando:', e.message);
      _enfileirarOffline(nomeTabela, dados);
      return { ok: false, origem: 'fila', erro: e.message };
    }
  } else {
    // Offline ou não logado — enfileira pra sincronizar depois
    _enfileirarOffline(nomeTabela, dados);
    return { ok: false, origem: 'fila', motivo: 'offline' };
  }
}

function _enfileirarOffline(nomeTabela, dados) {
  const fila = lerLS(FILA_OFFLINE_KEY, []);
  // Evita duplicatas (mesmo id na mesma tabela)
  const semDuplicata = fila.filter(
    item => !(item.tabela === nomeTabela && item.dados.id === dados.id)
  );
  semDuplicata.push({
    tabela: nomeTabela,
    dados: { ...dados, sincronizado: false },
    tentativas: 0,
    ts: Date.now()
  });
  salvarLS(FILA_OFFLINE_KEY, semDuplicata);
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
      const payload = { ...item.dados, usuario_id: usuarioId(), sincronizado: true };
      const { error } = await getSB()
        .from(item.tabela)
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;
      // Sucesso — não adiciona de volta na fila
      console.log(`[Copiloto] ✓ Sincronizado: ${item.tabela} / ${item.dados.id}`);

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
    if (error) return { ok: false, erro: error.message };
    return { ok: true, usuario: data.user };
  } catch (e) {
    return { ok: false, erro: e.message };
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
      const { error } = await getSB().from('perfil').upsert({
        usuario_id:      userId,
        nome:            perfil.nome        || '',
        veiculo_tipo:    perfil.veiculo     || 'moto',
        modelo:          perfil.modelo      || '',
        placa:           perfil.placa       || '',
        taxa:            perfil.taxa        || 25,
        meta:            perfil.meta        || 100,
        reserva_diaria:  perfil.reservaDiaria || 10,
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
    const financas = lerLS('historicoFinancas', []);
    for (const f of financas) {
      if (!f.dataISO) continue;
      const { error } = await getSB().from('financas').upsert({
        usuario_id:   userId,
        data_iso:     f.dataISO,
        receita:      f.receita   || 0,
        liquido:      f.liquido   || 0,
        taxa_real:    f.taxaReal  || null,
        hora_inicio:  f.horaInicio || null,
        hora_fim:     f.horaFim   || null,
        km_dia:       f.kmDia     || null,
        despesas:     f.despesas  || 0
      }, { onConflict: 'usuario_id,data_iso' });
      if (error) erros.push('finanças ' + f.dataISO + ': ' + error.message);
    }

    // 4. ABASTECIMENTOS
    const abastecimentos = lerLS('historicoAbastecimentos', []);
    for (const a of abastecimentos) {
      if (!a.id) continue;
      const { error } = await getSB().from('abastecimentos').upsert({
        id:          a.id,
        usuario_id:  userId,
        data_iso:    a.data   || a.dataISO || null,
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
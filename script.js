// ═══════════════════════════════════════════════════════════════
//  NOME DO CONSULTOR (o lobo-guará)
//  Trocou de ideia sobre o nome? Muda AQUI e o app inteiro muda:
//  aba de baixo, título da tela, apresentação e a fala.
//  Se o nome for feminino, troque ARTIGO_ASSISTENTE para 'a'.
// ═══════════════════════════════════════════════════════════════
const NOME_ASSISTENTE   = 'Isaac';
const ARTIGO_ASSISTENTE = 'o';

// ═══════════════════════════════════════════════════════════════
//  HELPERS DE ROBUSTEZ (blindagem)
//  - lerLS/salvarLS: localStorage protegido (dado corrompido ou
//    armazenamento cheio não derrubam mais o app)
//  - numBR: aceita vírgula E ponto ("45,50" não perde os centavos)
//  - isoLocal/hojeISO: data pelo relógio LOCAL (corrige o bug do
//    fuso que jogava a receita da noite no dia seguinte)
//  - esc: limpa texto digitado antes de virar HTML
// ═══════════════════════════════════════════════════════════════
// ⚠️ BUG SILENCIOSO QUE MOROU AQUI (achado em v3.72)
// salvarLS gravava string CRUA (sem aspas) e lerLS fazia JSON.parse.
// Resultado: salvar "Gasolina" gravava Gasolina, e JSON.parse("Gasolina")
// estourava — o catch devolvia o padrão, e o valor sumia em silêncio.
//
// Quem pagou: `ultimoTipoComb`. O código dizia "lembra pro próximo" e NUNCA
// lembrou. Motorista de GNV, Etanol ou Diesel trocava o tipo TODA VEZ que
// abastecia. Passou despercebido porque o padrão é 'Gasolina' e a maioria
// usa gasolina — pra esses, o bug parecia funcionar.
// Atrito no registro é o campo de batalha do produto (ver RETOMADA).
//
// Duas correções, e as duas precisam existir:
//   · salvarLS agora sempre serializa  → conserta daqui pra frente
//   · lerLS aceita texto cru de volta  → conserta o que JÁ está gravado no
//     aparelho de quem usa o app, sem precisar apagar nada
function lerLS(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    if (v === null) return padrao;
    try { return JSON.parse(v); }
    catch (e) { return v; }   // texto cru gravado pela versão antiga: devolve como está
  } catch (e) { return padrao; }   // storage bloqueado? ignora, não mata o app
}
function salvarLS(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    if (typeof toast === 'function') toast('⚠️ Não consegui salvar — armazenamento cheio ou bloqueado', 'erro');
    return false;
  }
}
function numBR(v) {
  let s = String(v ?? '').trim();
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');   // "1.234,56" → "1234.56"
  return parseFloat(s);
}

// ── DINHEIRO EM PORTUGUÊS ────────────────────────────────────
// vírgula no centavo, ponto no milhar: R$ 1.234,56 · R$ 325,00 · -R$ 50,00
// numBRL: só o número formatado ("1.234,56"). fmtBRL: com "R$ " na frente.
// Preserva o sinal (negativo aparece), sempre 2 casas.
// ─── KM É NÚMERO INTEIRO ─────────────────────────────────────
// ⚠️ O numBR() acima é de DINHEIRO: nele a vírgula é decimal de verdade
// (R$ 45,50). Km é outra coisa — painel não mostra fração, e décimo de km não
// muda conta nenhuma.
// O caso que quebrou em teste: o motorista digitou "105,387" querendo cento e
// cinco mil e trezentos e oitenta e sete. O numBR() leu 105 vírgula 387, e o
// fechamento acusou 105 mil km rodados num dia.
// Regra: ponto é sempre separador de milhar. Vírgula seguida de EXATAMENTE 3
// dígitos também é milhar disfarçado ("105,387"). Qualquer outra vírgula é
// decimal ("32,5" = trinta e dois e meio), e o resultado é arredondado.
function numKm(v) {
  let s = String(v ?? '').trim();
  if (!s) return 0;
  s = s.replace(/\s/g, '').replace(/\./g, '');
  s = /^\d+,\d{3}$/.test(s) ? s.replace(',', '') : s.replace(',', '.');
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
}
function numBRL(n) {
  const v = numBR(n);
  const x = isFinite(v) ? v : 0;
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtBRL(n) {
  const v = numBR(n);
  const x = isFinite(v) ? v : 0;
  const neg = x < 0;
  return (neg ? '-R$ ' : 'R$ ') + Math.abs(x).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
// versão sem centavos (pra números grandes redondos: projeção, reserva). Mantém o ponto de milhar.
function fmtBRL0(n) {
  const v = numBR(n);
  const x = isFinite(v) ? Math.round(v) : 0;
  const neg = x < 0;
  return (neg ? '-R$ ' : 'R$ ') + Math.abs(x).toLocaleString('pt-BR');
}

function isoLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function ontemISO() { const d = new Date(); d.setDate(d.getDate() - 1); return isoLocal(d); }
// dia anterior a uma data ISO qualquer (o ontemISO() só sabe olhar pra hoje)
function diaAnteriorISO(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  if (isNaN(d)) return ontemISO();
  d.setDate(d.getDate() - 1);
  return isoLocal(d);
}
// ISO ("2026-08-23") -> exibicao ("sab, 23/08"). Usa meio-dia porque
// new Date('2026-08-23') e lido como UTC: as 21h no Brasil isso vira o dia
// ANTERIOR na tela. Mesmo cuidado que o hojeISO() ja tomava.
function isoParaExibicao(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// confirmação bonita (substitui o confirm() cinza do navegador)
let _confirmCb = null;
function pedirConfirmacao(titulo, texto, aoConfirmar) {
  document.getElementById('confirmTitulo').innerHTML = titulo;   // só constantes do app; o texto abaixo segue textContent
  document.getElementById('confirmTexto').textContent  = texto;
  _confirmCb = aoConfirmar;
  document.getElementById('modalConfirm').style.display = 'flex';
}

// ═══════════════════════════════════════════════════════════════
//  SISTEMA DE PATENTES DO COPILOTO
//  15 patentes, 15 pedras únicas, cada patente dá pontos
// ═══════════════════════════════════════════════════════════════

// 15 patentes, com pedra, cor da pedra, e recompensa (só da 8ª pra frente)
const PATENTES = [
  // NÍVEL 1 — Iniciantes
  { i:1,  nivel:1, nome:'Pé de Chumbo',       pedra:'Rubi',           corA:'#ff3b5c', corB:'#b81030', recompensa:null },
  { i:2,  nivel:1, nome:'Novato de Rua',      pedra:'Esmeralda',      corA:'#3aeb8f', corB:'#0e7a3f', recompensa:null },
  { i:3,  nivel:1, nome:'Diamante Bruto',     pedra:'Safira',         corA:'#3d7fff', corB:'#0e2f80', recompensa:null },
  // NÍVEL 2 — Cria do bairro
  { i:4,  nivel:2, nome:'Cria do Asfalto',    pedra:'Topázio',        corA:'#ffab3d', corB:'#c46b00', recompensa:null },
  { i:5,  nivel:2, nome:'Fera de Bairro',     pedra:'Ametista',       corA:'#b467ff', corB:'#5a1fa8', recompensa:null },
  { i:6,  nivel:2, nome:'Sangue Quente',      pedra:'Citrino',        corA:'#ffde5c', corB:'#c99000', recompensa:null },
  // NÍVEL 3 — Dominando
  { i:7,  nivel:3, nome:'Trovão do Asfalto',  pedra:'Água-marinha',   corA:'#7ee6ff', corB:'#0f7994', recompensa:null },
  { i:8,  nivel:3, nome:'Fúria de Rodas',     pedra:'Turmalina',      corA:'#ff6bad', corB:'#a01f5e', recompensa:'O Isaac comemora seus dias fortes com mais gás' },
  { i:9,  nivel:3, nome:'Nitro nas Veias',    pedra:'Peridoto',       corA:'#c5e858', corB:'#688a10', recompensa:'Frase especial do Isaac quando você bate a meta' },
  // NÍVEL 4 — Referência
  { i:10, nivel:4, nome:'Domador do Asfalto', pedra:'Granada',        corA:'#ff5a3d', corB:'#8f1500', recompensa:'O Isaac te chama de "Domador" ao te cumprimentar' },
  { i:11, nivel:4, nome:'Mago da Direção',    pedra:'Opala',          corA:'#7fe5ff', corB:'#7f2fff', recompensa:'Selo de Mago no seu avatar do canto' },
  { i:12, nivel:4, nome:'Rei da Estrada',     pedra:'Diamante',       corA:'#e8f5ff', corB:'#8fb8d9', recompensa:'Coroa de ouro no seu avatar do canto' },
  // NÍVEL 5 — Lenda
  { i:13, nivel:5, nome:'Lenda do Volante',   pedra:'Jade Imperial',  corA:'#00c98a', corB:'#00594a', recompensa:'O Isaac te trata por "Lenda" ao falar com você' },
  { i:14, nivel:5, nome:'Imortal do Asfalto', pedra:'Tanzanita',      corA:'#8a7dff', corB:'#3a1ab5', recompensa:'Arte especial de Imortal na sua tela de patente' },
  { i:15, nivel:5, nome:'Titã do Asfalto',    pedra:'Diamante Negro', corA:'#5a5a68', corB:'#0a0a12', recompensa:'Coroa de titã + título perpétuo no perfil (o topo absoluto)' },
];

const NIVEIS_NOME = { 1:'Iniciante', 2:'Cria do bairro', 3:'Dominando', 4:'Referência', 5:'Lenda' };

// PONTOS: cada ação do usuário vale pontos (soma tudo em ganhoTotal)
const PONTOS_ACAO = { receita:3, abastecimento:2, turno:2, manutencao:1, documento:1, despesa:1 };

// META DE PONTOS por patente: cresce ~30% a cada, total ~1.535 até a 15ª (Titã).
// pré-calculado: começa em 12 e cresce fator 1.3^n
function metaDaPatente(i) {
  return Math.round(12 * Math.pow(1.3, i - 1));   // 12,16,20,26,34,45,58,75,98,127,165,215,280,364 → acumulado ≈ 1.535
}
// pontos ACUMULADOS pra desbloquear a patente N (i.e. sair da anterior)
function pontosParaAtingir(i) {
  let s = 0; for (let k = 1; k < i; k++) s += metaDaPatente(k);
  return s;
}

// ─── ESTADO DO USUÁRIO ─────────────────────────────────────────
function getPontos() { return Number(localStorage.getItem('pontosPatente')) || 0; }
function setPontos(p) { salvarLS('pontosPatente', p); sincronizarPerfil(); }

// determina a patente atual pelos pontos totais
function patenteAtual() {
  const p = getPontos();
  let atual = PATENTES[0];
  for (const pat of PATENTES) {
    if (p >= pontosParaAtingir(pat.i)) atual = pat;
    else break;
  }
  return atual;
}
function proximaPatente() {
  const at = patenteAtual();
  return at.i < PATENTES.length ? PATENTES[at.i] : null;   // null = já no topo
}
// progresso até a próxima patente (0 a 1)
function progressoAtePro() {
  const at   = patenteAtual();
  const prox = proximaPatente();
  if (!prox) return 1;
  const base = pontosParaAtingir(at.i);
  const alvo = pontosParaAtingir(prox.i);
  const p    = getPontos();
  return Math.max(0, Math.min(1, (p - base) / (alvo - base)));
}
function pedrasConquistadas() {
  // conquistou uma pedra ao SAIR da patente que ela decora → i.e., a pedra da patente N vira sua ao chegar em N+1
  // MAS pra dar vitória imediata, a gente dá a pedra JÁ ao chegar na patente (é o troféu de ter subido)
  // então: pedras conquistadas = todas as patentes cujo índice <= patenteAtual().i
  const at = patenteAtual();
  return PATENTES.filter(p => p.i <= at.i);
}

// ─── ADICIONAR PONTOS (chamado pelas ações do app) ─────────────
// retorna { subiu:true, novaPatente:{...} } se subiu, senão { subiu:false }
function ganharPontos(motivo, chaveDedup) {
  const pts = PONTOS_ACAO[motivo];
  if (!pts) return { subiu: false };
  // dedup por dia+motivo pra não ganhar 2x pela mesma ação no dia
  if (chaveDedup) {
    const usados = lerLS('pontosGanhosDedup', {});
    if (usados[chaveDedup]) return { subiu: false };
    usados[chaveDedup] = true;
    salvarLS('pontosGanhosDedup', usados);
  }
  const antes = patenteAtual();
  setPontos(getPontos() + pts);
  const depois = patenteAtual();
  if (depois.i > antes.i) return { subiu: true, novaPatente: depois };
  return { subiu: false };
}

// ─── SVG BONITO DA PEDRA (facetada, brilhante) ─────────────────
function svgPedra(corA, corB, tamanho) {
  const t = tamanho || 44;
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  return `<svg viewBox="0 0 100 100" width="${t}" height="${t}" style="display:block;">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${corA}"/>
        <stop offset="1" stop-color="${corB}"/>
      </linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".85"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <!-- corpo facetado da pedra (formato diamante hexagonal) -->
    <polygon points="50,8 82,32 72,88 28,88 18,32" fill="url(#${id})" stroke="#ffffff33" stroke-width="1"/>
    <!-- facetas de sombra -->
    <polygon points="50,8 82,32 65,45 50,8" fill="#00000022"/>
    <polygon points="18,32 35,45 28,88 18,32" fill="#00000033"/>
    <polygon points="50,8 35,45 65,45 50,8" fill="#ffffff22"/>
    <!-- brilho principal (highlight) -->
    <polygon points="50,15 68,32 55,42 42,42 32,32" fill="url(#${id}h)" opacity=".55"/>
    <!-- ponto de luz -->
    <ellipse cx="42" cy="24" rx="6" ry="3" fill="#ffffff" opacity=".7"/>
  </svg>`;
}
function svgPedraCinza(tamanho) {
  const t = tamanho || 44;
  return `<svg viewBox="0 0 100 100" width="${t}" height="${t}" style="display:block;opacity:.3">
    <polygon points="50,8 82,32 72,88 28,88 18,32" fill="none" stroke="#93A1B0" stroke-width="1.5" stroke-dasharray="3 3"/>
  </svg>`;
}


// ═══════════════════════════════════════════════════════════════
//  O CARAMELO (lobo-guará) — mascote que cresce com as patentes
//  5 fases × 3 patentes cada. Só sobe, nunca volta.
// ═══════════════════════════════════════════════════════════════

// qual fase do bicho pra cada patente (1-15)
const CARAMELO_FASES = {
  filhote:  { wrap:[0.58,150,308], head:[1.32,150,124,0,26], body:[0.78,0.80,150,258], itens:[],                                       glow:false },
  jovem:    { wrap:[0.77,150,308], head:[1.13,150,124,0,12], body:[0.90,0.92,150,258], itens:['bone'],                                 glow:false },
  adulto:   { wrap:[0.96,150,308], head:[1.00,150,124,0,0],  body:[1.00,1.00,150,258], itens:['bone','cachecol'],                      glow:false },
  veterano: { wrap:[1.09,150,308], head:[0.99,150,124,0,-3], body:[1.06,1.03,150,258], itens:['touca','oculos','cachecol'],            glow:false },
  lenda:    { wrap:[1.22,150,308], head:[1.00,150,124,0,-6], body:[1.09,1.06,150,258], itens:['capacete','oculos','cachecol','medalha'],glow:true  }
};
const ORDEM_FASES = ['filhote','jovem','adulto','veterano','lenda'];
const NOME_FASE = { filhote:'Filhote', jovem:'Jovem', adulto:'Adulto', veterano:'Veterano', lenda:'Lenda' };
// o que ele ganha ao crescer (aparece na celebração)
const GANHOU_NA_FASE = { filhote:'', jovem:'boné', adulto:'cachecol', veterano:'touca e óculos', lenda:'capacete e medalha' };

// patente (1-15) → fase do bicho. Nível 1→filhote, 2→jovem, ... 5→lenda
function faseDaPatente(i) {
  const pat = PATENTES.find(p => p.i === i) || PATENTES[0];
  return ORDEM_FASES[pat.nivel - 1] || 'filhote';
}
function faseAtualDoCaramelo() { return faseDaPatente(patenteAtual().i); }

// ─── expressões ───
const CARAMELO_EXPR = {
  normal: `<g class="crm-olhos">
      <ellipse cx="126" cy="113" rx="10.5" ry="11.5" fill="#fff"/><ellipse cx="174" cy="113" rx="10.5" ry="11.5" fill="#fff"/>
      <circle cx="127.5" cy="115" r="5.6" fill="#1b1b1b"/><circle cx="175.5" cy="115" r="5.6" fill="#1b1b1b"/>
      <circle cx="129.6" cy="112.6" r="1.9" fill="#fff"/><circle cx="177.6" cy="112.6" r="1.9" fill="#fff"/></g>
    <path d="M116 107 q10 -5 20 0" stroke="var(--coat-lo)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M164 107 q10 -5 20 0" stroke="var(--coat-lo)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M140 168 q10 6 20 0" stroke="var(--nose)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  feliz: `<path d="M114 112 q12 -14 24 0" stroke="#1b1b1b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M162 112 q12 -14 24 0" stroke="#1b1b1b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M132 166 q18 18 36 0" stroke="var(--nose)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M133 168 q17 15 34 0 z" fill="#d0596a" opacity=".55"/>
    <circle cx="112" cy="128" r="7" fill="#ff6b6b" opacity=".28"/><circle cx="188" cy="128" r="7" fill="#ff6b6b" opacity=".28"/>`,
  dormindo: `<path d="M116 114 q10 8 20 0" stroke="#1b1b1b" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M164 114 q10 8 20 0" stroke="#1b1b1b" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M141 168 q9 5 18 0" stroke="var(--nose)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
};

// ─── acessórios (empilham conforme a fase) ───
const CARAMELO_ACS = {
  bone: `<path d="M120 80 q30 -20 60 0 q-2 -38 -30 -38 q-28 0 -30 38 z" fill="#2f6fdb"/>
    <path d="M150 42 q28 0 30 38 q-16 -9 -30 -9 q-14 0 -30 9 q2 -38 30 -38 z" fill="#3a7ce6"/>
    <path d="M150 42 q14 0 22 12 M150 42 q-14 0 -22 12" stroke="#245ec0" stroke-width="2" fill="none"/>
    <path d="M118 80 q34 14 64 0 q6 12 -8 18 q-26 8 -48 0 q-14 -6 -8 -18 z" fill="#245ec0"/>
    <ellipse cx="150" cy="43" rx="4" ry="4" fill="#245ec0"/>`,
  cachecol: `<path d="M110 184 q40 32 80 0 l5 20 q-45 32 -90 0 z" fill="#c0453f"/>
    <path d="M110 184 q40 32 80 0" stroke="#9c332e" stroke-width="3" fill="none"/>
    <path d="M150 206 q15 5 22 3 l2 32 q-14 5 -25 0 z" fill="#c0453f"/>
    <path d="M171 209 l2 32 q-7 2 -12 1 l-2 -30 z" fill="#9c332e"/>
    <g stroke="#7f2823" stroke-width="2.6" stroke-linecap="round">
      <line x1="151" y1="240" x2="151" y2="250"/><line x1="159" y1="240" x2="159" y2="250"/><line x1="167" y1="239" x2="167" y2="249"/></g>`,
  touca: `<path d="M104 96 q-9 34 6 52 q15 -2 17 -19 q-15 -14 -23 -33 z" fill="#4a3120"/>
    <path d="M196 96 q9 34 -6 52 q-15 -2 -17 -19 q15 -14 23 -33 z" fill="#4a3120"/>
    <path d="M150 38 q47 2 51 47 q2 20 -9 31 l-84 0 q-11 -11 -9 -31 q4 -45 51 -47 z" fill="#5a3d28"/>
    <path d="M108 94 q42 15 84 0 q1 11 -8 17 q-34 12 -68 0 q-9 -6 -8 -17 z" fill="#4a3120"/>
    <path d="M150 41 q41 4 45 43" stroke="#7a5537" stroke-width="2" fill="none" stroke-dasharray="3 3"/>
    <rect x="110" y="150" width="11" height="8" rx="2" fill="#caa15f"/>
    <rect x="179" y="150" width="11" height="8" rx="2" fill="#caa15f"/>`,
  capacete: `<path d="M150 30 q47 3 47 47 q0 8 -3 15 q-44 -15 -88 0 q-3 -7 -3 -15 q0 -44 47 -47 z" fill="#2b333d"/>
    <path d="M110 60 q40 -11 80 0" stroke="var(--signal)" stroke-width="6" fill="none"/>
    <path d="M126 44 q18 -9 36 -3" stroke="#5a6b7d" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M104 84 q46 14 92 0 q3 9 -6 14 q-40 12 -80 0 q-9 -5 -6 -14 z" fill="#171d24"/>
    <path d="M118 100 q-5 16 4 26" stroke="#3a4a5a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M182 100 q5 16 -4 26" stroke="#3a4a5a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  oculos: `<path d="M103 105 q47 -15 94 0" stroke="#241d17" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M141 112 q9 -4 18 0" stroke="#6b4f30" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="126" cy="112" r="17.5" fill="#12202a" stroke="#7a5a34" stroke-width="4.5"/>
    <circle cx="126" cy="112" r="13" fill="#a9d8e8"/>
    <path d="M117 108 l11 -7 M119 118 l15 -10" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
    <circle cx="174" cy="112" r="17.5" fill="#12202a" stroke="#7a5a34" stroke-width="4.5"/>
    <circle cx="174" cy="112" r="13" fill="#a9d8e8"/>
    <path d="M165 108 l11 -7 M167 118 l15 -10" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>`,
  medalha: `<path d="M140 186 l7 28 M160 186 l-7 28" stroke="var(--info)" stroke-width="7" stroke-linecap="round"/>
    <circle cx="150" cy="230" r="16" fill="var(--signal)" stroke="#c98a1a" stroke-width="2.5"/>
    <circle cx="150" cy="230" r="11" fill="#ffce5c"/>
    <path d="M150 221 l2.6 5.6 6.1 .8 -4.5 4.2 1.1 6.1 -5.3 -3 -5.3 3 1.1 -6.1 -4.5 -4.2 6.1 -.8 z" fill="#8a5a12"/>`
};

// ─── partes fixas ───
const _CRM_BANQUINHO = `
  <path d="M122 296 l-18 44" stroke="#5e3d22" stroke-width="10" stroke-linecap="round"/>
  <path d="M178 296 l18 44" stroke="#5e3d22" stroke-width="10" stroke-linecap="round"/>
  <path d="M150 300 l0 44" stroke="#4d3018" stroke-width="10" stroke-linecap="round"/>
  <path d="M104 326 q46 12 92 0" stroke="#4d3018" stroke-width="6" fill="none" stroke-linecap="round"/>
  <ellipse cx="150" cy="298" rx="66" ry="17" fill="#6f4a2b"/>
  <ellipse cx="150" cy="293" rx="66" ry="15" fill="#8a5f36"/>
  <ellipse cx="150" cy="290" rx="58" ry="11" fill="#9c6d40"/>`;

// rabo em grupo próprio pra poder abanar sozinho (gira na base, onde encosta no corpo)
const _CRM_RABO = `<g class="crm-rabo">
  <path d="M62 250 q-40 6 -46 -34 q-4 -26 16 -34 q10 18 34 22 q18 16 -4 46 z" fill="var(--coat-lo)"/>
  <path d="M30 186 q-12 -6 -14 12 q-2 20 12 24 q-8 -18 2 -36 z" fill="var(--cream)"/></g>`;

const _CRM_CORPO = `
  <rect x="110" y="228" width="17" height="86" rx="8" fill="var(--leg)"/>
  <rect x="173" y="228" width="17" height="86" rx="8" fill="var(--leg)"/>
  <ellipse cx="118" cy="316" rx="14" ry="8" fill="var(--leg)"/>
  <ellipse cx="182" cy="316" rx="14" ry="8" fill="var(--leg)"/>
  <path d="M150 168 q58 0 66 60 q4 34 -18 46 q-48 16 -96 0 q-22 -12 -18 -46 q8 -60 66 -60 z" fill="var(--coat)"/>
  <path d="M150 196 q20 0 24 34 q3 24 -24 30 q-27 -6 -24 -30 q4 -34 24 -34 z" fill="var(--cream)"/>
  <path d="M150 150 q26 0 30 40 q-14 -16 -30 -16 q-16 0 -30 16 q4 -40 30 -40 z" fill="var(--mane)"/>`;

const _CRM_CABECA = `
  <g class="crm-orelha"><path d="M112 92 q-14 -54 6 -70 q22 8 30 44 z" fill="var(--coat)"/>
    <path d="M116 84 q-8 -38 6 -52 q13 8 18 34 z" fill="var(--ear)"/></g>
  <g class="crm-orelha"><path d="M188 92 q14 -54 -6 -70 q-22 8 -30 44 z" fill="var(--coat)"/>
    <path d="M184 84 q8 -38 -6 -52 q-13 8 -18 34 z" fill="var(--ear)"/></g>
  <path d="M150 58 q46 0 52 44 q4 34 -22 52 q-30 18 -60 0 q-26 -18 -22 -52 q6 -44 52 -44 z" fill="var(--coat)"/>
  <path d="M150 60 q30 0 36 26 q-18 -8 -36 -8 q-18 0 -36 8 q6 -26 36 -26 z" fill="var(--mane)"/>
  <path d="M150 120 q19 0 20 24 q1 20 -20 26 q-22 -6 -20 -26 q1 -24 20 -24 z" fill="var(--belly)"/>
  <ellipse cx="150" cy="150" rx="10" ry="7.5" fill="var(--nose)"/>
  <path d="M150 158 v13" stroke="var(--nose)" stroke-width="2.6" stroke-linecap="round"/>`;

// helpers de transformação (escala a partir de um ponto)
function _crmT(s, cx, cy, tx, ty) {
  return `translate(${tx||0} ${ty||0}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
}
function _crmT2(sx, sy, cx, cy) {
  return `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;
}

/**
 * Desenha o Caramelo.
 * @param fase 'filhote'|'jovem'|'adulto'|'veterano'|'lenda'
 * @param expr 'normal'|'feliz'|'dormindo'
 * @param tamanho largura em px (padrão 200)
 * @param comBanquinho false pra tirar o banquinho (ex: saindo do presente)
 */
function svgCaramelo(fase, expr, tamanho, comBanquinho) {
  const S  = CARAMELO_FASES[fase] || CARAMELO_FASES.filhote;
  const ex = CARAMELO_EXPR[expr] ? expr : 'feliz';
  const t  = tamanho || 200;
  const id = 'crm' + Math.random().toString(36).slice(2, 7);
  const glow = S.glow ? '<ellipse cx="150" cy="150" rx="142" ry="152" fill="var(--signal)" opacity=".10"/>' : '';
  const banq = (comBanquinho === false) ? '' : _CRM_BANQUINHO;
  const acs  = S.itens.map(k => CARAMELO_ACS[k] || '').join('');
  return `<svg viewBox="0 -12 300 364" width="${t}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <defs><radialGradient id="${id}" cx="50%" cy="34%" r="72%">
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity=".22"/>
    </radialGradient></defs>
    ${glow}${banq}
    <g transform="${_crmT(S.wrap[0], S.wrap[1], S.wrap[2])}">
      <g class="crm-resp">
        <g transform="${_crmT2(S.body[0], S.body[1], S.body[2], S.body[3])}">
          ${_CRM_RABO}${_CRM_CORPO}
          <ellipse cx="150" cy="240" rx="70" ry="66" fill="url(#${id})"/>
        </g>
        <g transform="${_crmT(S.head[0], S.head[1], S.head[2], S.head[3], S.head[4])}">
          ${_CRM_CABECA}
          <ellipse cx="150" cy="104" rx="56" ry="58" fill="url(#${id})"/>
          ${CARAMELO_EXPR[ex]}${acs}
        </g>
      </g>
    </g>
  </svg>`;
}


// ═══════════════════════════════════════════════════════════════
//  CADERNO DIGITAL — script.js  (redesign v2)
//  Novidades: ganho/hora automático, custo REAL/km, meta do dia,
//  reserva que cresce, nav com 6 abas (Docs de volta), export CSV.
// ═══════════════════════════════════════════════════════════════

// ─── HELPERS GERAIS ──────────────────────────────────────────
function getPerfil() { return lerLS('perfilUsuario', {}); }
function hojeISO()   { return isoLocal(new Date()); }   // relógio LOCAL (nada de UTC virando o dia às 21h)

// aviso deslizante (feedback ao salvar)
let _toastTimer = null;
function toast(msg, tipo) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (tipo === 'erro' ? ' erro' : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'toast' + (tipo === 'erro' ? ' erro' : ''); }, 2200);
}

function dataHojeSimp() {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return s.replace(/\./g, '').trim().toLowerCase();
}
function combustívelHoje() {
  const hist = lerLS('historicoAbastecimentos', []);
  const iso = hojeISO(), fmt = dataHojeSimp();
  // registros novos têm dataISO (com ano); antigos caem no formato curto
  return hist.filter(r => r.dataISO ? r.dataISO === iso : (r.data || '').replace(/\./g, '').trim().toLowerCase() === fmt)
             .reduce((s, r) => s + r.valor, 0);
}
// km rodado hoje = odômetro de hoje menos o anterior
function kmRodadoHoje() {
  const rh = lerLS('registroHoje', null);
  const ra = lerLS('registroAnterior', null);
  if (!rh || !ra) return null;                              // 1º registro: não há de onde tirar
  if ((rh.vid || null) !== (ra.vid || null)) return null;   // veículos diferentes: não se subtrai
  const d = rh.km - ra.km;
  return d >= 0 ? d : null;                                 // painel pra trás: não sei, e não chuto
}
function registrosHojeFin() {
  const hist = lerLS('historicoFinancas', []);
  return hist.filter(r => r.dataISO === hojeISO());
}
function lucroHojeVal()   { return registrosHojeFin().reduce((s, r) => s + r.lucro, 0); }
function horasHojeVal()   { const h = lerLS('horasPorDia', {}); return h[hojeISO()] || 0; }

// ─── DE QUE DIA É ESTE FECHAMENTO ────────────────────────────
// ⚠️ Tudo no fecha-turno era carimbado com hojeISO() — o dia do RELÓGIO na hora
// de encerrar. Quem começa 23:58 e fecha 00:20 tinha o turno inteiro lançado no
// dia seguinte: o dia trabalhado ficava sem registro nenhum, o streak zerava
// sem o motorista ter falhado, e a reserva e as horas iam pro dia errado.
// Motorista de app roda de madrugada — isso não é caso raro.
// Agora o turno pertence ao dia em que COMEÇOU. Sem turno aberto (situação de
// borda), cai no dia de hoje, como era antes.
function diaDoTurno() {
  const ta = lerLS('turnoAtivo', null);
  if (ta && ta.inicio) {
    const d = new Date(ta.inicio);
    if (!isNaN(d)) return isoLocal(d);
  }
  return hojeISO();
}
// streak zera se o motorista pulou mais de 1 dia (regra: streak zera, o resto não)
function verificarStreak() {
  const ultimo = localStorage.getItem('streakUltimoDia');
  if (!ultimo) return;
  if (ultimo !== hojeISO() && ultimo !== ontemISO() && streak > 0) {
    streak = 0;
    salvarLS('streak', 0);
  }
}
// migração única: zera o pontosGanhosDedup UMA vez (guardada por flag).
// o bug antigo de fuso gravava chaves "já pontuei hoje" com data errada,
// que ficaram envenenadas e travavam pontos legítimos. isto solta elas.
// não mexe em pontosPatente — só na trava de dedup.
function migracaoDedupV2() {
  if (localStorage.getItem('migracaoDedupV2')) return;   // já rodou uma vez
  localStorage.removeItem('pontosGanhosDedup');
  salvarLS('migracaoDedupV2', '1');
}
// remove chaves de dedup de pontos com mais de 60 dias (senão cresce pra sempre)
function limparDedupAntigo() {
  const usados = lerLS('pontosGanhosDedup', {});
  const limite = new Date(); limite.setDate(limite.getDate() - 60);
  const limiteISO = isoLocal(limite);
  let mudou = false;
  Object.keys(usados).forEach(k => {
    const iso = k.split(':')[1];
    if (iso && iso < limiteISO) { delete usados[k]; mudou = true; }
  });
  if (mudou) salvarLS('pontosGanhosDedup', usados);
}

// ═══════════════════════════════════════════════════════════════
//  VEÍCULOS — cada veículo tem o SEU caderninho de km
//  ─────────────────────────────────────────────────────────────
//  Regra de ouro: só se subtrai leitura de painel do MESMO veículo.
//  Trocou de moto? Alugou um carro? O app NUNCA mistura os dois:
//  ele prefere dizer "ainda não sei" a inventar um km.
//  Isso mata de uma vez: km do 1º dia (mostrava o odômetro inteiro),
//  troca de veículo (travava o app) e a média de custo/km quimera
//  (gasolina de carro dividida por km de moto).
// ═══════════════════════════════════════════════════════════════
const RESERVA_MANUT_PADRAO = { moto: 0.12, carro: 0.15 };

// Salto de odômetro acima disso num turno: o app LEVANTA A MÃO e
// pergunta. Ele nunca afirma nada com esse número, nunca mostra ele
// na tela e nunca o usa em conta — é só o ponto onde "trocou de
// veículo" ou "digitou errado" é mais provável do que "rodei isso".
const KM_SALTO_SUSPEITO = 800;

function novoVid() { return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function lerVeiculos()      { const v = lerLS('veiculos', []); return Array.isArray(v) ? v : []; }
function salvarVeiculos(vs) { salvarLS('veiculos', vs); }
// ATENÇÃO: veiculoAtivo é uma string pura. Não usar lerLS/salvarLS aqui —
// salvarLS grava string sem aspas e lerLS faz JSON.parse, que engasga e
// devolve null. Guardamos e lemos direto, como o streak já faz.
function vidAtivo()         { try { return localStorage.getItem('veiculoAtivo') || null; } catch (e) { return null; } }
function setVidAtivo(id)    { try { localStorage.setItem('veiculoAtivo', id); } catch (e) {} }
function veiculoPorId(id)   { return lerVeiculos().find(v => v.id === id) || null; }
function veiculoAtivo()     { return veiculoPorId(vidAtivo()); }
function tipoVeiculoAtivo() { const v = veiculoAtivo(); return (v && v.tipo) || getPerfil().veiculo || 'moto'; }
function iconeDoTipo(t)     { return ico(t === 'carro' ? 'carro' : 'moto'); }
function fmtKm(n)           { return Number(n || 0).toLocaleString('pt-BR'); }

// ═══════════════════════════════════════════════════════════════
//  ÍCONES SVG — o desenho é NOSSO, não da fonte do aparelho
// ═══════════════════════════════════════════════════════════════
// Cada Android desenha o emoji com a fonte dele: a bomba do Samsung não é a do
// Motorola, e o print da Play Store sai de UM aparelho só. Aqui todo mundo vê
// igual, e o ícone herda a cor de quem está por perto (currentColor).
// Régua do projeto: SVG onde é INFORMAÇÃO, emoji onde é EMOÇÃO —
// Caramelo, Isaac, 🔥 streak, 🏆 recorde, 🎁 presente e as pedras continuam emoji.
// ⚠️ ico() devolve HTML: só serve em innerHTML/template. Em .textContent o
// motorista veria a tag escrita na tela. Onde o texto SAI do app (toast, PDF,
// CSV, compartilhar no WhatsApp) o emoji CONTINUA — lá SVG não existe.
function ico(nome, classe) {
  return '<svg class="ico' + (classe ? ' ' + classe : '') + '" aria-hidden="true"><use href="#i-' + nome + '"></use></svg>';
}
// semáforo: era 🟢🟡🔴 (emoji), virou bolinha CSS — mesma cor em todo aparelho
function dot(cor) { return '<span class="dot dot-' + cor + '"></span>'; }
function nomeVeiculo(v) {
  if (!v) return 'seu veículo';
  return v.modelo || (v.tipo === 'carro' ? 'seu carro' : 'sua moto');
}
// última leitura do painel DO VEÍCULO ATIVO (null = nunca registrou)
function ultimoOdoAtivo() { const v = veiculoAtivo(); return (v && v.odo != null) ? v.odo : null; }

// reserva de manutenção por km: propriedade do VEÍCULO, não do perfil.
// (antes ficava congelada no cadastro: se cadastrou de moto e foi
//  rodar de carro, o app seguia cobrando R$ 0,12 em vez de R$ 0,15)
function reservaKmAtual() {
  const v = veiculoAtivo();
  if (v && v.reservaManutKm != null) return v.reservaManutKm;
  const p = getPerfil();
  if (p.reservaManutKm != null) return p.reservaManutKm;
  return RESERVA_MANUT_PADRAO[p.veiculo === 'carro' ? 'carro' : 'moto'];
}
function criarVeiculo(tipo, modelo, placa, odo) {
  const t = tipo === 'carro' ? 'carro' : 'moto';
  const v = {
    id: novoVid(), tipo: t,
    modelo: String(modelo || '').trim(),
    placa:  String(placa  || '').trim().toUpperCase(),
    reservaManutKm: RESERVA_MANUT_PADRAO[t],
    odo: (odo != null ? odo : null),
    desde: hojeISO(), ate: null
  };
  const vs = lerVeiculos(); vs.push(v); salvarVeiculos(vs);
  sincronizarVeiculo(v);   // veiculo novo precisa existir na nuvem tambem
  return v;
}
function setOdoVeiculo(vid, km) {
  const vs = lerVeiculos(); const v = vs.find(x => x.id === vid);
  if (v) { v.odo = km; salvarVeiculos(vs); sincronizarVeiculo(v); }
}
// O veiculo (e principalmente o ODOMETRO) so ia pra nuvem na subida em massa,
// que roda UMA vez na vida. Depois disso o odometro mudava a cada turno e a
// nuvem nunca ficava sabendo: quem trocava de aparelho recebia o odometro do
// dia da primeira migracao — ou vazio. Pior: veiculo adicionado depois nunca
// subia, e os abastecimentos dele voltavam apontando pra um veiculo que nao
// existe na nuvem.
// O PERFIL (nome, meta, reserva diaria, taxa, e tambem reserva acumulada,
// streak e pontos de patente) so subia na migracao em massa, que roda uma vez
// na vida. Resultado: dois aparelhos do mesmo motorista com meta, reserva e
// patente diferentes, e nada reconciliando. Agora sobe sozinho a cada mudanca.
// Espera 1,2s antes de enviar porque fechar o dia mexe em varias coisas de uma
// vez (streak + reserva + patente) — sem isso seriam 3 envios seguidos.
let _perfilSyncTimer = null;
function sincronizarPerfil() {
  if (typeof salvarRegistroHibrido !== 'function') return;
  clearTimeout(_perfilSyncTimer);
  _perfilSyncTimer = setTimeout(function () {
    const p = getPerfil();
    if (!p || !p.nome) return;                    // ainda no cadastro: nada a subir
    salvarRegistroHibrido('perfil', {
      nome:              p.nome        || '',
      veiculo_tipo:      p.veiculo     || 'moto',
      modelo:            p.modelo      || '',
      placa:             p.placa       || '',
      taxa:              (p.taxa != null && p.taxa > 0) ? p.taxa : null,
      meta:              p.metaDiaria  || 250,
      reserva_diaria:    p.reservaDia  || 20,
      plataformas:       p.plataformas || [],
      reserva_acumulada: lerLS('reservaAcumulada', 0),
      streak:            lerLS('streak', 0),
      pontos_patente:    lerLS('pontosPatente', 0)
    }, 'usuario_id').catch(function () {});
  }, 1200);
}
function sincronizarVeiculo(v) {
  if (!v || !v.id || typeof salvarRegistroHibrido !== 'function') return;
  salvarRegistroHibrido('veiculos', {
    id: v.id, tipo: v.tipo || 'moto',
    modelo: v.modelo || '', placa: v.placa || '',
    odo: (v.odo != null ? v.odo : null),
    reserva_manut_km: (v.reservaManutKm != null ? v.reservaManutKm : null),
    desde: v.desde || null, ate: v.ate || null
  }, 'id').catch(function () {});
}
// procura, entre os OUTROS veículos, um cujo painel bate com o número digitado
function veiculoQueBateCom(valor) {
  const at = vidAtivo();
  return lerVeiculos().find(v =>
    v.id !== at && v.odo != null && valor >= v.odo && (valor - v.odo) <= KM_SALTO_SUSPEITO
  ) || null;
}
// km rodados por dia (fonte única — gravado ao encerrar o dia)
// Devolve o km rodado NAQUELE dia. Se o registro cobre vários dias, devolve
// null: o app sabe o total do período, não o de cada dia — e não chuta.
function kmDoDia(iso)  {
  const m = lerLS('kmPorDia', {}); const r = m[iso];
  if (!r || r.km == null) return null;
  return ((r.dias || 1) === 1) ? r.km : null;
}
// Quantos dias o registro daquela data cobre (1 = normal).
function diasDoRegistro(iso) {
  const m = lerLS('kmPorDia', {}); const r = m[iso];
  return (r && r.dias) ? r.dias : 1;
}
function maiorKmDia()  {
  const m = lerLS('kmPorDia', {});
  const vals = Object.values(m).map(r => (r && r.km) || 0).filter(k => k > 0);
  return vals.length ? Math.max.apply(null, vals) : null;
}

// ─── MIGRAÇÃO ────────────────────────────────────────────────
// Roda 1x. Só ADICIONA: não apaga, não sobrescreve, não reescreve
// histórico. Rodar duas vezes não faz mal.
function migrarVeiculos() {
  if (lerVeiculos().length > 0 && vidAtivo()) return;
  const p = getPerfil();
  if (!p || !p.nome) return;                       // ainda no cadastro
  const tipo = p.veiculo === 'carro' ? 'carro' : 'moto';
  const v = {
    id: novoVid(), tipo,
    modelo: p.modelo || '', placa: p.placa || '',
    reservaManutKm: (p.reservaManutKm != null) ? p.reservaManutKm : RESERVA_MANUT_PADRAO[tipo],
    odo: null, desde: null, ate: null
  };
  const rh = lerLS('registroHoje', null);
  if (rh) { v.odo = rh.km; rh.vid = v.id; salvarLS('registroHoje', rh); }
  const ra = lerLS('registroAnterior', null);
  if (ra) { ra.vid = v.id; salvarLS('registroAnterior', ra); }
  salvarVeiculos([v]);
  setVidAtivo(v.id);

  // carimba o histórico existente como sendo do veículo 1
  const ab = lerLS('historicoAbastecimentos', []);
  let mAb = false;
  ab.forEach(r => { if (!r.vid) { r.vid = v.id; mAb = true; } });
  if (mAb) salvarLS('historicoAbastecimentos', ab);

  const fin = lerLS('historicoFinancas', []);
  let mFin = false;
  fin.forEach(r => {
    if (!r.vid) { r.vid = v.id; mFin = true; }
    // o antigo "kmHoje" guardava o ODÔMETRO, não o km do dia (era o bug).
    // vira 'odo'. O km rodado daqueles dias é desconhecido — e o app não inventa.
    if (r.odo   === undefined) { r.odo   = (r.kmHoje != null) ? r.kmHoje : null; mFin = true; }
    if (r.kmDia === undefined) { r.kmDia = null; mFin = true; }
  });
  if (mFin) salvarLS('historicoFinancas', fin);

  // manutenção passa a ser por veículo (o que existe hoje é do veículo 1)
  if (!lerLS('manutPorVeiculo', null)) {
    const mp = {}; mp[v.id] = lerLS('manutencaoDados', {});
    salvarLS('manutPorVeiculo', mp);
  }
}

// ─── ESTADO ──────────────────────────────────────────────────
let kmAtual         = 0;
let streak          = Number(localStorage.getItem('streak')) || 0;
let turnoIniciado   = false;
let dragging        = false;
let startX          = 0;
let currentX        = 0;
let pontoA          = null;
let pontoB          = null;
let kmTurnoAtual    = 0;
let _abastDoTurno   = false;   // formulario aberto pelo fecha-turno? (muda o que acontece ao salvar)
let _pediuLogin     = false;   // já pedimos login neste uso do app? (1x por sessão)
let tipoSelecionadoTela = 'Gasolina';
let tipoReceita     = 'liquido';
let iconeVeiculo    = '';   // preenchido por iconeDoTipo() quando o app sobe
let veiculoSel      = 'moto';
let platsSel        = ['Uber'];

// ─── CADASTRO ────────────────────────────────────────────────
function cadIrPara(n) {
  document.querySelectorAll('.cad-step').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.step-dot').forEach(d => d.classList.remove('on'));
  document.getElementById('cadStep' + n).classList.add('on');
  document.getElementById('dot' + n).classList.add('on');
}
function selecionarVeiculo(tipo) {
  veiculoSel = tipo;
  document.getElementById('btnMoto').classList.toggle('on', tipo === 'moto');
  document.getElementById('btnCarro').classList.toggle('on', tipo === 'carro');
  document.getElementById('cadModelo').placeholder = tipo === 'moto' ? 'Ex: Honda CG 160' : 'Ex: Fiat Uno';
}
function togglePlat(plat, el) {
  if (platsSel.includes(plat)) {
    if (platsSel.length === 1) return;
    platsSel = platsSel.filter(p => p !== plat);
    el.classList.remove('on');
  } else {
    platsSel.push(plat);
    el.classList.add('on');
  }
  document.getElementById('platsSel').innerHTML = platsSel.length === 1
    ? ico('check') + ' ' + esc(platsSel[0]) + ' selecionado'
    : ico('check') + ' ' + esc(platsSel.join(' + ')) + ' selecionados';
}
function toggleSenha() {
  const inp = document.getElementById('cadSenha');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
// validação bonita por etapa (nada de alerta cinza)
function mostrarCadErro(id, msg) {
  const e = document.getElementById(id);
  e.textContent = msg; e.style.display = 'block';
}
function validarStep1() {
  const nome  = document.getElementById('cadNome').value.trim();
  const email = document.getElementById('cadEmail').value.trim();
  const senha = document.getElementById('cadSenha').value.trim();
  if (!nome)                      return mostrarCadErro('cadErro1', 'Informe seu nome pra começar.');
  if (!email || !email.includes('@')) return mostrarCadErro('cadErro1', 'Coloque um e-mail válido.');
  if (!senha || senha.length < 6) return mostrarCadErro('cadErro1', 'A senha precisa de pelo menos 6 caracteres.');
  document.getElementById('cadErro1').style.display = 'none';
  cadIrPara(2);
}
function validarStep2() {
  const modelo = document.getElementById('cadModelo').value.trim();
  if (!modelo) return mostrarCadErro('cadErro2', veiculoSel === 'carro' ? 'Informe o modelo do seu carro.' : 'Informe o modelo da sua moto.');
  document.getElementById('cadErro2').style.display = 'none';
  cadIrPara(3);
}
// deixa "gustavo silva" / "GUSTAVO" / "gUsTaVo" sempre como "Gustavo Silva"
function arrumarNome(txt) {
  if (!txt) return txt;
  const min = ['de','da','do','das','dos','e'];
  return String(txt).trim().toLowerCase().split(/\s+/).map(function (w, i) {
    if (i > 0 && min.indexOf(w) !== -1) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}
function finalizarCadastro() {
  const perfil = {
    nome:   arrumarNome(document.getElementById('cadNome').value),
    email:  document.getElementById('cadEmail').value.trim(),
    senha:  document.getElementById('cadSenha').value.trim(),
    veiculo: veiculoSel,
    modelo: document.getElementById('cadModelo').value.trim(),
    placa:  document.getElementById('cadPlaca').value.trim().toUpperCase(),
    plataformas: platsSel, taxa: null,   // sem chute: só existe se o usuário informar (ou o app aprender)
    metaDiaria: 250,
    reservaDia: 20,
    reservaManutKm: veiculoSel === 'carro' ? 0.15 : 0.12,
    reservaObjetivo: 0
  };
  salvarLS('perfilUsuario', perfil);
  // veículo 1 nasce aqui, com o que o cadastro já perguntou. Zero campo novo.
  salvarVeiculos([]);
  const v1 = criarVeiculo(perfil.veiculo, perfil.modelo, perfil.placa, null);
  setVidAtivo(v1.id);
  document.getElementById('telaCadastro').style.display = 'none';
  // guia agora e PUXADO pelo botao de ajuda (?), nao empurrado no cadastro
  // salvarLS('guiaPendente', true);
  iniciarApp(perfil);
  abrirPresenteCaramelo(perfil.nome.split(' ')[0]);   // ganha o filhote de boas-vindas

  // Supabase (Fatia 1): cria a conta em paralelo. Se falhar por falta de
  // internet, o cadastro local já está feito e a fila sincroniza depois —
  // o app não trava esperando a nuvem. MAS se o e-mail já tiver conta, isso
  // precisa ser dito: senão o motorista acha que está na nuvem e não está,
  // e só descobre quando perder o celular (o pior momento possível).
  salvarLS('contaCriada', true);   // marca que este motorista TEM conta (usado pra exigir login depois)
  if (typeof sbCadastrar === 'function' && perfil.email && perfil.senha) {
    sbCadastrar(perfil.email, perfil.senha).then(function (r) {
      if (r.ok && r.usuario && typeof migrarMotoristaAntigo === 'function') {
        migrarMotoristaAntigo(r.usuario.id);
      } else if (r.jaExiste) {
        avisarEmailJaCadastrado();
      }
    }).catch(function () {});
  }
}

// Esse e-mail já tem conta na nuvem. Em vez de deixar o motorista achando
// que sincronizou, mostra o caminho certo: entrar com a senha que ele já tem.
function avisarEmailJaCadastrado() {
  pedirConfirmacao(
    '📧 Esse e-mail já tem conta',
    'Você já se cadastrou antes com esse e-mail. O que você registrou hoje está salvo aqui, mas é preciso entrar na sua conta para continuar salvando as suas alterações. Quer entrar agora?',
    function () { abrirLoginExistente(); }
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN (Supabase — Fatia 1)
//  Só existe pra um caso: motorista que já tem conta e trocou de
//  celular/navegador (o localStorage local está vazio). Depois de
//  entrar, puxa os dados da nuvem e abre o app normalmente.
//  Nunca aparece pra quem já tem perfilUsuario local — esse caminho
//  continua 100% o mesmo de sempre, sem tocar no Supabase na hora.
// ═══════════════════════════════════════════════════════════════
function toggleNovaSenha() {
  const inp = document.getElementById('novaSenhaInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
document.getElementById('btnSalvarNovaSenha').addEventListener('click', async function () {
  const btn   = this;
  const senha = document.getElementById('novaSenhaInput').value.trim();
  const erro  = document.getElementById('novaSenhaErro');
  if (senha.length < 6) { erro.textContent = 'A senha precisa ter no mínimo 6 caracteres.'; erro.style.display = 'block'; return; }
  if (typeof sbTrocarSenha !== 'function') { erro.textContent = 'Sem conexão agora. Tente de novo em instantes.'; erro.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Salvando...';
  const r = await sbTrocarSenha(senha);
  btn.disabled = false; btn.textContent = 'Salvar senha';
  if (r.ok) {
    document.getElementById('modalNovaSenha').style.display = 'none';
    _pediuLogin = false;
    toast('✅ Senha alterada! Você já está conectado.');
  } else {
    erro.textContent = 'Não consegui salvar. O link pode ter expirado — peça um novo.';
    erro.style.display = 'block';
  }
});

// Quando o motorista volta do link do e-mail, o Supabase avisa por este
// evento. É a deixa para pedir a senha nova.
function tratarRecuperacaoSenha(evento) {
  if (evento === 'PASSWORD_RECOVERY') {
    document.getElementById('modalNovaSenha').style.display = 'flex';
  }
}

function abrirLoginExistente(emailSugerido) {
  const p = lerLS('perfilUsuario', null);
  // O app já sabe o e-mail do motorista: não faz sentido obrigar a digitar
  // de novo. Ele só precisa da senha.
  document.getElementById('loginEmail').value = emailSugerido || (p && p.email) || '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('loginErro').style.display = 'none';
  // por padrão escondido: só a tela TRAVADA (pós-sair) oferece recomeçar
  const bc = document.getElementById('btnCriarConta'); if (bc) bc.style.display = 'none';
  document.getElementById('modalLogin').style.display = 'flex';
}
document.getElementById('btnFecharLogin').addEventListener('click', function () {
  document.getElementById('modalLogin').style.display = 'none';
});
// ⚠️ Sair da conta trancava o motorista numa tela sem NENHUMA saída: sem X,
// sem cancelar e sem cadastro. Quem emprestou o aparelho, quem digitou o e-mail
// errado no cadastro ou quem simplesmente quis recomeçar ficava preso — e a
// única saída era desinstalar o app. Quem chega aqui SEMPRE teve conta (o botão
// Sair só existe logado), então o histórico dele está na nuvem: limpar este
// aparelho é seguro, desde que o app diga isso com todas as letras.
document.getElementById('btnCriarConta').addEventListener('click', function () {
  pedirConfirmacao(
    ico('alerta') + ' Começar com outra conta',
    'A conta que você usava continua guardada na nuvem: nada dela se perde, e você volta '
    + 'quando quiser entrando com o e-mail e a senha dela aqui em cima. '
    + 'Mas este aparelho vai ser limpo pra começar do zero — turno, abastecimentos e '
    + 'documentos saem daqui da tela. Quer continuar?',
    function () {
      try { localStorage.clear(); } catch (e) {}
      location.reload();
    });
});
document.getElementById('btnEsqueciSenha').addEventListener('click', async function () {
  const btn   = this;
  const email = document.getElementById('loginEmail').value.trim();
  const erro  = document.getElementById('loginErro');
  if (!email) { erro.textContent = 'Escreva seu e-mail acima primeiro.'; erro.style.display = 'block'; return; }
  if (typeof sbRecuperarSenha !== 'function') { erro.textContent = 'Sem conexão agora. Tente de novo em instantes.'; erro.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Enviando...';
  const r = await sbRecuperarSenha(email);
  btn.disabled = false; btn.textContent = 'Esqueci minha senha';
  if (r.ok) {
    // Sucesso NÃO usa a caixa de erro: texto verde dentro de caixa vermelha
    // se contradiz e faz parecer que deu errado.
    erro.style.display = 'none';
    // ⚠️ O texto era "Enviei um e-mail para você criar uma senha nova" — uma
    // afirmação que o app NÃO tem como garantir. Por segurança, o Supabase
    // responde "ok" mesmo quando não existe conta com aquele e-mail (senão
    // qualquer um descobriria quem usa o app testando endereços). Resultado:
    // quem digitava um e-mail errado ficava esperando pra sempre uma mensagem
    // que nunca foi mandada. A forma condicional é honesta e continua segura.
    toast('📧 Se existir conta com esse e-mail, o link já está a caminho');
  } else {
    erro.textContent = r.limite
      ? 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
      : 'Não consegui enviar agora. Confira o e-mail e tente de novo.';
    erro.style.display = 'block';
  }
});
function toggleSenhaLogin() {
  const inp = document.getElementById('loginSenha');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}
document.getElementById('btnCancelarLogin').addEventListener('click', function () {
  document.getElementById('modalLogin').style.display = 'none';
});
document.getElementById('btnConfirmarLogin').addEventListener('click', async function () {
  const btn   = this;
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();
  const erro  = document.getElementById('loginErro');
  if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha.'; erro.style.display = 'block'; return; }
  if (typeof sbEntrar !== 'function') { erro.textContent = 'Sem conexão agora. Tente de novo em instantes.'; erro.style.display = 'block'; return; }
  erro.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Entrando...';
  const r = await sbEntrar(email, senha);
  if (!r.ok) {
    btn.disabled = false; btn.textContent = 'Entrar';
    erro.textContent = 'E-mail ou senha incorretos.'; erro.style.display = 'block';
    return;
  }
  btn.textContent = 'Puxando seus dados...';
  salvarLS('contaCriada', true);   // entrou: daqui pra frente o app sabe que existe conta
  const perfilLocal = lerLS('perfilUsuario', null);
  const temDadosAqui = !!(perfilLocal && perfilLocal.nome);

  if (temDadosAqui) {
    // ⚠️ Caso do motorista que JÁ usa o app e só agora conectou a conta.
    // Aqui NÃO se puxa nada da nuvem: o aparelho é a fonte da verdade, e
    // sobrescrever apagaria o que ele registrou hoje. Sobe o que está aqui
    // e destrava a fila que ficou esperando sessão.
    if (typeof migrarMotoristaAntigo === 'function') await migrarMotoristaAntigo(r.usuario.id);
    if (typeof sincronizarFilaOffline === 'function') await sincronizarFilaOffline();
    btn.disabled = false; btn.textContent = 'Entrar';
    document.getElementById('modalLogin').style.display = 'none';
    localStorage.removeItem('saiuDaConta');
    destravarDaTelaDeLogin();          // devolve o app se ele tinha saído da conta
    toast('✅ Pronto! Suas alterações estão sendo salvas.');
    return;
  }

  // Aparelho zerado (trocou de celular / limpou o navegador): puxa da nuvem.
  let restaurou = { ok: false };
  if (typeof restaurarDoSupabase === 'function') {
    restaurou = await restaurarDoSupabase(r.usuario.id);
  }
  btn.disabled = false; btn.textContent = 'Entrar';
  document.getElementById('modalLogin').style.display = 'none';
  const perfil = lerLS('perfilUsuario', null);
  if (restaurou.ok && perfil && perfil.nome) {
    toast('✅ Tudo certo! Seus dados voltaram.');
    document.getElementById('telaCadastro').style.display = 'none';
    iniciarApp(perfil);
  } else {
    // logou certinho, mas essa conta ainda não tem nada salvo na nuvem
    // (ex: criou a conta e nunca chegou a migrar). Não trava o motorista.
    erro.textContent = 'Entrou certinho, mas essa conta ainda não tem dados salvos.';
    erro.style.display = 'block';
  }
});

// ═══════════════════════════════════════════════════════════════
//  PRESENTE DE BOAS-VINDAS: o cara ganha o Caramelo filhote
//  (é aqui e não na "subida pra patente 1" porque o usuário JÁ
//   nasce na patente 1 — a celebração nunca dispararia pra ela)
// ═══════════════════════════════════════════════════════════════
function svgCaixaPresente() {
  return `<svg width="150" viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible;">
    <defs><linearGradient id="crmBox" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".14"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".18"/>
    </linearGradient></defs>
    <rect x="30" y="78" width="100" height="78" rx="8" fill="#7a4fd6"/>
    <rect x="30" y="78" width="100" height="78" rx="8" fill="url(#crmBox)"/>
    <rect x="70" y="78" width="20" height="78" fill="var(--signal)"/>
    <g class="crm-tampa">
      <rect x="22" y="56" width="116" height="30" rx="7" fill="var(--purple)"/>
      <rect x="70" y="56" width="20" height="30" fill="var(--signal)"/>
      <path d="M80 56 q-30 -34 -34 -8 q-3 18 34 8 z" fill="var(--signal)"/>
      <path d="M80 56 q30 -34 34 -8 q3 18 -34 8 z" fill="var(--signal)"/>
      <circle cx="80" cy="54" r="9" fill="#ffce5c"/>
    </g>
  </svg>`;
}
function _crmConfetes() {
  const cores = ['var(--signal)', 'var(--money)', 'var(--purple)', 'var(--info)', '#ffce5c'];
  let s = '';
  for (let i = 0; i < 26; i++) {
    const dx = (Math.random() * 300 - 150).toFixed(0);
    const dy = (-Math.random() * 160 - 30).toFixed(0);
    s += `<span style="background:${cores[i % cores.length]};--dx:${dx}px;--dy:${dy}px"></span>`;
  }
  return s;
}
function abrirPresenteCaramelo(primeiroNome) {
  const ov = document.getElementById('modalPresente');
  if (!ov) return;
  document.getElementById('presenteTitulo').textContent = 'Bem-vindo, ' + primeiroNome + '!';
  document.getElementById('presenteSub').textContent    = 'Tem um presente te esperando.';
  document.getElementById('presenteConf').innerHTML     = _crmConfetes();
  document.getElementById('presenteCaixa').innerHTML    = svgCaixaPresente();
  document.getElementById('presenteBicho').innerHTML    = svgCaramelo('filhote', 'feliz', 175, false);
  const _pn = document.getElementById('presenteNome'); if (_pn) _pn.textContent = 'Esse é ' + ARTIGO_ASSISTENTE + ' ' + NOME_ASSISTENTE;
  // volta ao estado fechado
  const caixa = document.getElementById('presenteCaixa');
  caixa.className = 'crm-caixa balanca';
  document.getElementById('presenteConf').className  = 'crm-conf';
  document.getElementById('presenteBicho').className = 'crm-bicho';
  document.getElementById('presenteDepois').style.display = 'none';
  document.getElementById('presenteDica').style.display   = 'block';
  ov.style.display = 'flex';
}
function revelarCaramelo() {
  const caixa = document.getElementById('presenteCaixa');
  if (!caixa || caixa.classList.contains('abrindo')) return;   // trava: só abre uma vez
  caixa.classList.remove('balanca');
  caixa.classList.add('abrindo');
  document.getElementById('presenteConf').classList.add('solta');
  const bicho = document.getElementById('presenteBicho');
  bicho.classList.add('entra', 'crm-festa');       // sai pulando de alegria
  document.getElementById('presenteDica').style.display = 'none';
  setTimeout(() => {
    const d = document.getElementById('presenteDepois');
    if (d) d.style.display = 'block';
  }, 900);
  setTimeout(() => {                                // depois assenta no modo calmo
    bicho.classList.remove('crm-festa');
    bicho.classList.add('crm-vivo');
  }, 2200);
}
function fecharPresenteCaramelo() {
  const ov = document.getElementById('modalPresente');
  if (ov) ov.style.display = 'none';
  // ⚠️ O tutorial entra DEPOIS do presente, nunca junto: dois modais na cara
  // ao mesmo tempo é o jeito mais rápido de fazer o motorista fechar os dois.
  // E só na primeira vez da vida — quem já viu não vê de novo.
  if (!tutorialJaViu()) setTimeout(abrirTutorial, 450);
}

// ─── INÍCIO DO APP ───────────────────────────────────────────
function atualizarRotulosMes() {
  const d = new Date();
  const rotulo = MESES_PT[d.getMonth()] + ' ' + d.getFullYear();
  const a = document.getElementById('combSubMes');
  const b = document.getElementById('finSubMes');
  if (a) a.textContent = rotulo;
  if (b) b.textContent = rotulo;
}

function iniciarApp(perfil) {
  // Backfill: se o perfil é antigo e não tem os campos novos, cria com padrão
  let mudou = false;
  if (perfil.metaDiaria     === undefined) { perfil.metaDiaria = 250; mudou = true; }
  if (perfil.reservaDia     === undefined) { perfil.reservaDia = 20;  mudou = true; }
  if (perfil.reservaManutKm === undefined) { perfil.reservaManutKm = perfil.veiculo === 'carro' ? 0.15 : 0.12; mudou = true; }
  if (perfil.reservaObjetivo === undefined) { perfil.reservaObjetivo = 0; mudou = true; }
  if (mudou) salvarLS('perfilUsuario', perfil);
  migrarVeiculos();   // 1x: cria o veículo 1 e carimba o histórico existente

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('headerSaudacao').textContent = saudacao + ' ' + arrumarNome(perfil.nome.split(' ')[0]) + ' 👋';
  document.getElementById('telaInicio').style.display   = 'block';
  document.getElementById('navInferior').style.display  = 'flex';
  aplicarVeiculoNaTela();   // header, ícone, manutenção e odômetro do veículo ATIVO
  atualizarRotulosMes();  // rótulo de mês dinâmico (corrige 'Junho 2025' chumbado)
  migrarIdsAbastecimento();  // garante id em lançamentos antigos (pra apagar/editar)
  repararAbastecimentosRestaurados();   // conserta o que voltou da nuvem sem vid/ppl
  ordenarHistoricos();                  // "o mais recente" tem que ser mesmo o mais recente
  reconciliarFinancas();                // o livro tem que fechar: receita − custos = lucro

  // NOVO: se tinha um turno rodando quando fechou o app, restaura o estado
  const ta = lerLS('turnoAtivo', null);
  if (ta && ta.inicio) {
    const horasAberto = (Date.now() - ta.inicio) / 3600000;
    if (horasAberto > 20) {
      // turno esquecido ligado — encerra sem creditar horas (não inventamos trabalho)
      localStorage.removeItem('turnoAtivo');
      setTimeout(() => toast('⏱️ Encerrei um dia esquecido aberto — as horas dele não contaram'), 800);
    } else {
      turnoIniciado = true;
      sliderContainer.classList.add('finalizar');
      sliderTexto.innerHTML = ico('parar') + '  Encerrar o dia ' + ico('seta-dir');
      mostrarTurnoLive();
    }
  }

  verificarStreak();       // streak zera se pulou dias (mas nada mais retrocede)
  migracaoDedupV2();       // solta as chaves de dedup envenenadas pelo bug de fuso (1x)
  limparDedupAntigo();     // faxina nas chaves de pontos com +60 dias
  initDashboard();
  // guia de boas-vindas: só uma vez, logo após o cadastro
  if (lerLS('guiaPendente', false) === true) {
    localStorage.removeItem('guiaPendente');
    setTimeout(() => {
      // não abre por cima de outro modal (ex: o cara já foi registrar km)
      const algumAberto = Array.from(document.querySelectorAll('.modal-overlay'))
        .some(m => m.id !== 'modalGuia' && getComputedStyle(m).display !== 'none');
      if (!algumAberto) abrirGuia('inicio');
    }, 900);   // deixa o presente do filhote acontecer antes
  }
}

window.addEventListener('DOMContentLoaded', function () {
  // 1ª trava do modo demonstração: só entra por ?demo=1 na URL. Não existe
  // botão em lugar nenhum — motorista não cai aqui sem querer.
  if (/[?&]demo=1(&|$)/.test(location.search) && !emDemo()) { entrarNaDemo(); return; }
  pintarTarjaDemo();
  // ?semear=1 — planta os lançamentos na conta REAL (só depois do app subir,
  // porque precisa do veículo ativo e da sessão do Supabase carregados)
  if (/[?&]semear=1(&|$)/.test(location.search)) setTimeout(semearNaConta, 1400);
  // ?premium=1 / ?premium=0 — chave de teste do portão, só pra conta do dono.
  // Gated de propósito: sem isto, bastava um motorista colar a URL pra liberar.
  const mp = location.search.match(/[?&]premium=([01])(&|$)/);
  if (mp) setTimeout(function () {
    if (!souODono()) { toast('Isso não está disponível nesta conta', 'erro'); return; }
    salvarLS('premiumAtivo', mp[1] === '1');
    toast(mp[1] === '1' ? 'Premium ligado (teste)' : 'Premium desligado (teste)');
    setTimeout(function () { location.replace(location.pathname); }, 900);
  }, 1500);
  const perfil = lerLS('perfilUsuario', null);
  if (perfil && perfil.nome) iniciarApp(perfil);
  else {
    document.getElementById('telaCadastro').style.display = 'block';
    renderCarameloCadastro();
  }

  // Supabase (Fatia 1): inicia em paralelo — se estiver offline ou o CDN falhar,
  // o app segue 100% funcional local (é só a nuvem que fica pra depois).
  if (typeof inicializarSupabase === 'function') {
    inicializarSupabase(function (evento, usuario) {
      if (evento === 'SIGNED_IN' && usuario && typeof migrarMotoristaAntigo === 'function') {
        migrarMotoristaAntigo(usuario.id);
      }
      tratarRecuperacaoSenha(evento);
    }).then(function () {
      // Saiu da conta e fechou o app? Volta travado na tela de login (opção A).
      // Exceção: offline — sem internet não há como entrar, e travar deixaria
      // o motorista sem o app justamente quando ele mais precisa dele.
      if (lerLS('saiuDaConta', false) && navigator.onLine
          && typeof usuarioLogado === 'function' && !usuarioLogado()) {
        travarNaTelaDeLogin();
      }
    }).catch(function (e) { console.warn('[Copiloto] Supabase indisponível agora:', e); });
  }
});

// ─── SELETORES ───────────────────────────────────────────────
const modal            = document.querySelector('#modalKm');
const btnCancelar      = document.querySelector('#btnCancelar');
const btnConfirmar     = document.querySelector('#btnConfirmar');
const inputKm          = document.querySelector('#inputKm');
const custoPorKmValor  = document.querySelector('#custoPorKmValor');
const custoRealSub     = document.querySelector('#custoRealSub');
const custoKmStrip     = document.querySelector('#custoKmStrip');
const ganhoHoraValor   = document.querySelector('#ganhoHoraValor');
const metaBarra        = document.querySelector('#metaBarra');
const metaFalta        = document.querySelector('#metaFalta');
const metaPct          = document.querySelector('#metaPct');
const metaValorTexto   = document.querySelector('#metaValorTexto');
const reservaValor     = document.querySelector('#reservaValor');
const reservaSub       = document.querySelector('#reservaSub');
const odometroTotal    = document.querySelector('#odometroTotal');
const telaInicio       = document.querySelector('#telaInicio');
const telaManutencao   = document.querySelector('#telaManutencao');
const telaCombustivel  = document.querySelector('#telaCombustivel');
const telaFinancas     = document.querySelector('#telaFinancas');
const telaDocumentos   = document.querySelector('#telaDocumentos');
const telaCade         = document.querySelector('#telaCade');
const navInicio        = document.querySelector('#navInicio');
const navManutencao    = document.querySelector('#navManutencao');
const navCombustivel   = document.querySelector('#navCombustivel');
const navFinancas      = document.querySelector('#navFinancas');
const navDocumentos    = document.querySelector('#navDocumentos');
const navCade          = document.querySelector('#navCade');
const streakDisplay    = document.querySelector('#streakDisplay');
const sliderContainer  = document.querySelector('#sliderContainer');
const sliderThumb      = document.querySelector('#sliderThumb');
const sliderTexto      = document.querySelector('#sliderTexto');
const modalStreak      = document.querySelector('#modalStreak');
const modalStreakNum   = document.querySelector('#modalStreakNum');
const modalStreakData  = document.querySelector('#modalStreakData');
const modalStreakInfo  = document.querySelector('#modalStreakInfo');
const modalStreakBtn   = document.querySelector('#modalStreakBtn');
const kmRef            = document.querySelector('#kmRef');
const kmGps            = document.querySelector('#kmGps');
const kmGpsVal         = document.querySelector('#kmGpsVal');
const kmVivo           = document.querySelector('#kmVivo');
const kmErro           = document.querySelector('#kmErro');
const modalCombustivel = document.querySelector('#modalCombustivel');
const etapaAbasteceu   = document.querySelector('#etapaAbasteceu');
const btnSimAbasteceu  = document.querySelector('#btnSimAbasteceu');
const btnNaoAbasteceu  = document.querySelector('#btnNaoAbasteceu');
const btnRegistrarReceita = document.querySelector('#btnRegistrarReceita');
const modalReceita        = document.querySelector('#modalReceita');
const btnCancelarReceita  = document.querySelector('#btnCancelarReceita');
const btnConfirmarReceita = document.querySelector('#btnConfirmarReceita');
const inputReceita        = document.querySelector('#inputReceita');

// ═══════════════════════════════════════════════════════════════
//  INSTRUMENTOS DO PAINEL (velocímetro, odômetro, tanque, luzes)
// ═══════════════════════════════════════════════════════════════
// velocímetro do lucro: ponteiro e arco seguem lucro ÷ meta (0 a 100%)
function renderGaugeLucro(lucro, meta, temReceita) {
  const arc = document.getElementById('gaugeArc');
  const pon = document.getElementById('gaugePonteiro');
  if (!arc || !pon) return;
  const L = 345.6;
  let frac = 0;
  if (temReceita && meta > 0 && lucro > 0) frac = Math.max(0, Math.min(1, lucro / meta));
  arc.style.strokeDashoffset = String(L * (1 - frac));
  pon.style.transformOrigin = '135px 135px';
  pon.style.transform = 'rotate(' + (-90 + 180 * frac) + 'deg)';
  // estado vazio: some com o ponteiro (senão fica deitado atravessando o texto)
  pon.style.display = temReceita ? '' : 'none';
  const mt = document.getElementById('gaugeMetaTxt');
  if (mt) mt.textContent = 'meta ' + meta;
}
// odômetro rolante: 6 dígitos que giram até o km atual
function renderOdometro() {
  const box = document.getElementById('odoDigitos');
  if (!box) return;
  if (!box.dataset.pronto) {
    // monta uma vez: 6 colunas, cada uma com 0-9 empilhados
    let h = '';
    for (let i = 0; i < 6; i++) {
      h += '<span class="odo-dig' + (i === 5 ? ' last' : '') + '"><span class="odo-roll">' +
           '0123456789'.split('').map(d => '<span>' + d + '</span>').join('') + '</span></span>';
    }
    h += '<span class="odo-unit">km</span>';
    box.innerHTML = h;
    box.dataset.pronto = '1';
  }
  const km = Math.max(0, Math.min(999999, Math.round(kmAtual)));
  const s = String(km).padStart(6, '0');
  box.querySelectorAll('.odo-roll').forEach((col, i) => {
    col.style.transform = 'translateY(-' + (Number(s[i]) * 10) + '%)';
  });
}
// tanque do mês (mini): gasto de combustível vs. o normal dos meses anteriores
function renderTanqueDash() {
  const arc = document.getElementById('tqArc');
  if (!arc) return;
  const hist = lerLS('historicoAbastecimentos', []);
  const ymAtual = hojeISO().slice(0, 7);
  const porMes = {};
  hist.forEach(r => { const ym = (r.dataISO || '').slice(0, 7); if (ym) porMes[ym] = (porMes[ym] || 0) + r.valor; });
  const gasto = porMes[ymAtual] || 0;
  const antigos = Object.keys(porMes).filter(k => k !== ymAtual);
  const normal = antigos.length ? antigos.reduce((s, k) => s + porMes[k], 0) / antigos.length : null;
  document.getElementById('tqValor').textContent = fmtBRL0(gasto);
  const sub = document.getElementById('tqSub');
  let frac = 0;
  if (normal && normal > 0) {
    frac = Math.max(0, Math.min(1, gasto / normal));
    sub.textContent = 'seu normal: ~' + fmtBRL0(normal) + '/mês';
    arc.style.stroke = frac >= 0.9 ? 'var(--danger)' : 'var(--signal)';
  } else {
    sub.textContent = 'aprendendo seu normal';
    arc.style.stroke = 'var(--signal)';
  }
  arc.style.strokeDashoffset = String(144.5 * (1 - frac));
  const ag = document.getElementById('tqAgulha');
  ag.style.transformOrigin = '55px 52px';
  ag.style.transform = 'rotate(' + (-90 + 180 * frac) + 'deg)';
}
// tanque GRANDE (tela Combustível): mesmo dado do mini, em formato de tanque de vidro
// que enche com o gasto do mês vs. a média dos meses anteriores.
function renderTanqueGrande() {
  const liq = document.getElementById('tqgLiquido');
  if (!liq) return;                       // tela não montada ainda
  const wave   = document.getElementById('tqgWave');
  const elVal  = document.getElementById('tqgValor');
  const elNor  = document.getElementById('tqgNormal');
  const elPill = document.getElementById('tqgPill');
  const elAviso= document.getElementById('tqgAviso');
  const perfil = getPerfil();
  const hist   = lerLS('historicoAbastecimentos', []);
  const ymAtual = hojeISO().slice(0, 7);
  const porMes = {};
  hist.forEach(r => { const ym = (r.dataISO || '').slice(0, 7); if (ym) porMes[ym] = (porMes[ym] || 0) + r.valor; });
  const gasto   = porMes[ymAtual] || 0;
  const antigos = Object.keys(porMes).filter(k => k !== ymAtual);
  const normal  = antigos.length ? antigos.reduce((s, k) => s + porMes[k], 0) / antigos.length : null;
  const H = 126;   // curso do líquido (px do viewBox) — bate com o clip do SVG

  elVal.textContent = fmtBRL0(gasto);

  if (normal && normal > 0) {
    const frac = Math.max(0, Math.min(1, gasto / normal));
    const cor  = frac >= 0.9 ? 'var(--danger)' : 'var(--signal)';
    wave.setAttribute('fill', cor);
    liq.setAttribute('transform', 'translate(0,' + (H * (1 - frac)).toFixed(1) + ')');
    elVal.style.color = cor;
    elNor.innerHTML = 'de <b>~' + fmtBRL0(normal) + '</b> do seu gasto normal por mês';
    const pct = Math.round(frac * 100);
    if (frac >= 0.9)        { elPill.className = 'tanque-pill verm';  elPill.innerHTML = dot('vermelho') + ' quase no seu limite'; }
    else if (frac >= 0.75)  { elPill.className = 'tanque-pill amar';  elPill.innerHTML = dot('laranja') + ' chegando perto · ' + pct + '%'; }
    else                    { elPill.className = 'tanque-pill verde'; elPill.innerHTML = dot('verde') + ' dentro do normal · ' + pct + '%'; }
  } else {
    // sem mês anterior: nível decorativo neutro, SEM inventar porcentagem
    wave.setAttribute('fill', 'var(--faint)');
    liq.setAttribute('transform', 'translate(0,' + (H * 0.62).toFixed(1) + ')');   // ~38% só de enfeite
    elVal.style.color = 'var(--signal)';
    elNor.textContent = 'aprendendo seu normal — sem mês anterior pra comparar ainda';
    elPill.className = 'tanque-pill neutro';
    elPill.innerHTML = dot('amarelo') + ' aprendendo';
  }
  // moto ou carro do perfil (mesmo padrão do ícone do slider)
  const veic = perfil.veiculo === 'carro' ? 'do seu carro' : 'da sua moto';
  elAviso.innerHTML = ico('alerta') + ' não é o tanque ' + veic + ' — é o seu <b>bolso</b>: soma do que você pagou nos postos este mês';
}
// ⚠️ AQUI MORAVA UM SEGUNDO CONJUNTO DE ÍCONES (LUZ_SVG), com SVGs escritos à
// mão só pra este painel. Resultado: o mesmo item aparecia com desenho
// DIFERENTE em duas telas — galão de óleo no Início, gota na Manutenção. É a
// mesma armadilha das duas telas de abastecimento (v3.46) e da regra do km
// furado (v3.53): regra copiada é regra que diverge. Agora existe UM conjunto
// (o sprite do index.html) e as duas telas leem MNT_ICONES.


// desenha o "+X km hoje" do odômetro. Quando o app NÃO SABE quantos km
// foram (1º registro, veículo novo), ele diz isso — não mostra um número.
function pintarKmHoje() {
  const el = document.getElementById('odoHoje');
  if (!el) return;
  const kmD = kmRodadoHoje();
  if (kmD !== null) {
    el.innerHTML = '+<span class="num" id="kmHojeValor">' + fmtKm(kmD) + ' km</span> hoje';
    return;
  }
  const rh = lerLS('registroHoje', null);
  const ra = lerLS('registroAnterior', null);
  let msg;
  if (!rh)                                     msg = 'registre o km do painel';
  else if (!ra)                                msg = 'primeiro registro · a conta começa amanhã';
  else if ((rh.vid || null) !== (ra.vid || null)) msg = 'veículo novo · a conta começa amanhã';
  else                                         msg = 'sem km hoje';
  el.innerHTML = '<span class="odo-nd">' + msg + '</span>';
}

// ═══════════════════════════════════════════════════════════════
//  GUIA — "o que cada parte do app faz"
//  ─────────────────────────────────────────────────────────────
//  Aparece 1x depois do cadastro e mora pra sempre no botão de ajuda
//  (o ? no topo). O Isaac na fase LENDA explica, do lado.
//
//  ►► PRA ADICIONAR UMA ROTINA NOVA: acrescente um item aqui. Ele
//     aparece sozinho na tela inicial E no botão de ajuda. Não mexa
//     em mais nada.
// ═══════════════════════════════════════════════════════════════
const GUIA_ROTINAS = [
  { ic: ico('alvo'), cor: 'var(--signal)', tit: 'Lucro de hoje', hero: '300 → 190',
    isaac: 'Entrar dinheiro não é ganhar dinheiro. A plataforma tira a parte dela e a gasolina come o resto. Eu te mostro quanto sobrou mesmo no seu bolso.',
    fonte: 'eu monto sozinho — você só diz quanto entrou' },
  { ic: ico('bomba'), cor: 'var(--signal)', tit: 'Custo real por km', hero: 'além da gasolina',
    isaac: 'A gasolina é só parte da conta. O desgaste do carro é o custo que ninguém soma. Eu junto tudo e te mostro seu gasto real.',
    fonte: 'o app calcula do seu combustível, sem digitação' },
  { ic: '🐷', cor: 'var(--money)', tit: 'Cofrinho', hero: 'a conta sempre volta',
    isaac: 'O carro quebra quando você menos espera. Sem reserva, vira dívida. Eu separo um pouco a cada dia pra você estar preparado.',
    fonte: 'o app guarda o tanto que você escolher, por dia' },
  { ic: ico('chave'), cor: 'var(--signal)', tit: 'Manutenção', hero: 'dia perdido',
    isaac: 'Corrente arrebentada no meio da corrida é dia perdido, guincho e conta dobrada. Trocar na hora é barato; quebrar na rua é caro e humilhante. Eu grito ANTES do prejuízo, não depois.',
    fonte: 'eu conto os km e te aviso na hora certa' },
  { ic: ico('doc'), cor: 'var(--info)', tit: 'Documentos', hero: 'a pé',
    isaac: 'CNH vencida não é multazinha: é gravíssima, 7 pontos, e o risco de ficar a pé — sem seu ganha-pão. A blitz não avisa. Eu aviso, com folga pra resolver sem correria.',
    fonte: 'guarda as datas — eu cutuco antes de vencer' },
  { ic: ico('calc'), cor: 'var(--info)', tit: 'Vale a pena rodar?', hero: 'antes de ligar',
    isaac: 'Sair sem saber quanto PRECISA fazer é rodar no escuro e rezar. Me diz suas horas e sua meta — eu te falo na lata quanto o dia exige por hora, e se dá ou não dá. Sem falso otimismo.',
    fonte: 'eu calculo com o SEU custo de combustível real' },
  { ic: ico('sobe'), cor: 'var(--money)', tit: 'Projeção do mês', hero: 'onde você vai parar',
    isaac: 'No dia 10 você não sabe como o mês fecha — e no dia 30 leva susto. Eu pego o SEU ritmo e projeto o fechamento antes. Não é chute: quanto mais roda, mais certeira fica.',
    fonte: 'estimo do seu próprio histórico — nunca invento' },
  { ic: ico('buraco'), cor: 'var(--danger)', tit: 'Onde seu dinheiro some', hero: 'o buraco invisível',
    isaac: 'A maioria dos motoristas gasta bem mais do que imagina — e nem percebe pra onde vai. Não é azar, é conta que ninguém faz. Eu faço a SUA: te mostro quanto o dia realmente custou, sem susto no fim do mês.',
    fonte: 'eu somo o que você nem vê — do seu próprio dado' },
  { ic: ico('relogio'), cor: 'var(--signal)', tit: 'Trabalha de graça?', hero: 'a parte que não pagam',
    isaac: 'Boa parte do que entra vai embora em taxa e desgaste — e tem hora do dia que você roda só pra empatar. Eu separo o que é ganho do que é só custo, pra você saber quando vale seguir e quando é hora de parar.',
    fonte: 'eu mostro o seu ganho real por hora' },
  { ic: '🐺', cor: 'var(--purple)', tit: 'Eu, o Isaac', hero: 'a real',
    isaac: 'Todo mundo tem palpite sobre o seu dinheiro. Ninguém nunca olhou os SEUS números. Eu olho, todo dia, e falo a verdade sem passar a mão na cabeça. Foi fraco? Eu digo. Sempre comparado com o SEU normal, nunca com chute.',
    fonte: 'eu leio seus números e falo — de graça' },
];

// ►► SUPORTE — TROQUE PELOS SEUS CONTATOS (Gustavo):
const SUPORTE_EMAIL    = 'app.copilotosup@gmail.com';     // seu email
// WhatsApp em standby ate comprar o chip. Poe o numero (55+DDD) que o botao volta.
const SUPORTE_WHATSAPP = '';
// Instagram em standby ate criar o perfil. Poe so o @ (sem arroba) que o botao aparece.
const SUPORTE_INSTAGRAM = '';

// ⚠️ A lista do guia é const porque explica o PRODUTO. O card do piso é o
// único que carrega um número do motorista — por isso é montado na hora de
// abrir, e entra na frente: é a régua de decisão, não uma explicação.
function rotinasDoGuia() {
  const piso = cardDoPiso();
  return piso ? [piso].concat(GUIA_ROTINAS) : GUIA_ROTINAS;
}
function _cardRotina(r) {
  return '<div class="guia-card" style="--acc:' + r.cor + '">' +
    '<div class="guia-card-topo">' +
      '<span class="guia-card-ic">' + r.ic + '</span>' +
      '<span class="guia-card-tit">' + esc(r.tit) + '</span>' +
      '<span class="guia-card-hero">' + esc(r.hero) + '</span>' +
    '</div>' +
    '<p class="guia-card-fala">' + esc(r.isaac) + '</p>' +
    '<div class="guia-card-fonte">' +
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
      esc(r.fonte) +
    '</div>' +
    (r.piso ? blocoTabelaPiso(r.piso) : '') +
    '</div>';
}

// abre o guia. origem 'ajuda' mostra o botão de suporte no rodapé.
let _guiaIdx = 0;
function abrirGuia(origem) {
  const nome = (getPerfil().nome || '').split(' ')[0] || 'motorista';
  const lobo = document.getElementById('guiaLobo');
  if (lobo) lobo.innerHTML = svgCaramelo('lenda', 'feliz', 92, false);
  document.getElementById('guiaFala').innerHTML =
    'Voc\u00ea acha que est\u00e1 ganhando dinheiro. Mas talvez s\u00f3 esteja <b>pagando para trabalhar</b>. ' +
    'Esses cards mostram quanto realmente sobra. Deslize.';
  _guiaIdx = 0;
  _guiaRender();
  document.getElementById('guiaSuporte').style.display = (origem === 'ajuda') ? 'block' : 'none';
  document.getElementById('guiaBtn').textContent = (origem === 'ajuda') ? 'Fechar' : 'T\u00f4 dentro';
  document.getElementById('modalGuia').style.display = 'flex';
  document.getElementById('modalGuia').scrollTop = 0;
}
function _guiaRender() {
  const _rot = rotinasDoGuia();
  const total = _rot.length;
  const bolinhas = _rot.map(function (_, i) {
    return '<span class="guia-dot' + (i === _guiaIdx ? ' on' : '') + '"></span>';
  }).join('');
  document.getElementById('guiaLista').innerHTML =
    _cardRotina(_rot[_guiaIdx]) +
    '<div class="guia-nav">' +
      '<button class="guia-seta" onclick="_guiaVai(-1)" aria-label="Anterior"' + (_guiaIdx === 0 ? ' disabled' : '') + '>&#8249;</button>' +
      '<div class="guia-dots">' + bolinhas + '</div>' +
      '<button class="guia-seta" onclick="_guiaVai(1)" aria-label="Pr\u00f3ximo"' + (_guiaIdx === total - 1 ? ' disabled' : '') + '>&#8250;</button>' +
    '</div>';
}
function _guiaVai(d) {
  const n = _guiaIdx + d;
  if (n < 0 || n >= rotinasDoGuia().length) return;
  _guiaIdx = n;
  _guiaRender();
}
function fecharGuia() { document.getElementById('modalGuia').style.display = 'none'; }

function abrirSuporte() {
  const assunto = encodeURIComponent('Ajuda no Copiloto');
  const corpo   = encodeURIComponent('Oi, preciso de ajuda com:');
  const wapp    = 'https://wa.me/' + SUPORTE_WHATSAPP + '?text=' + encodeURIComponent('Oi, preciso de ajuda no Copiloto');
  const mail    = 'mailto:' + SUPORTE_EMAIL + '?subject=' + assunto + '&body=' + corpo;
  const bw = document.getElementById('supWhats');
  if (SUPORTE_WHATSAPP) { bw.href = wapp; bw.style.display=''; } else { bw.style.display='none'; }
  document.getElementById('supMail').href  = mail;
  document.getElementById('modalSuporte').style.display = 'flex';
}
function fecharSuporte() { document.getElementById('modalSuporte').style.display = 'none'; }

// ─── DASHBOARD ───────────────────────────────────────────────
function initDashboard() {
  const vAt = veiculoAtivo();
  kmAtual = (vAt && vAt.odo != null) ? vAt.odo : 0;
  pintarKmHoje();
  odometroTotal.innerHTML = ico('estrada') + ' ' + esc(kmAtual) + ' km no total';
  streakDisplay.textContent = '🔥 ' + streak;

  // garante que o lucro de hoje reflete o combustível já lançado
  ressincronizarReceitaHoje();
  atualizarBannerLucro();     // banner de lucro do dia
  renderOdometro();           // dígitos rolantes do km total
  renderTanqueDash();         // tanque de gasto do mês

  atualizarResumoDia();       // ganho/hora + meta
  atualizarCustoRealKm();     // custo real por km
  atualizarReserva();         // reserva acumulada
  atualizarTodosAlertas();
  atualizarTelaManutencao();
  atualizarTelaCombustivel();
  atualizarDocumentosDashboard();
  renderPatCard();
}

// NOVO: ganho por hora (automático) + progresso da meta
function atualizarResumoDia() {
  const perfil  = getPerfil();
  const lucro   = lucroHojeVal();
  const horas   = horasHojeVal();
  const temReceita = registrosHojeFin().length > 0;

  // ganho/hora só aparece se o turno durou pelo menos meia hora
  if (temReceita && horas >= 0.5) ganhoHoraValor.textContent = 'R$ ' + Math.round(lucro / horas);
  else                            ganhoHoraValor.textContent = '—';

  // meta do dia
  const meta = perfil.metaDiaria || 250;
  metaValorTexto.textContent = 'R$ ' + meta;
  const pct = meta > 0 ? Math.max(0, Math.min(100, Math.round((lucro / meta) * 100))) : 0;
  metaBarra.style.width = pct + '%';
  metaPct.textContent   = temReceita ? pct + '%' : '—';
  const falta = meta - lucro;
  metaFalta.textContent = !temReceita ? 'Meta R$ ' + meta
                        : falta > 0   ? 'Faltam ' + fmtBRL0(falta)
                                      : 'Meta batida! 🎯';
  renderGaugeLucro(lucro, meta, temReceita);   // move o ponteiro do velocímetro
}

// abastecimentos DO VEÍCULO ATIVO (a média de um carro não descreve uma moto)
function abastDoVeiculoAtivo() {
  const vid = vidAtivo();
  if (!vid) return lerLS('historicoAbastecimentos', []);
  return lerLS('historicoAbastecimentos', []).filter(r => r.vid === vid);
}
// base do R$/km: só registros com km E valor (um abastecimento sem km
// informado inflava a média — entrava no gasto e não entrava no km)
function baseCombustivel() {
  const todos  = abastDoVeiculoAtivo().filter(r => (r.km > 0) && (r.valor > 0));
  const ym     = hojeISO().slice(0, 7);
  const doMes  = todos.filter(r => (r.dataISO || '').slice(0, 7) === ym);
  if (doMes.length) return { base: doMes, escopo: 'mes' };
  return { base: todos, escopo: 'tudo' };
}
// fonte ÚNICA do combustível por km: usada no Início e na aba Combustível
// Quantos registros do período estão com o km furado (pra dizer na tela).
function qtdSuspeitos() {
  return baseCombustivel().base.filter(kmSuspeito).length;
}
function combustivelKmMes() {
  // ⚠️ Os furados entravam na média. Agora saem da CONTA (o gasto deles segue
  // contando no total do mês — o dinheiro saiu do bolso de verdade). Mesma
  // regra que o extrato e o bloco "por tipo" já usavam.
  const base  = baseCombustivel().base.filter(r => !kmSuspeito(r));
  const gasto = base.reduce((s, r) => s + (r.valor || 0), 0);
  const km    = base.reduce((s, r) => s + (r.km || 0), 0);
  return km > 0 ? gasto / km : 0;
}

// NOVO: custo REAL por km = combustível/km + reserva de manutenção/km
// Qual abastecimento está com o km errado? O app sabe — então diz, em vez de
// mandar o motorista procurar. Suspeito = R$/km acima de 3 (não existe combustível
// que custe isso por km) ou consumo impossível (menos de 2 km por litro).
// Leva o motorista DIRETO pro abastecimento com problema, ja aberto pra editar.
// Antes o aviso dizia "toque no lapis" — que lapis? onde? Na tela Inicio nem
// existe lapis. Agora o proprio aviso e o caminho.
function irCorrigirAbastecimento() {
  const s = abastecimentoSuspeito();
  if (!s) { toast('Nao achei nenhum abastecimento com problema'); return; }
  // vai pra aba Combustivel antes de abrir: assim, ao fechar o modal, ele fica
  // na tela certa (e nao de volta no Inicio sem entender o que aconteceu)
  atualizarTelaCombustivel();
  mostrarTela(telaCombustivel);
  navCombustivel.classList.add('ativo');
  editarAbastecimento(s.reg.id);
}

// ─── REGRA ÚNICA: o que é um abastecimento com km furado ──────
// Isto estava COPIADO em 3 lugares (o aviso do formulário, o detector da tela
// Início e o comparador do extrato) e já tinha começado a divergir: a exceção
// do GNV, criada na v3.49, só existia no formulário — o Início e o extrato
// continuavam tratando GNV como suspeito. É o mesmo tipo de dívida que causou
// o bug do campo de km faltando (duas telas de abastecimento até a v3.46).
// Mexeu aqui, mudou em todo lugar.
// Faixa normal de consumo do veículo ativo — fonte única dos textos e do teto.
function faixaConsumo() {
  return tipoVeiculoAtivo() === 'carro' ? { min: 8, max: 14 } : { min: 25, max: 40 };
}
function kmSuspeito(r) {
  if (!r) return false;
  // ⚠️ A SAÍDA DO BECO. Sem isto, um registro que está CERTO ficava marcado de
  // vermelho pra sempre e fora da conta pra sempre — sem nenhum jeito de o
  // motorista dizer "eu conferi, foi isso mesmo". E acontece de verdade: quem
  // abastece R$ 50 a cada 9 km (parcial, ou dia de trânsito parado) tem 1,3 km/L
  // real naquele registro. O app cobrava uma correção impossível, porque não
  // havia o que corrigir. Mesmo beco que a v3.32 fechou no km do turno.
  if (r.kmOk) return false;
  const v = r.valor, k = r.km, l = r.litros;
  if (!(k > 0 && v > 0)) return false;          // sem km informado: nada a julgar
  if (v / k > 3) return true;                   // custo por km impossível (vale pra todo combustível)
  if (r.tipo === 'GNV') return false;           // GNV completa o cilindro aos poucos: km/L não serve de régua
  const kpl = l ? (k / l) : null;
  if (kpl === null) return false;
  // ⚠️ O piso era 2 km/L CHUMBADO, pra qualquer veículo. Frouxo demais: um carro
  // faz 8 a 14, então 3 km/L é impossível e passava batido. Agora os dois
  // limites saem da faixa do próprio veículo — metade do mínimo até o dobro do
  // máximo. Carro: 4 a 28. Moto: 12,5 a 80. Fora disso, a conta por km não serve.
  if (kpl < faixaConsumo().min / 2) return true;
  // ⚠️ TETO — faltava. Só existia piso, então 40 km/L num carro (normal 8 a 14)
  // passava batido, e o custo por km saía barato demais. Isso é pior que o
  // erro de baixo: o motorista acha que roda a R$ 0,20 quando roda a R$ 0,60,
  // e aceita corrida ruim achando que lucra. Duas causas levam ao mesmo lugar:
  // km que cobre vários dias (esqueceu de fechar) ou abastecimento parcial.
  // Nos dois casos a conta por km não serve — então fica de fora dela.
  return kpl > faixaConsumo().max * 2;   // teto
}
function abastecimentoSuspeito() {
  const base = baseCombustivel().base;
  for (const r of base) {
    if (kmSuspeito(r)) {
      return { reg: r, cpk: r.valor / r.km, kmPorLitro: r.litros ? (r.km / r.litros) : null };
    }
  }
  return null;
}
// ⚠️ O aviso dizia "1 abastecimento está com o km errado" e parava aí. O
// motorista ficava sem saber QUAL: na lista, o registro ruim era idêntico aos
// outros. Aviso que não aponta o culpado não é aviso, é ruído — e nesse caso
// ainda por cima cobra uma correção impossível de fazer.
// Identificação curta, com o que aparece na linha da lista: dia · posto · valor.
function identificaAbast(r) {
  if (!r) return '';
  const p = [];
  if (r.data)  p.push(r.data);
  if (r.posto) p.push(r.posto);
  p.push(fmtBRL(r.valor));
  return p.join(' · ');
}
// Por que ESTE registro ficou de fora — com os números dele e o que seria normal.
// curto = versão do selinho, que fica colado no próprio registro (não precisa
// repetir a identificação nem o conselho).
function porqueSuspeito(r, curto) {
  if (!r) return '';
  const fx    = faixaConsumo();
  const faixa = fx.min + ' a ' + fx.max + ' km/L';
  const kpl   = r.litros ? (r.km / r.litros) : null;
  if (kpl !== null && kpl < fx.min / 2) {
    const base = r.litros + 'L para ' + fmtKm(r.km) + ' km dá ' + kpl.toFixed(1).replace('.', ',') + ' km/L';
    return curto ? base + ' (o normal é ' + faixa + ')'
                 : base + ' — o normal é ' + faixa + '. O km está baixo demais.';
  }
  if (kpl !== null && kpl > fx.max * 2) {
    const base = r.litros + 'L não levam ' + fmtKm(r.km) + ' km';
    return curto ? base + ' (daria ' + kpl.toFixed(0) + ' km/L; o normal é ' + faixa + ')'
                 : base + '. ' + (tipoVeiculoAtivo() === 'carro' ? 'Um carro faz ' : 'Uma moto faz ') +
                   faixa + ' — esse tanque daria ' + kpl.toFixed(0) + '. ' +
                   'Se você ficou dias sem registrar, esse km cobre mais de um abastecimento.';
  }
  const base = 'esse valor em ' + fmtKm(r.km) + ' km dá ' + fmtBRL(r.valor / r.km) + '/km';
  return curto ? base + ' (o normal fica entre R$ 0,20 e R$ 0,80)'
               : base + ' — o normal fica entre R$ 0,20 e R$ 0,80.';
}
// todos os furados do escopo atual — pra listar, não só contar
function listaSuspeitos() {
  return baseCombustivel().base.filter(kmSuspeito);
}
// texto curto explicando, na linguagem dele, POR QUE aquele número não fecha
// e QUAL seria o normal — número sozinho não ajuda quem não conhece a conta.
function textoSuspeito(s) {
  if (!s) return '';
  return ico('alerta') + ' ' + esc(identificaAbast(s.reg)) + ': ' + esc(porqueSuspeito(s.reg, false));
}


// ═══════════════════════════════════════════════════════════════
//  O PISO — o número que o motorista decora
// ═══════════════════════════════════════════════════════════════
// O problema que isto resolve:
//
// Ele tem ~7 segundos pra aceitar. Vê "R$ 12" e "5 km" e pensa R$ 2,40/km.
// Mas com 4 km até o passageiro, o número real é R$ 12 ÷ 9 = R$ 1,33/km.
// Ninguém faz essa divisão em 7 segundos — e é aí que mora o
// "troca dinheiro e acha que tá no lucro".
//
// A saída NÃO é uma calculadora: ninguém abre outro app nesse tempo.
// A saída é UM número que ele decora e reconhece de bate-pronto.
//
// ⚠️ Tudo aqui sai do histórico DELE. Nenhuma média de mercado, nenhum chute.
// Quando falta dado, devolve null e a tela diz o que falta — regra sagrada nº 2.

// km/h REAL: km rodado dividido pelas horas marcadas, não por 8 chumbado.
function kmPorHoraReal() {
  const mapaKm = lerLS('kmPorDia', {});
  const horas  = lerLS('horasPorDia', {});
  const vidS   = vidAtivo();
  const amostras = [];
  Object.keys(mapaKm).sort().reverse().slice(0, 14).forEach(function (iso) {
    const r = mapaKm[iso], h = horas[iso];
    // registro que cobre vários dias não entra: dividir seria inventar
    if (!r || !(r.km > 0) || (r.dias || 1) !== 1) return;
    if (vidS && r.vid && r.vid !== vidS) return;
    if (!(h >= 1)) return;                       // menos de 1h distorce demais
    const v = r.km / h;
    if (v >= 5 && v <= 70) amostras.push(v);     // fora disso é dado furado
  });
  if (amostras.length < 2) return null;
  return amostras.reduce(function (a, b) { return a + b; }, 0) / amostras.length;
}

// ⚠️ "por alguns dias" não é resposta. O motorista perguntou QUANTOS — e o app
// sabe: são 2 dias com o "Bora rodar" marcado E o km fechado (é o mínimo pra
// uma média não ser um chute). Contar o que ele JÁ tem transforma espera em
// progresso: "falta 1 dia" faz voltar amanhã, "alguns dias" faz desistir.
const PISO_AMOSTRAS = 2;
function amostrasDoPiso() {
  const mapaKm = lerLS('kmPorDia', {});
  const horas  = lerLS('horasPorDia', {});
  const vidS   = vidAtivo();
  let n = 0;
  // mesma peneira do kmPorHoraReal() — se divergir, o app promete um dia que não conta
  Object.keys(mapaKm).sort().reverse().slice(0, 14).forEach(function (iso) {
    const r = mapaKm[iso], h = horas[iso];
    if (!r || !(r.km > 0) || (r.dias || 1) !== 1) return;
    if (vidS && r.vid && r.vid !== vidS) return;
    if (!(h >= 1)) return;
    const v = r.km / h;
    if (v >= 5 && v <= 70) n++;
  });
  return n;
}
function faltamDiasPiso(comHtml) {
  const n = amostrasDoPiso();
  const falta = Math.max(0, PISO_AMOSTRAS - n);
  const b = comHtml ? ['<b>', '</b>'] : ['', ''];
  const d = function (x) { return b[0] + x + (x === 1 ? ' dia' : ' dias') + b[1]; };
  if (falta <= 0) return '';   // já tem o bastante; o que falta é outra coisa
  const pedido = 'São ' + d(PISO_AMOSTRAS) + ' com o "Bora rodar" marcado e o '
               + 'km fechado no fim do turno';
  if (n === 0) return pedido + '. Você ainda não tem nenhum.';
  return pedido + ' — você já tem ' + d(n) + ', ' + (falta === 1 ? 'falta ' : 'faltam ') + d(falta) + '.';
}
function pisoPorKm() {
  // ⚠️ AQUI ESTAVA O PIOR DELES. `custo` era combustível + reserva, e a reserva
  // NUNCA é zero (tem valor padrão). Resultado: um motorista recém-cadastrado,
  // sem um único abastecimento, abria o guia e lia "Seu piso por km: R$ 0,12 —
  // abaixo disso é prejuízo puro, sem discussão". A frase mais assertiva do
  // produto inteiro, em cima de um número que o app não tinha como saber.
  // O combustível medido é a base: sem ele não há piso, há chute.
  const combKm = combustivelKmMes();
  if (!(combKm > 0)) {
    return { custo: null, piso: null, kmh: null, horasTipicas: null,
             ganhoHora: null, falta: 'combustivel' };
  }
  const custo = combKm + reservaKmAtual();   // o que sai do bolso por km
  if (!(custo > 0)) return null;

  const kmh = kmPorHoraReal();
  const p   = getPerfil();
  const meta = p.metaDiaria || 0;

  // Horas típicas: as que ele realmente marca. Sem isso não dá pra converter
  // "quanto quero por dia" em "quanto preciso por hora".
  const horas = lerLS('horasPorDia', {});
  const hs = Object.keys(horas).sort().reverse().slice(0, 14)
               .map(function (k) { return horas[k]; }).filter(function (h) { return h >= 1; });
  const horasTipicas = hs.length >= 2
    ? hs.reduce(function (a, b) { return a + b; }, 0) / hs.length : null;

  // Sem km/h ou sem horas, o app ainda sabe UMA coisa com certeza: o custo.
  // Abaixo do custo é prejuízo, e isso não depende de meta nenhuma.
  if (kmh === null || horasTipicas === null || meta <= 0) {
    return { custo: custo, piso: null, kmh: kmh, horasTipicas: horasTipicas,
             ganhoHora: null,
             // ⚠️ meta zerada caía em 'horas' e o app mandava marcar turno —
             // ele marcaria a semana inteira e o piso não nasceria nunca.
             falta: (meta <= 0 ? 'meta' : (kmh === null ? 'km' : 'horas')) };
  }

  const ganhoHora = meta / horasTipicas;        // quanto a meta dele exige por hora
  const lucroPorKm = ganhoHora / kmh;           // ...convertido pra km, no ritmo dele
  return { custo: custo, piso: custo + lucroPorKm, kmh: kmh,
           horasTipicas: horasTipicas, ganhoHora: ganhoHora, falta: null };
}

// ⚠️ O PISO SOZINHO NÃO BASTA — e isso quase passou batido.
// Com o piso na mão ele ainda precisa DIVIDIR: "R$ 12 em 9 km, dá quanto?".
// Divisão de cabeça, em 7 segundos, no trânsito. Não acontece. A própria
// categoria diz: "o serviço é SOMAR e SUBTRAIR, mas nem isso querem fazer".
//
// A saída é virar a conta do avesso: em vez de ELE dividir, o APP multiplica
// antes e entrega a tabela pronta. Aí a decisão vira comparar dois valores em
// reais — que é o que qualquer pessoa faz sem pensar:
//   "9 km... a linha dos 10 diz R$ 23. Estão pagando R$ 12. Não."
function tabelaDoPiso(piso) {
  if (!(piso > 0)) return '';
  return [5, 10, 15, 20].map(function (km) {
    // ⚠️ ARREDONDA PRA CIMA, sempre. Com piso de R$ 2,25 os 5 km dão R$ 11,25;
    // arredondar pra baixo escreveria "R$ 11" — e o app estaria autorizando
    // uma corrida ABAIXO do próprio piso que ele acabou de mandar decorar.
    // A tabela existe pra proteger o motorista, não pra caber num número bonito.
    return '<div class="piso-t-col"><div class="piso-t-km">' + km + ' km</div>' +
           '<div class="piso-t-val">' + fmtBRL0(Math.ceil(piso * km)) + '</div></div>';
  }).join('');
}
// Quando o piso cai perto de um número redondo, existe uma regra de bolso ainda
// mais simples que a tabela — e regra decorada vence tabela consultada.
function regraDeBolso(piso) {
  if (!(piso > 0)) return '';
  const mult = [
    { v: 1.5, txt: 'o km e mais metade' },
    { v: 2,   txt: 'o dobro do km' },
    { v: 2.5, txt: 'duas vezes e meia o km' },
    { v: 3,   txt: 'o triplo do km' }
  ];
  for (const m of mult) {
    // só sugere se o piso estiver REALMENTE perto: a regra tem que ser segura,
    // e arredondar pra baixo faria ele aceitar corrida abaixo do piso
    if (piso >= m.v * 0.94 && piso <= m.v * 1.06) {
      return 'Regra de bolso: a corrida precisa pagar <b>' + m.txt + '</b>.';
    }
  }
  return '';
}

// ⚠️ O piso MOROU na tela Início e foi tirado de lá: virou o segundo maior
// bloco da tela (241px de 957) disputando espaço com o velocímetro. Ele não é
// dado de acompanhamento diário — é uma RÉGUA, e régua se consulta.
// Agora vive no guia (a aba que explica as rotinas), e o Isaac chama o
// motorista pra ver quando tem motivo de verdade. Ver `avisarPisoSeMudou`.
function cardDoPiso() {
  const d = pisoPorKm();
  if (!d) return null;

  // sem combustível medido não existe piso — e dizer isso é melhor que chutar
  if (d.falta === 'combustivel') {
    return {
      ic: ico('alvo'), cor: 'var(--dim)', tit: 'Seu piso por km', hero: '—',
      isaac: 'Ainda não dá. O piso sai do que o combustível te custa por km, e pra isso eu '
           + 'preciso de um abastecimento com o valor e o km rodado. Registre o próximo tanque '
           + 'na aba Combustível que esse número nasce aqui. Eu não chuto esse número: se eu '
           + 'errar pra baixo, você aceita corrida que te dá prejuízo achando que eu aprovei.',
      fonte: 'medido do seu tanque, não de média de mercado'
    };
  }
  if (d.piso === null) {
    return {
      ic: ico('alvo'), cor: 'var(--signal)', tit: 'Seu piso por km', hero: fmtBRL(d.custo),
      isaac: 'Esse é o que SAI do seu bolso a cada km — abaixo disso é prejuízo puro, sem discussão. '
           + 'Pra eu calcular o piso da sua meta (o valor abaixo do qual você não bate o dia) '
           + (d.falta === 'meta'
               ? 'eu preciso saber qual é a sua meta do dia: toque na meta, ali no velocímetro do Início.'
               : 'eu preciso saber quantos km você faz por hora. ' + faltamDiasPiso(false) + ' Aí o número aparece sozinho aqui.'),
      fonte: 'medido do seu tanque, não de média de mercado'
    };
  }

  const regra = regraDeBolso(d.piso);
  return {
    ic: ico('alvo'), cor: 'var(--money)', tit: 'Seu piso por km', hero: fmtBRL(d.piso),
    isaac: 'Você tem uns 7 segundos pra aceitar. R$ 12 por 5 km parece R$ 2,40 — mas com 4 km pra buscar '
         + 'o passageiro foram 9 km, e o real é R$ 1,33. Some sempre o km pra buscar mais o km da corrida. '
         + 'Abaixo de ' + fmtBRL(d.piso) + ' você não bate sua meta. '
         + (regra ? regra.replace(/<[^>]+>/g, '') + ' ' : '')
         + 'Toque aqui embaixo que eu te mostro a tabela pronta — não precisa dividir nada.',
    fonte: 'recalculado a cada registro seu — nunca é média de mercado',
    piso: d
  };
}
// A tabela vive dentro do card do guia, como bloco de destaque.
function blocoTabelaPiso(d) {
  if (!d || d.piso === null) return '';
  return '<div class="ajuda-piso-bloco" style="margin-top:12px;">' +
    '<div class="ajuda-piso-tit">' + ico('alvo') + ' Não precisa dividir nada</div>' +
    '<div class="ajuda-piso-txt">Some os dois km e olhe quanto a corrida <b>precisa pagar</b>:</div>' +
    '<div class="piso-tabela">' + tabelaDoPiso(d.piso) + '</div>' +
    '<div class="ajuda-piso-ex">9 km e estão pagando R$ 12? A linha dos 10 km pede <b>' +
      fmtBRL0(Math.ceil(d.piso * 10)) + '</b>. Recusa.</div>' +
    '<div class="ajuda-piso-regra">Cada km te custa <b>' + fmtBRL(d.custo) + '</b>. ' +
      'Sua meta de <b>' + fmtBRL0(getPerfil().metaDiaria || 0) + '</b> em <b>' +
      d.horasTipicas.toFixed(1).replace('.', ',') + 'h</b>, no seu ritmo de <b>' +
      Math.round(d.kmh) + ' km/h</b>, pede mais <b>' + fmtBRL(d.piso - d.custo) + '</b> por km.</div>' +
    // ⚠️ Sem esta linha o motorista pode achar que é número fixo, chutado uma
    // vez no cadastro — e aí não confia. Dizer que ele SE MEXE é o que mostra
    // que o app está medindo, e não estimando como os concorrentes.
    '<div class="ajuda-piso-vivo">' + ico('atualizar') +
      ' <b>Este número está vivo.</b> Cada abastecimento que você registra e cada dia ' +
      'que você fecha refazem a conta. Gasolina subiu? O piso sobe junto, no mesmo dia.</div>' +
    '</div>';
}

// ⚠️ O Isaac só chama o motorista quando tem NOTÍCIA — não "de vez em quando".
// Lembrete sem motivo é o que a categoria diz que enche o saco (o influenciador
// postando todo dia). Aqui são dois momentos, e só:
//   1. o piso NASCEU — o app finalmente sabe calcular. Isso é notícia.
//   2. o piso MUDOU mais de 15% — a gasolina subiu, o ritmo mudou. Também é.
// Fora disso, silêncio: o número fica no guia esperando ser consultado.
function avisarPisoSeMudou() {
  const d = pisoPorKm();
  if (!d || d.piso === null) return;
  const antes = lerLS('pisoUltimoAvisado', null);

  if (antes === null) {
    salvarLS('pisoUltimoAvisado', d.piso);
    BALOES_PROG.pisoNasceu = {
      titulo: 'Agora eu sei o seu piso: ' + fmtBRL(d.piso) + ' por km.',
      texto: 'Já tenho dados seus o bastante pra calcular. <b style="color:var(--money)">Abaixo de ' +
             fmtBRL(d.piso) + ' por km você não bate sua meta</b> — e esse número é SÓ SEU, feito do seu ' +
             'consumo e do seu ritmo, não de média de mercado.<br><br>' +
             'Está no <b style="color:var(--signal)">guia</b> (o ⓘ lá em cima), com a tabela pronta ' +
             'pra você não precisar dividir nada na hora da corrida.'
    };
    enfileirarBalaoProg('pisoNasceu');
    return;
  }

  const variou = Math.abs(d.piso - antes) / antes;
  if (variou < 0.15) return;                       // ruído do dia a dia, não é notícia
  salvarLS('pisoUltimoAvisado', d.piso);
  const subiu = d.piso > antes;
  const chave = 'pisoMudou' + Date.now();          // chave nova: este aviso pode repetir
  BALOES_PROG[chave] = {
    titulo: 'Seu piso ' + (subiu ? 'subiu' : 'caiu') + ': agora é ' + fmtBRL(d.piso) + ' por km.',
    texto: 'Era ' + fmtBRL(antes) + '. ' +
           (subiu
             ? 'Custo maior ou ritmo mais lento — <b style="color:var(--danger)">a corrida que valia a pena ontem pode não valer hoje</b>.'
             : 'Você está rodando mais barato ou mais rápido — <b style="color:var(--money)">dá pra aceitar corrida um pouco menor</b> e ainda bater a meta.') +
           '<br><br>A tabela nova está no <b style="color:var(--signal)">guia</b>.'
  };
  enfileirarBalaoProg(chave);
}

function atualizarCustoRealKm() {
  const reservaKm = reservaKmAtual();
  // fonte única: mesma média da aba Combustível (não o último abastecimento isolado, que é ruído)
  const combKm = combustivelKmMes();   // já sem os furados
  const real = combKm + reservaKm;
  // Usa a MESMA regra do detector (custo absurdo OU consumo impossível).
  // Antes aqui só olhava o custo > 3: um registro de 11L para 20 km (1,8 km/L,
  // impossível) passava batido porque o custo dava R$ 2,50.
  // ⚠️ ANTES: UM registro furado apagava o número da tela inteira. Motorista com
  // 10 abastecimentos bons e 1 ruim ficava sem custo por km — e PARA SEMPRE, se
  // nunca corrigisse. O app ficava refém de um dado que talvez ele nem lembre
  // como consertar.
  // Agora o furado sai da CONTA, não da TELA: o número aparece com o que sobrou
  // de confiável, e o aviso vira lembrete ao lado. Só some quando não sobra
  // NENHUM registro bom — aí é verdade que o app não sabe.
  const nFurados = qtdSuspeitos();
  const suspeito = combKm > 3 || (combKm <= 0 && nFurados > 0);

  // ⚠️ Número que o app SABE estar errado não vai pra tela. Antes ele aparecia
  // em destaque com um aviso do lado — e o motorista pode decidir uma corrida
  // olhando esse número. Regra do projeto: faltou dado confiável, avisa e cala.
  // ⚠️ Era `combKm > 0 ? real : reservaKm` — sem NENHUM abastecimento, a tela
  // exibia a reserva de manutenção sozinha (R$ 0,12) sob o rótulo "/km real".
  // O motorista recém-cadastrado, que roda a uns R$ 0,60/km, lia R$ 0,12 e
  // aceitaria corrida por qualquer coisa. Sem combustível medido o app não
  // sabe o custo por km — e não saber se escreve "—", não se preenche com a
  // metade que ele tem à mão. Regra sagrada nº 2.
  const mostra = (suspeito || !(combKm > 0)) ? null : real;
  custoPorKmValor.textContent = mostra === null ? '—' : fmtBRL(mostra);
  custoKmStrip.textContent    = mostra === null ? '—' : fmtBRL(mostra);

  const botaoCorrigir =
      '<br><button onclick="event.stopPropagation();irCorrigirAbastecimento()" ' +
      'style="margin-top:7px;background:rgba(255,176,32,.14);border:1px solid rgba(255,176,32,.45);' +
      'color:var(--signal);font-family:inherit;font-size:var(--f1);font-weight:700;padding:6px 14px;' +
      'border-radius:16px;cursor:pointer;">Corrigir agora ' + ico('seta-dir') + '</button>';

  if (suspeito) {
    // Não sobrou registro confiável: aí sim o app não tem o que mostrar.
    const _s = abastecimentoSuspeito();
    custoRealSub.innerHTML = (_s ? textoSuspeito(_s) : ico('alerta') + ' Um abastecimento está com o km errado.') +
      botaoCorrigir;
    custoRealSub.style.color = 'var(--signal)';
  } else {
    custoRealSub.style.color = '';
    if (combKm > 0) {
      const contaOk = 'comb ' + fmtBRL(combKm) + ' + reserva ' + fmtBRL(reservaKm);
      if (nFurados > 0) {
        // Tem número na tela, feito com o que é confiável — e o convite pra
        // completar fica do lado, sem bloquear nada.
        // ⚠️ Dizia só "sem 1 abastecimento de km errado". Qual? O motorista não
        // tinha como saber, e o botão o largava numa lista onde todos os
        // registros pareciam iguais. Agora o aviso já diz o dia e o posto.
        const _f = abastecimentoSuspeito();
        const quais = (nFurados === 1 && _f)
          ? 'sem o de ' + identificaAbast(_f.reg) + ' (km errado)'
          : 'sem ' + nFurados + ' abastecimentos de km errado';
        custoRealSub.innerHTML = esc(contaOk) +
          '<br><span style="color:var(--faint);font-size:var(--f1);">' + esc(quais) +
          '</span>' + botaoCorrigir;
      } else {
        custoRealSub.textContent = contaOk;
      }
    } else {
      // sem R$/km deste veículo ainda: fala a verdade em vez de mostrar a média de outro
      const n = abastDoVeiculoAtivo().length;
      const temOutros = lerLS('historicoAbastecimentos', []).length > n;
      custoRealSub.textContent = temOutros
        ? 'aprendendo ' + nomeVeiculo(veiculoAtivo()) + ' · ' + n + (n === 1 ? ' abastecimento' : ' abastecimentos')
        : 'toque aqui e veja como funciona';
    }
  }
}

// NOVO: reserva acumulada
function atualizarReserva() {
  const perfil    = getPerfil();
  const acumulada = Number(localStorage.getItem('reservaAcumulada')) || 0;
  reservaValor.textContent = fmtBRL0(acumulada);
  reservaSub.textContent   = 'guardando R$ ' + (perfil.reservaDia || 20) + '/dia · toque p/ ajustar';
}

// NOVO: separa a reserva do dia (uma vez por dia) ao finalizar o turno
// `dia` = o dia a que o fechamento pertence (ver diaDoTurno). Sem argumento,
// vale hoje — é assim que os outros pontos do app chamam.
function guardarReservaDoDia(dia) {
  const alvo = dia || hojeISO();
  const perfil = getPerfil();
  const ultimoDia = localStorage.getItem('reservaUltimoDia');
  if (ultimoDia === alvo) return;                    // já guardou nesse dia
  const atual = Number(localStorage.getItem('reservaAcumulada')) || 0;
  salvarLS('reservaAcumulada', atual + (perfil.reservaDia || 20));
  sincronizarPerfil();
  salvarLS('reservaUltimoDia', alvo);
}

// ═══════════════════════════════════════════════════════════════
//  MODAL RESERVA (cofrinho: guardar + tirar + objetivo)
// ═══════════════════════════════════════════════════════════════
function reservaTotal()    { return Number(localStorage.getItem('reservaAcumulada')) || 0; }
function reservaObjetivo() { const p = getPerfil(); return p.reservaObjetivo || 0; }

// desenha o topo do modal (total + barra de objetivo)
function pintarCofre() {
  const total = reservaTotal();
  const obj   = reservaObjetivo();
  document.getElementById('reservaTotalBig').textContent = fmtBRL0(total);
  const bloco = document.getElementById('cofreObjetivoBloco');
  if (obj > 0) {
    bloco.style.display = 'block';
    const pct = Math.max(0, Math.min(100, Math.round((total / obj) * 100)));
    document.getElementById('cofreObjTexto').textContent = 'Objetivo: ' + fmtBRL0(total) + ' de ' + fmtBRL0(obj);
    document.getElementById('cofreObjPct').textContent   = pct + '%';
    document.getElementById('cofreObjBarra').style.width  = pct + '%';
  } else {
    bloco.style.display = 'none';
  }
}
// abre o modal (substitui o prompt feio) — chamado pelo card Reserva
function editarReserva() {
  const perfil = getPerfil();
  document.getElementById('inputReservaDia').value      = perfil.reservaDia || 20;
  document.getElementById('inputReservaObjetivo').value = perfil.reservaObjetivo || '';
  document.getElementById('inputMovReserva').value      = '';
  pintarCofre();
  document.getElementById('modalReserva').style.display = 'flex';
}
// modal de confirmação (Sim/Cancelar)
document.getElementById('btnConfirmSim').addEventListener('click', () => {
  document.getElementById('modalConfirm').style.display = 'none';
  if (_confirmCb) { const cb = _confirmCb; _confirmCb = null; cb(); }
});
document.getElementById('btnConfirmNao').addEventListener('click', () => {
  _confirmCb = null;
  document.getElementById('modalConfirm').style.display = 'none';
});
document.querySelector('#btnFecharReserva').addEventListener('click', () => { document.getElementById('modalReserva').style.display = 'none'; });
// GUARDAR um valor avulso agora
document.querySelector('#btnGuardarReserva').addEventListener('click', function() {
  const v = numBR(document.getElementById('inputMovReserva').value);
  if (!v || v <= 0) { toast('Digite um valor para guardar', 'erro'); return; }
  salvarLS('reservaAcumulada', reservaTotal() + v);
  sincronizarPerfil();
  document.getElementById('inputMovReserva').value = '';
  pintarCofre(); atualizarReserva();
  toast('🐷 Guardado na reserva!');
});
// TIRAR da reserva (mexe no dinheiro guardado → pede confirmação)
document.querySelector('#btnTirarReserva').addEventListener('click', function() {
  const v = numBR(document.getElementById('inputMovReserva').value);
  if (!v || v <= 0) { toast('Digite um valor para tirar', 'erro'); return; }
  if (v > reservaTotal()) { toast('Você só tem ' + fmtBRL0(reservaTotal()) + ' guardado', 'erro'); return; }
  pedirConfirmacao('🐷 Tirar da reserva', 'Tem certeza que quer tirar ' + fmtBRL0(v) + ' da sua reserva?', function() {
    salvarLS('reservaAcumulada', reservaTotal() - v);
    sincronizarPerfil();
    document.getElementById('inputMovReserva').value = '';
    pintarCofre(); atualizarReserva();
    toast('Tirado da reserva.');
  });
});
// salvar ajustes (guardar por dia + objetivo)
document.querySelector('#btnSalvarReserva').addEventListener('click', function() {
  const perfil = getPerfil();
  const dia = numBR(document.getElementById('inputReservaDia').value);
  const obj = numBR(document.getElementById('inputReservaObjetivo').value) || 0;
  if (isNaN(dia) || dia < 0) { toast('Valor por dia inválido', 'erro'); return; }
  perfil.reservaDia      = Math.round(dia);
  perfil.reservaObjetivo = Math.round(obj);
  salvarLS('perfilUsuario', perfil);
  sincronizarPerfil();
  pintarCofre(); atualizarReserva();
  document.getElementById('modalReserva').style.display = 'none';
  toast('✅ Ajustes salvos!');
});

// ═══════════════════════════════════════════════════════════════
//  MODAL META DO DIA (progresso + ajustar)
// ═══════════════════════════════════════════════════════════════
function editarMeta() {
  const perfil = getPerfil();
  const meta   = perfil.metaDiaria || 250;
  const lucro  = lucroHojeVal();
  const temReceita = registrosHojeFin().length > 0;
  document.getElementById('metaModalBig').textContent  = 'R$ ' + meta;
  document.getElementById('metaModalHoje').textContent = 'Hoje: ' + fmtBRL0(lucro);
  const pct = meta > 0 ? Math.max(0, Math.min(100, Math.round((lucro / meta) * 100))) : 0;
  document.getElementById('metaModalPct').textContent   = temReceita ? pct + '%' : '—';
  document.getElementById('metaModalBarra').style.width = (temReceita ? pct : 0) + '%';
  const falta = meta - lucro;
  document.getElementById('metaModalFalta').textContent = !temReceita ? 'Registre sua receita pra acompanhar'
                                                        : falta > 0   ? 'Faltam ' + fmtBRL0(falta) + ' pra bater a meta'
                                                                      : '🎯 Meta batida! Parabéns!';
  document.getElementById('inputMetaNova').value = meta;
  document.getElementById('modalMeta').style.display = 'flex';
}
document.querySelector('#btnFecharMeta').addEventListener('click', () => { document.getElementById('modalMeta').style.display = 'none'; });
document.querySelector('#btnSalvarMeta').addEventListener('click', function() {
  const perfil = getPerfil();
  const n = numBR(document.getElementById('inputMetaNova').value);
  if (!n || n <= 0) { toast('Meta inválida', 'erro'); return; }
  perfil.metaDiaria = Math.round(n);
  salvarLS('perfilUsuario', perfil);
  sincronizarPerfil();
  atualizarResumoDia();
  document.getElementById('modalMeta').style.display = 'none';
  toast('🎯 Meta atualizada!');
});
function irParaDocumentos() {
  atualizarTelaDocumentos();
  mostrarTela(telaDocumentos);
  navDocumentos.classList.add('ativo');
}

// ═══════════════════════════════════════════════════════════════
//  BALÃO DE AJUDA — explica cada métrica com a conta real do dia
// ═══════════════════════════════════════════════════════════════
function abrirAjuda(qual, ev) {
  if (ev) ev.stopPropagation();
  const perfil = getPerfil();
  const lucro  = lucroHojeVal();
  const horas  = horasHojeVal();
  const temReceita = registrosHojeFin().length > 0;

  let titulo = '', texto = '', conta = '';

  if (qual === 'hora') {
    titulo = ico('lampada') + ' Ganho por hora real';
    texto  = 'Mostra quanto o seu <b>tempo</b> vale por hora — pra decidir se compensa continuar. '
           + 'Exemplo: <b>R$ 300 em 6h = R$ 50/hora</b>. Já <b>R$ 360 em 9h = R$ 40/hora</b>: '
           + 'parece mais, mas foram 3h a mais pra ganhar menos por hora.';
    if (temReceita && horas >= 0.5)
      conta = `Sua conta de hoje: lucro de <b>${fmtBRL0(lucro)}</b> ÷ <b>${horas.toFixed(1)}h</b> = <b>R$ ${Math.round(lucro/horas)}/hora</b>.`;
    else if (temReceita && horas < 0.5)
      conta = 'Você registrou a receita ✅, mas <b>não usou o slider verde do Início</b> (o "Bora rodar") — sem saber quantas horas você trabalhou, não dá pra calcular. Amanhã: desliza ele ao sair e ao encerrar o dia, que a conta aparece sozinha.';
    else if (!temReceita && horas >= 0.5)
      conta = 'Horas do dia marcadas ✅ — agora só falta <b>registrar sua receita do dia</b> (na aba Finanças) que a conta aparece.';
    else
      conta = 'Pra essa conta aparecer, preciso de 2 coisas no mesmo dia: <b>deslizar o "Bora rodar" ao começar e encerrar</b> (me diz as horas) + <b>registrar a receita</b> (me diz o lucro).';
  }
  else if (qual === 'piso') {
    titulo = ico('lampada') + ' Seu piso por km';
    const d = pisoPorKm();
    texto = '<b>Este número é só seu.</b> Ele sai do que VOCÊ pagou no último abastecimento, '
          + 'de quantos km VOCÊ faz por hora e da meta que VOCÊ escolheu. Outro motorista, '
          + 'na mesma cidade e no mesmo carro, vai ter um piso diferente do seu.<br><br>'
          + 'Os apps que estimam usam média de mercado. Média não paga a sua conta.<br><br>'
          + 'Você tem uns <b>7 segundos</b> pra aceitar uma corrida. Não dá tempo de fazer conta — '
          + 'e é exatamente aí que o motorista se engana.<br><br>'
          + '<b>O erro que quase todo mundo comete:</b> a corrida mostra R$ 12 por 5 km. '
          + 'Parece R$ 2,40 por km, ótimo. Mas se você roda 4 km só pra buscar o passageiro, '
          + 'foram <b>9 km</b> no total — e o valor real é <b>R$ 1,33 por km</b>.<br><br>'
          + 'Some sempre os dois: <b>o km pra buscar + o km da corrida</b>. É essa soma que conta.';
    if (d && d.piso !== null) {
      const regra = regraDeBolso(d.piso);
      // ⚠️ O bloco da tabela é o CORAÇÃO desta ajuda, não um apêndice: é o que
      // dispensa o motorista de dividir. Por isso vem antes da conta detalhada
      // — quem só quer saber "aceito ou não" para de ler aqui e já resolveu.
      texto += '<br><br><div class="ajuda-piso-bloco">'
            +   '<div class="ajuda-piso-tit">' + ico('alvo') + ' Não precisa dividir nada</div>'
            +   '<div class="ajuda-piso-txt">Some os dois km e olhe quanto a corrida '
            +   '<b>precisa pagar</b>:</div>'
            +   '<div class="piso-tabela">' + tabelaDoPiso(d.piso) + '</div>'
            +   '<div class="ajuda-piso-ex">9 km e estão pagando R$ 12? A linha dos 10 km pede '
            +   '<b>' + fmtBRL0(Math.ceil(d.piso * 10)) + '</b>. Recusa.</div>'
            +   (regra ? '<div class="ajuda-piso-regra">' + regra + '</div>' : '')
            + '</div>';
      conta = 'De onde sai o seu piso: cada km te custa <b>' + fmtBRL(d.custo) + '</b>. '
            + 'Sua meta de <b>' + fmtBRL0(getPerfil().metaDiaria || 0) + '</b> em <b>'
            + d.horasTipicas.toFixed(1).replace('.', ',') + 'h</b> pede <b>' + fmtBRL0(d.ganhoHora) + ' por hora</b>. '
            + 'No seu ritmo de <b>' + Math.round(d.kmh) + ' km/h</b>, isso vira <b>'
            + fmtBRL(d.piso - d.custo) + '</b> de lucro por km.<br><br>'
            + fmtBRL(d.custo) + ' + ' + fmtBRL(d.piso - d.custo) + ' = <b>' + fmtBRL(d.piso) + ' por km</b>.<br><br>'
            + '⚠️ Se esse número parece alto demais pra realidade da sua praça, não é o app que está errado: '
            + 'ou a meta está acima do que o dia dá, ou o dia vai ser mais longo. O número não mente pra te agradar.';
    } else if (d) {
      conta = 'Por enquanto eu só sei o <b>chão</b>: cada km te custa <b>' + fmtBRL(d.custo) + '</b>, '
            + 'e abaixo disso é prejuízo puro, sem discussão. Pro piso da sua meta '
            + (d.falta === 'meta'
                ? 'eu preciso saber quanto você quer fazer por dia: toque na <b>meta</b>, ali no velocímetro do Início.'
                : 'eu preciso saber quantos km você faz por hora. ' + faltamDiasPiso(true)
                  + ' Aí o número aparece sozinho aqui — não precisa fazer mais nada.');
    }
  }
  else if (qual === 'km') {

    // ── LINGUAGEM: pra ler de capacete, entre uma corrida e outra.
    // A palavra "guardada" saiu: ela fazia o cara achar que o desgaste ia
    // pro cofrinho 🐷 — e não vai. O balão agora diz onde o dinheiro NÃO está.
    titulo = ico('lampada') + ' Custo real por km';
    const ehCarro = tipoVeiculoAtivo() === 'carro';
    const peca    = ehCarro ? 'do seu carro' : 'da sua moto';
    const pecas   = ehCarro ? 'Óleo, pneu, freio, embreagem.' : 'Óleo, pneu, corrente, freio.';
    texto  = 'Rodar 1 km gasta duas coisas suas.<br><br>'
           + '<b>A gasolina.</b> Essa você paga na hora, na bomba.<br><br>'
           + '<b>Um pedaço ' + peca + '.</b> ' + pecas + ' Você não paga hoje, mas gastou hoje. A conta chega depois.<br><br>'
           + 'Eu somo os dois. É por isso que se pode rodar o mês inteiro e não sobrar nada: o desgaste consumiu, sem você perceber.<br><br>'
           + '<b>Esse pedaço do desgaste não vai para o cofrinho.</b> Ele entra apenas na conta, para você saber quanto a corrida custa de verdade. '
           + 'O cofrinho 🐷 é outra coisa: ele guarda por dia o valor que você definiu.';

    // A conta TEM que usar a mesma fonte da tira (combustivelKmMes), senão o
    // balão explica um número que não é o que está escrito na tela.
    const reservaKm = reservaKmAtual();
    const combKmAj  = combustivelKmMes();
    if (combKmAj > 0) {
      const escopo = baseCombustivel().escopo === 'mes' ? 'Este mês' : 'No seu histórico';
      const total  = combKmAj + reservaKm;
      // multiplica pelos números QUE APARECEM na tela (já arredondados), senão
      // o cara refaz a conta do balão e não fecha — o oposto do que ele serve.
      const gasTela = Number(combKmAj.toFixed(2));
      const desTela = Number(reservaKm.toFixed(2));
      const totTela = gasTela + desTela;
      conta = `${escopo}: combustível ${fmtBRL(gasTela)} + desgaste ${fmtBRL(desTela)} = <b>${fmtBRL(totTela)} por km</b>. Corrida de 10 km: <b>${fmtBRL((totTela*10))}</b>.`;
    } else {
      conta = `Por enquanto só o desgaste: <b>${fmtBRL(reservaKm)} por km</b>. A gasolina entra na conta quando você registrar <b>valor + km</b> ao abastecer.`;
    }
  }
  else if (qual === 'meta') {
    const meta = perfil.metaDiaria || 250;
    titulo = ico('lampada') + ' Progresso da meta';
    texto  = 'Mostra o quanto falta para você atingir a meta do dia — como uma barra de progresso que vai enchendo. '
           + 'Exemplo: meta de R$ 250, você já fez R$ 200, faltam R$ 50. '
           + 'Ter um alvo claro dá foco e ajuda a fechar o dia no positivo, '
           + 'em vez de rodar sem saber se já foi suficiente ou se precisa de um pouco mais.';
    if (temReceita)
      conta = `Hoje: <b>${fmtBRL0(lucro)}</b> de <b>R$ ${meta}</b>` + (lucro >= meta ? ' — <b>atingida! 🎯</b>' : ` (faltam <b>${fmtBRL0((meta-lucro))}</b>)`) + '. Toque na barra para mudar a meta.';
    else
      conta = `Sua meta é R$ ${meta}/dia. Registre sua receita para ver o progresso.`;
  }

  document.getElementById('ajudaTitulo').innerHTML = titulo;
  document.getElementById('ajudaTexto').innerHTML    = texto;
  document.getElementById('ajudaConta').innerHTML    = conta;
  document.getElementById('ajudaBalao').style.display = 'block';
}
function fecharAjuda() {
  document.getElementById('ajudaBalao').style.display = 'none';
}

// ═══ AJUDA DOS CARDS: explicação em 1 frase + exemplo com números redondos ═══
const AJUDAS_CARD = {
  projecao: {
    t: ico('sobe') + ' Projeção do mês',
    x: 'É a minha estimativa de quanto você deve fechar o mês, com base no seu ritmo até agora. Quanto mais dias registrados, mais precisa ela fica.',
    e: 'Exemplo: em 10 dias rodados você lucrou <b>R$ 1.000</b> — média de R$ 100 por dia. Mantido esse ritmo, o mês fecha perto de <b>R$ 3.000</b>.'
  },
  gastomes: {
    t: ico('bomba') + ' Gasto no mês',
    x: 'É a soma de tudo que você registrou de combustível neste mês.',
    e: 'Exemplo: abasteceu 4 vezes de R$ 50 → gasto do mês = <b>R$ 200</b>.'
  },
  mediakm: {
    t: ico('bomba') + ' Custo médio por km',
    x: 'Quanto de combustível você gasta a cada quilômetro rodado. Serve para saber se o trajeto está consumindo o seu ganho.',
    e: 'Exemplo: abasteceu <b>R$ 50</b> e rodou <b>100 km</b> → custo de <b>R$ 0,50 por km</b>. Numa entrega de 10 km, são R$ 5 apenas de combustível.'
  },
  valepena: {
    t: ico('calc') + ' Vale a pena rodar?',
    x: 'Antes de começar o dia, me informe quantas horas você tem e a sua meta de lucro. Eu calculo quanto o dia exige por hora e comparo com o que você realmente rende — sem otimismo irreal.',
    e: 'Exemplo: meta de <b>R$ 200</b> em <b>8h</b> pede <b>R$ 25/h</b>. Se o seu ritmo real é R$ 18/h, eu aviso que essa meta está pesada para o tempo que você tem.'
  },
  ritmo: {
    t: ico('grafico') + ' Seu ritmo real',
    x: 'É quanto o seu tempo costuma render nos seus dias de trabalho — o lucro dividido pelas horas (do "Bora rodar" até o "Encerrar o dia"). Serve para comparar a sua meta com a sua realidade, sem número inventado.',
    e: 'Exemplo: lucrou <b>R$ 210</b> em <b>7 horas</b> → <b>R$ 30/hora</b>. Se a sua meta pedir R$ 125/h, eu aviso que está pesada. (Só valem dias com o slider e a receita marcados juntos.)'
  }
};
function abrirAjudaCard(qual) {
  const a = AJUDAS_CARD[qual];
  if (!a) return;
  document.getElementById('ajudaCardTitulo').textContent = a.t;
  document.getElementById('ajudaCardTexto').innerHTML    = a.x;
  const ex = document.getElementById('ajudaCardExemplo');
  if (a.e) { ex.innerHTML = a.e; ex.style.display = 'block'; } else { ex.style.display = 'none'; }
  document.getElementById('modalAjudaCard').style.display = 'flex';
}

// ─── MANUTENÇÃO ──────────────────────────────────────────────
const MANUT_MOTO = [
  { key: 'oleo',     nome: 'Troca de óleo',    intervalo: 3000 },
  { key: 'pneus',    nome: 'Pneu traseiro',    intervalo: 10000 },
  { key: 'corrente', nome: 'Corrente/relação', intervalo: 5000 },
];
const MANUT_CARRO = [
  { key: 'oleo',  nome: 'Troca de óleo',     intervalo: 3000  },
  { key: 'pneus', nome: 'Rodízio de pneus',  intervalo: 10000 },
  { key: 'freio', nome: 'Pastilha de freio', intervalo: 30000 },
];
let configManut = MANUT_MOTO;
const manutencoes = {
  item1: { kmUltima: 0, intervalo: 3000, key: 'oleo',  nome: '' },
  item2: { kmUltima: 0, intervalo: 1000, key: 'pneus', nome: '' },
  item3: { kmUltima: 0, intervalo: 5000, key: 'corrente', nome: '' },
};
let manutAlvo = null;   // qual item está aberto no modal

// manutenção é DO VEÍCULO: o óleo da moto não é o óleo do carro.
// Veículo novo começa sem dados → o card diz "toque p/ registrar".
function lerManutVeic() {
  const vid   = vidAtivo();
  const todos = lerLS('manutPorVeiculo', null);
  if (todos && vid) return todos[vid] || {};
  return lerLS('manutencaoDados', {});           // antes da migração
}
function salvarManutVeic(dados) {
  const vid = vidAtivo();
  if (!vid) { salvarLS('manutencaoDados', dados); return; }
  const todos = lerLS('manutPorVeiculo', {}) || {};
  todos[vid] = dados;
  salvarLS('manutPorVeiculo', todos);
}
function configurarManutencaoPorVeiculo(veiculo) {
  configManut = veiculo === 'carro' ? MANUT_CARRO : MANUT_MOTO;
  const salvos = lerManutVeic();
  configManut.forEach((cfg, i) => {
    const n = i + 1;
    const s = salvos[cfg.key] || {};
    manutencoes['item' + n].key       = cfg.key;
    manutencoes['item' + n].nome      = cfg.nome;
    manutencoes['item' + n].intervalo = (s.intervalo != null) ? s.intervalo : cfg.intervalo;  // usa o salvo se existir
    manutencoes['item' + n].kmUltima  = (s.kmUltima  != null) ? s.kmUltima  : 0;
    document.getElementById('manutNome' + n).textContent      = cfg.nome;
    document.getElementById('manutIntervalo' + n).textContent = 'Intervalo: ' + manutencoes['item' + n].intervalo.toLocaleString('pt-BR') + ' km';
    document.getElementById('alertaNome' + n).textContent     = cfg.nome;
    const luzIc = document.getElementById('luzIc' + n);
    if (luzIc) luzIc.innerHTML = ico(MNT_ICONES[cfg.key] || 'oleo');
  });
}
// NOVO: salva as trocas no localStorage (antes elas sumiam ao recarregar!)
function salvarManutencao() {
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  const salvos = lerManutVeic();
  [1, 2, 3].forEach(n => {
    const it = manutencoes['item' + n];
    if (!it.key) return;
    const antes = salvos[it.key] || {};
    // ⚠️ `dataUltima` NÃO existia. A nuvem recebia hojeISO() como se fosse a
    // data da troca — ou seja, toda troca antiga virava "hoje" no banco.
    // Agora só carimba a data quando o KM MUDOU (que é quando houve troca de
    // verdade); mexer no intervalo não é trocar peça.
    const trocou = (antes.kmUltima !== it.kmUltima) && it.kmUltima > 0;
    salvos[it.key] = {
      kmUltima: it.kmUltima,
      intervalo: it.intervalo,
      dataUltima: trocou ? hojeISO() : (antes.dataUltima || null)
    };
  });
  salvarManutVeic(salvos);
  // Supabase: uma linha por item de manutenção do veículo. A identidade é
  // veículo + tipo (não o id numérico da tabela), porque é assim que o app
  // pensa: cada veículo tem a sua troca de óleo, o seu rodízio de pneus.
  if (typeof salvarRegistroHibrido === 'function') {
    const vid = vidAtivo();
    [1, 2, 3].forEach(n => {
      const it = manutencoes['item' + n];
      if (!it.key || it.kmUltima == null) return;
      // ⚠️ Subia hojeISO() SEMPRE — a nuvem passou a achar que toda troca foi
      // feita no dia em que o motorista mexeu na tela. Trocar o óleo em maio e
      // ajustar o intervalo em agosto gravava "trocou em agosto".
      // Agora vai a data guardada de verdade, e null quando o app não sabe —
      // null é honesto, data errada é pior que dado nenhum.
      const _mv = (lerManutVeic() || {})[it.key] || {};
      salvarRegistroHibrido('manutencao', {
        veiculo_id:  vid,
        tipo:        it.key,
        data_ultima: _mv.dataUltima || null,
        km_ultimo:   it.kmUltima,
        km_proximo:  (it.kmUltima != null && it.intervalo) ? (it.kmUltima + it.intervalo) : null
      }, 'usuario_id,veiculo_id,tipo').catch(function () {});
    });
  }
}
// toque no velocímetro = atalho pra registrar a receita (a ação nº 1 do app)
function gaugeClique() {
  const nav = document.getElementById('navFinancas');
  if (nav) nav.click();
  setTimeout(function () {
    const btn = document.getElementById('btnRegistrarReceita');
    if (btn) btn.click();
  }, 60);
}
function atualizarAlerta(idStatus, idAlerta, idBarra, item) {
  const el = document.getElementById(idAlerta);
  const st = document.getElementById(idStatus);
  const barra = document.getElementById(idBarra);
  el.classList.remove('vermelho', 'amarelo', 'verde');
  if (!item.kmUltima) {                       // troca ainda não registrada (usuário novo)
    st.textContent = 'toque p/ registrar';
    // estado vazio é NEUTRO (cinza): laranja é moeda de alerta, não de convite
    if (barra) barra.style.width = '0%';
    return;
  }
  // referência acima do odômetro atual (km corrigido / veículo trocado):
  // não dá pra contar km a partir de um número que não existe mais
  if (item.kmUltima > kmAtual) {
    st.textContent = 'toque p/ registrar';
    if (barra) barra.style.width = '0%';
    return;
  }
  const usado    = kmAtual - item.kmUltima;
  const restante = item.intervalo - usado;
  const pctUsado = Math.max(0, Math.min(100, (usado / item.intervalo) * 100));
  const restPct  = restante / item.intervalo;
  st.textContent = restante <= 0 ? 'Vencida' : 'faltam ' + restante + ' km';
  el.classList.add(restPct <= 0.2 ? 'vermelho' : restPct <= 0.8 ? 'amarelo' : 'verde');
  if (barra) barra.style.width = pctUsado + '%';
}
function atualizarTelaManutencao() {
  [1, 2, 3].forEach(n => {
    const it    = manutencoes['item' + n];
    const rest  = document.getElementById('restanteItem' + n);
    const barra = document.getElementById('manutBarra' + n);
    const card  = document.getElementById('manutCard' + n);
    const ic    = document.getElementById('manutIc' + n);
    if (ic) ic.innerHTML = ico(MNT_ICONES[it.key] || 'chave');
    document.getElementById('kmUltimaItem' + n).textContent  = it.kmUltima ? it.kmUltima.toLocaleString('pt-BR') + ' km' : '—';
    document.getElementById('manutIntervalo' + n).textContent = 'a cada ' + it.intervalo.toLocaleString('pt-BR') + ' km';

    if (!it.kmUltima) {                       // troca ainda não registrada
      rest.textContent = 'registrar'; rest.style.color = 'var(--signal)';
      if (barra) { barra.style.width = '0%'; barra.style.background = 'var(--signal)'; }
      return;
    }
    // ⚠️ Última troca registrada ACIMA do odômetro atual: acontece quando o km
    // foi corrigido (ou o veículo trocado). A referência não vale mais — o app
    // pede pra registrar de novo em vez de mostrar "faltam 105.877.613 km".
    if (it.kmUltima > kmAtual) {
      rest.textContent = 'registrar de novo'; rest.style.color = 'var(--signal)';
      document.getElementById('kmUltimaItem' + n).textContent = 'km corrigido';
      if (barra) { barra.style.width = '0%'; barra.style.background = 'var(--signal)'; }
      return;
    }
    const usado    = kmAtual - it.kmUltima;
    const restante = it.intervalo - usado;
    const pctUsado = Math.max(0, Math.min(100, (usado / it.intervalo) * 100));
    const restPct  = restante / it.intervalo;
    const cor = restPct <= 0.2 ? 'var(--danger)' : restPct <= 0.8 ? 'var(--signal)' : 'var(--money)';
    rest.textContent = restante <= 0 ? 'Vencida' : 'faltam ' + restante + ' km';
    rest.style.color = cor;
    if (barra) { barra.style.width = pctUsado + '%'; barra.style.background = cor; }
  });
}
function atualizarTodosAlertas() {
  atualizarAlerta('statusItem1', 'alertaItem1', 'alertaBarra1', manutencoes.item1);
  atualizarAlerta('statusItem2', 'alertaItem2', 'alertaBarra2', manutencoes.item2);
  atualizarAlerta('statusItem3', 'alertaItem3', 'alertaBarra3', manutencoes.item3);
}

// ═══════════════════════════════════════════════════════════════
//  MODAL MANUTENÇÃO (toque no alerta → telinha bonita)
// ═══════════════════════════════════════════════════════════════
const MNT_ICONES = { oleo:'oleo', pneus:'pneu', corrente:'corrente', freio:'freio' };
function abrirManutencao(n) {
  manutAlvo = n;
  const it = manutencoes['item' + n];
  const usado    = kmAtual - it.kmUltima;
  const restante = it.intervalo - usado;
  const pctUsado = it.kmUltima ? Math.max(0, Math.min(100, (usado / it.intervalo) * 100)) : 0;
  const restPct  = restante / it.intervalo;

  document.getElementById('mntIcone').innerHTML = ico(MNT_ICONES[it.key] || 'chave');
  document.getElementById('mntNome').textContent  = it.nome;
  const st = document.getElementById('mntStatus');
  const orfao = it.kmUltima && it.kmUltima > kmAtual;   // referência acima do odômetro atual
  if (!it.kmUltima) { st.textContent = 'registre a 1ª troca'; st.className = 'mnt-status num c-amar'; }
  else if (orfao)   { st.textContent = 'registre de novo';    st.className = 'mnt-status num c-amar'; }
  else {
    st.textContent = restante <= 0 ? 'Vencida — troque logo!' : 'faltam ' + restante + ' km';
    st.className = 'mnt-status num ' + (restPct <= 0.2 ? 'c-verm' : restPct <= 0.8 ? 'c-amar' : 'c-verde');
  }
  document.getElementById('mntBarra').style.width = (orfao ? 0 : pctUsado) + '%';
  document.getElementById('mntUltima').textContent   = !it.kmUltima ? 'não registrada'
                                                     : orfao ? 'km corrigido — registre de novo'
                                                     : 'em ' + it.kmUltima.toLocaleString('pt-BR') + ' km';
  document.getElementById('mntIntervalo').textContent = it.intervalo.toLocaleString('pt-BR') + ' km';
  document.getElementById('mntProxima').textContent   = (it.kmUltima && !orfao) ? 'em ' + (it.kmUltima + it.intervalo).toLocaleString('pt-BR') + ' km' : 'após registrar';
  document.getElementById('mntInputIntervalo').value  = it.intervalo;
  document.getElementById('modalManutencao').style.display = 'flex';
}
document.querySelector('#mntBtnFechar').addEventListener('click', () => { document.getElementById('modalManutencao').style.display = 'none'; });
document.querySelector('#mntBtnTroca').addEventListener('click', function() {
  if (!manutAlvo) return;
  manutencoes['item' + manutAlvo].kmUltima = kmAtual;
  salvarManutencao();
  atualizarTodosAlertas();
  atualizarTelaManutencao();
  document.getElementById('modalManutencao').style.display = 'none';
  toast('🔧 Troca registrada!');
  ptsHook('manutencao', 'man:' + hojeISO());
  dispararBalaoProg('manutencao');          // ensina na 1ª troca registrada (1x só)
});
document.querySelector('#mntBtnSalvarIntervalo').addEventListener('click', function() {
  if (!manutAlvo) return;
  const v = numBR(document.getElementById('mntInputIntervalo').value);
  if (!v || v <= 0) { toast('Intervalo inválido', 'erro'); return; }
  manutencoes['item' + manutAlvo].intervalo = Math.round(v);
  salvarManutencao();
  atualizarTodosAlertas();
  atualizarTelaManutencao();
  abrirManutencao(manutAlvo);   // redesenha o modal com o novo intervalo
  toast('✅ Intervalo salvo!');
});

// ─── GPS ─────────────────────────────────────────────────────
function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── SLIDER (INICIAR / FINALIZAR TURNO) ──────────────────────
function getMax() { return sliderContainer.offsetWidth - sliderThumb.offsetWidth - 8; }
function moverThumb(x) { x = Math.max(0, Math.min(x, getMax())); sliderThumb.style.left = (x+4)+'px'; return x; }
sliderContainer.addEventListener('mousedown',  e => { dragging = true; startX = e.clientX - currentX; });
sliderContainer.addEventListener('touchstart', e => { dragging = true; startX = e.touches[0].clientX - currentX; }, { passive: true });
document.addEventListener('mousemove',  e => { if (dragging) currentX = moverThumb(e.clientX - startX); });
document.addEventListener('touchmove',  e => { if (dragging) currentX = moverThumb(e.touches[0].clientX - startX); }, { passive: true });
document.addEventListener('mouseup',  finalizarArraste);
document.addEventListener('touchend', finalizarArraste);

function finalizarArraste() {
  if (!dragging) return;
  dragging = false;
  if (currentX >= getMax() * 0.85) {
    if (!turnoIniciado) {
      // ── INICIAR TURNO ──
      turnoIniciado = true;
      // NOVO: marca a hora de início do turno (é daqui que sai o ganho/hora)
      salvarLS('turnoAtivo', { inicio: Date.now() });
      mostrarTurnoLive();
      sliderContainer.classList.add('finalizar');
      sliderTexto.innerHTML = ico('parar') + '  Encerrar o dia ' + ico('seta-dir');
      moverThumb(0); currentX = 0;
      navigator.geolocation.getCurrentPosition(
        pos => { pontoA = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      // ── FINALIZAR TURNO ──
      turnoIniciado = false;
      sliderContainer.classList.remove('finalizar');
      sliderTexto.innerHTML = iconeVeiculo + '  Bora rodar ' + ico('seta-dir');
      moverThumb(0); currentX = 0;
      navigator.geolocation.getCurrentPosition(
        pos => {
          pontoB = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const dist = (pontoA && pontoB) ? Math.round(calcularDistancia(pontoA.lat, pontoA.lng, pontoB.lat, pontoB.lng)) : null;
          abrirModalKm(dist);
        },
        () => { abrirModalKm(null); },   // GPS negado/indisponível
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  } else { moverThumb(0); currentX = 0; }
}

// abre a telinha de finalizar turno, com referência do último km e palpite do GPS
function abrirModalKm(gpsDist) {
  const ultimo = ultimoOdoAtivo();
  const vAt    = veiculoAtivo();

  // linha de referência — sempre dizendo DE QUAL veículo é o número
  if (ultimo !== null) kmRef.innerHTML = esc(nomeVeiculo(vAt)) + ', último registro: <b class="num">' + fmtKm(ultimo) + ' km</b>';
  else                 kmRef.innerHTML = 'Primeiro registro — digite o km do painel';

  // ⚠️ O QUE O GPS MEDE AQUI É LINHA RETA entre onde o turno começou e onde
  // terminou — NÃO é o quanto ele rodou. Quem sai de casa, roda 200 km e volta
  // pra casa tem linha reta ZERO. Mesmo assim isso era mostrado como "GPS
  // estimou ~X km rodados hoje" e, pior, JÁ PREENCHIA o campo do odômetro:
  // motorista exausto confirmava e o dia inteiro virava 15 km. É a origem mais
  // provável dos registros de 1,4 km/L que o detector vinha caçando.
  // Agora o campo nasce VAZIO e a linha reta vira o que ela realmente é: um
  // PISO. Rodou no mínimo aquilo — nunca menos.
  _gpsLinhaReta = (gpsDist !== null && gpsDist > 0) ? gpsDist : null;
  inputKm.value = '';
  kmGps.style.display = 'block';
  kmGps.classList.remove('neutro');
  if (gpsDist === null) {
    kmGps.classList.add('neutro');
    kmGps.innerHTML = ico('pin') + ' GPS indisponível — digite o km do painel';
  } else if (gpsDist <= 0) {
    // linha reta zero: ele voltou ao ponto de partida. Não diz nada sobre
    // distância, então o app não finge que diz.
    kmGps.classList.add('neutro');
    kmGps.innerHTML = ico('pin') + ' Você terminou onde começou';
  } else {
    kmGps.innerHTML = ico('pin') + ' Você terminou a <b class="num">~' + gpsDist + ' km</b> de onde começou — rodou pelo menos isso';
  }
  // Faz dias que ele não fecha? Diz isso ANTES de confirmar, porque o número que
  // ele vai digitar não é "o km de hoje" — é o de todos esses dias juntos.
  const nDias = diasDesdeUltimoRegistro();
  const avisoD = document.getElementById('kmVaoDias');
  if (avisoD) {
    if (nDias > 1 && ultimo !== null) {
      avisoD.innerHTML = ico('calendario') + ' Faz <b>' + nDias + ' dias</b> desde seu último registro — ' +
                         'esse km cobre todos eles, não só hoje.';
      avisoD.style.display = 'block';
    } else {
      avisoD.style.display = 'none';
    }
  }
  kmErro.style.display = 'none';
  atualizarKmVivo();
  modal.style.display = 'flex';
  if (!inputKm.value) inputKm.focus();
}

// mostra ao vivo quantos km rodou neste turno enquanto digita
// ─── DIGITAR SÓ O FINAL DO ODÔMETRO ──────────────────────────
// O odômetro é um número de 6 dígitos que muda pouco por dia: de 105.387 para
// 105.567 os três primeiros são os mesmos. Depois de 10 horas de trânsito,
// digitar 6 dígitos é atrito à toa. Aqui, se ele digitar menos dígitos que o
// último registro, o app completa com o começo do número anterior.
// A virada de casa é tratada: último 105.998 + ele digita "043" = 106.043
// (e não 105.043, que seria andar pra trás).
// Nada é adivinhado às escondidas: o valor entendido aparece na tela antes
// dele confirmar.
function interpretarKm(texto, ultimo) {
  const digitos = String(texto || '').replace(/\D/g, '');
  if (!digitos) return null;
  const n = Number(digitos);
  if (ultimo == null) return n;                          // 1º registro: vale o que digitou
  const casasUltimo = String(Math.floor(ultimo)).length;
  if (digitos.length >= casasUltimo) return n;           // digitou o número inteiro
  const passo = Math.pow(10, digitos.length);
  let cand = Math.floor(ultimo / passo) * passo + n;
  if (cand < ultimo) cand += passo;                      // virou a casa (105.998 → 106.043)
  return cand;
}
// Distância em linha reta entre o ponto de início e o de fim do turno.
// NÃO é o quanto ele rodou — serve só como PISO: quem terminou a 15 km de
// onde começou rodou no mínimo 15 km. Guardada só enquanto o modal está aberto.
let _gpsLinhaReta = null;
function atualizarKmVivo() {
  const ultimo   = ultimoOdoAtivo();
  const digitados = String(inputKm.value || '').replace(/\D/g, '');
  const valor    = interpretarKm(inputKm.value, ultimo);
  const atalho   = document.getElementById('kmAtalho');
  // a dica do atalho só aparece pra quem já tem um registro anterior
  if (atalho) atalho.style.display = (ultimo !== null && !digitados) ? 'block' : 'none';
  if (valor === null) { kmVivo.style.display = 'none'; return; }

  // completou o número? mostra o total entendido, pra ele conferir antes de salvar
  const completou = ultimo !== null && digitados.length < String(Math.floor(ultimo)).length;
  const prefixo   = completou ? '<b class="num">' + fmtKm(valor) + ' km</b> · ' : '';

  if (ultimo !== null && valor > ultimo && (valor - ultimo) <= KM_SALTO_SUSPEITO) {
    const rodou = valor - ultimo;
    kmVivo.style.display = 'block';
    const nd = diasDesdeUltimoRegistro();
    const quando = nd > 1 ? ' km rodados nesses ' + nd + ' dias' : ' km rodados hoje';
    kmVivo.innerHTML = prefixo + '<b class="num">' + fmtKm(rodou) + '</b>' + quando;
    // PISO DO GPS: ele não pode ter rodado menos que a linha reta entre A e B
    if (_gpsLinhaReta > 0 && rodou < _gpsLinhaReta) {
      kmErro.textContent = 'Você terminou a ' + fmtKm(_gpsLinhaReta) + ' km de onde começou, ' +
                           'então rodou no mínimo isso. Confira o km do painel.';
      kmErro.style.display = 'block';
    } else {
      kmErro.style.display = 'none';
    }
  } else if (ultimo !== null && completou) {
    // entendeu o número mas ele não serve (pra trás ou salto absurdo): mostra mesmo assim
    kmVivo.style.display = 'block';
    kmVivo.innerHTML = 'entendi <b class="num">' + fmtKm(valor) + ' km</b>';
  } else {
    kmVivo.style.display = 'none';
  }
}

// ─── MODAL KM (confirma o turno) ─────────────────────────────
btnCancelar.addEventListener('click', () => { modal.style.display = 'none'; });
btnConfirmar.addEventListener('click', function() {
  const valor = interpretarKm(inputKm.value, ultimoOdoAtivo());   // aceita o número inteiro ou só o final
  if (!valor || valor <= 0) {
    kmErro.textContent = 'Digite o km total do painel do seu veículo.';
    kmErro.style.display = 'block'; return;
  }
  kmErro.style.display = 'none';

  // O app NÃO bloqueia mais e NÃO aceita calado: ele pergunta.
  //  - painel pra trás  → é outro veículo, ou o número saiu errado
  //  - salto gigante    → mesma coisa (ou foi um dia muito longo mesmo)
  const ultimo = ultimoOdoAtivo();
  if (ultimo !== null) {
    if (valor < ultimo)                            { abrirTrocaVeic('menor', valor, ultimo); return; }
    if (valor - ultimo > KM_SALTO_SUSPEITO)        { abrirTrocaVeic('maior', valor, ultimo); return; }
    // impossível rodar menos que a linha reta entre o início e o fim do turno
    if (_gpsLinhaReta > 0 && (valor - ultimo) < _gpsLinhaReta) {
      kmErro.textContent = 'Você terminou a ' + fmtKm(_gpsLinhaReta) + ' km de onde começou, ' +
                           'então rodou no mínimo isso. Confira o km do painel.';
      kmErro.style.display = 'block';
      return;
    }
  }
  _gpsLinhaReta = null;
  aplicarKmEFecharTurno(valor);
});

// ─── TROCA DE VEÍCULO ────────────────────────────────────────
// Nasce onde o problema aparece (no modal do km), não numa tela de
// "gerenciar veículos" que ninguém abriria.
let _veicCtx     = null;    // { valor, motivo }
let _veicTipoSel = 'moto';

function abrirTrocaVeic(motivo, valor, ultimo) {
  _veicCtx = { valor: valor, motivo: motivo };
  const vAt  = veiculoAtivo();
  const nome = nomeVeiculo(vAt);
  const tit  = document.getElementById('veicTitulo');
  const desc = document.getElementById('veicDesc');

  if (motivo === 'menor') {
    tit.textContent = 'O painel voltou pra trás';
    desc.innerHTML  = 'Você digitou <b class="num">' + fmtKm(valor) + ' km</b>, e ' + esc(nome) +
                      ' parou em <b class="num">' + fmtKm(ultimo) + ' km</b>. Odômetro não anda pra trás — ' +
                      'então ou esse km é de outro veículo, ou o número saiu errado.';
  } else {
    const maior = maiorKmDia();
    tit.textContent = fmtKm(valor - ultimo) + ' km num dia?';
    desc.innerHTML  = 'É o que dá entre <b class="num">' + fmtKm(ultimo) + '</b> e <b class="num">' + fmtKm(valor) + ' km</b>.' +
                      (maior ? ' Seu maior dia até hoje foi <b class="num">' + fmtKm(maior) + ' km</b>.' : '') +
                      ' Antes de eu botar isso na conta: o que rolou?';
  }

  const opts = [];
  const cand = veiculoQueBateCom(valor);
  if (cand) {
    opts.push('<button type="button" class="veic-op" onclick="veicVoltarPara(\'' + cand.id + '\')">' +
      '<span class="veic-op-ic">' + iconeDoTipo(cand.tipo) + '</span>' +
      '<span class="veic-op-txt"><b>Voltei pra ' + esc(nomeVeiculo(cand)) + '</b>' +
      '<small>o painel dela parou em ' + fmtKm(cand.odo) + ' km — bate certinho</small></span></button>');
  }
  opts.push('<button type="button" class="veic-op" onclick="veicAbrirForm()">' +
    '<span class="veic-op-ic">' + ico('mais') + '</span>' +
    '<span class="veic-op-txt"><b>Troquei de veículo</b><small>é um veículo que o app ainda não conhece</small></span></button>');
  if (motivo === 'menor') {
    // ⚠️ Sem esta saída o motorista fica preso: se o número GUARDADO é que
    // está errado, ele digita o valor certo, é recusado, volta pro campo,
    // digita certo de novo... em loop. A única fuga seria cadastrar um
    // veículo falso — sujando os dados pra sempre.
    opts.push('<button type="button" class="veic-op" onclick="veicCorrigirGuardado()">' +
      '<span class="veic-op-ic">' + ico('lapis') + '</span>' +
      '<span class="veic-op-txt"><b>O km guardado está errado</b>' +
      '<small>o certo é o que estou digitando agora — corrigir o registro anterior</small></span></button>');
  }
  if (motivo === 'maior') {
    opts.push('<button type="button" class="veic-op" onclick="veicRodeiIsso()">' +
      '<span class="veic-op-ic" style="color:var(--money)">' + ico('check') + '</span>' +
      '<span class="veic-op-txt"><b>Rodei isso mesmo</b><small>foi um dia longo — pode contar</small></span></button>');
  }
  document.getElementById('veicOpcoes').innerHTML = opts.join('');
  document.getElementById('veicPergunta').style.display = 'block';
  document.getElementById('veicForm').style.display     = 'none';
  document.getElementById('veicErro').style.display     = 'none';
  document.getElementById('modalVeic').style.display    = 'flex';
}
function fecharTrocaVeic() { document.getElementById('modalVeic').style.display = 'none'; }

function veicAbrirForm() {
  _veicTipoSel = tipoVeiculoAtivo() === 'carro' ? 'moto' : 'carro';   // palpite: quem troca costuma trocar de tipo
  veicSelTipo(_veicTipoSel);
  document.getElementById('veicModelo').value = '';
  document.getElementById('veicPlaca').value  = '';
  document.getElementById('veicErro').style.display     = 'none';
  document.getElementById('veicPergunta').style.display = 'none';
  document.getElementById('veicForm').style.display     = 'block';
}
function veicSelTipo(t) {
  _veicTipoSel = t;
  document.getElementById('veicTipoMoto').classList.toggle('on',  t === 'moto');
  document.getElementById('veicTipoCarro').classList.toggle('on', t === 'carro');
  const mod = document.getElementById('veicModelo');
  if (mod) mod.placeholder = t === 'carro' ? 'Modelo (ex: Onix 1.0)' : 'Modelo (ex: Honda CG 160)';
}
// volta pra um veículo que o app já conhece
function veicVoltarPara(vid) {
  const valor = _veicCtx ? _veicCtx.valor : null;
  if (valor == null) return;
  trocarVeiculo(vid);
  fecharTrocaVeic();
  aplicarKmEFecharTurno(valor);
  toast('🔄 De volta pra ' + nomeVeiculo(veiculoAtivo()));
}
// O número GUARDADO é que estava errado. Descarta a base errada e deixa o
// fechamento seguir normal — o motorista não perde as horas, o streak nem a
// reserva do dia. O km rodado hoje fica desconhecido de propósito: sem base
// confiável, o app não chuta (aplicarKmEFecharTurno já trata isso sozinho,
// porque kmRodadoHoje() devolve null quando não há registro anterior).
function veicCorrigirGuardado() {
  const valor = _veicCtx ? _veicCtx.valor : null;
  if (valor == null) return;
  const rh = lerLS('registroHoje', null);

  localStorage.removeItem('registroAnterior');   // essa régua estava errada
  localStorage.removeItem('registroHoje');       // idem — o valor certo entra agora
  const mapa = lerLS('kmPorDia', {});            // km calculado sobre base errada some
  delete mapa[hojeISO()];
  if (rh && rh.data) delete mapa[rh.data];
  salvarLS('kmPorDia', mapa);

  fecharTrocaVeic();
  aplicarKmEFecharTurno(valor);
  // Se a manutenção estava ancorada no km antigo, ela perde a referência.
  // Melhor dizer agora do que ele descobrir sozinho vendo "registrar de novo".
  const perdeuManut = [1,2,3].some(n => {
    const it = manutencoes['item' + n];
    return it && it.kmUltima && it.kmUltima > valor;
  });
  if (perdeuManut) {
    setTimeout(function () {
      toast('🔧 Registre as manutenções de novo — elas usavam o km antigo');
    }, 2600);
  }
  toast('🛣️ Corrigido! A contagem de km recomeça a partir daqui.');
}

// era um dia longo mesmo: aceita o número como o motorista disse
function veicRodeiIsso() {
  const valor = _veicCtx ? _veicCtx.valor : null;
  if (valor == null) return;
  fecharTrocaVeic();
  aplicarKmEFecharTurno(valor);
}
// cadastra o veículo novo e passa a rodar nele
document.getElementById('btnVeicSalvar').addEventListener('click', function() {
  const modelo = document.getElementById('veicModelo').value.trim();
  const erro   = document.getElementById('veicErro');
  if (!modelo) {
    erro.textContent = _veicTipoSel === 'carro' ? 'Informe o modelo do carro.' : 'Informe o modelo da moto.';
    erro.style.display = 'block'; return;
  }
  erro.style.display = 'none';
  const valor = _veicCtx ? _veicCtx.valor : null;
  if (valor == null) { fecharTrocaVeic(); return; }
  const novo = criarVeiculo(_veicTipoSel, modelo, document.getElementById('veicPlaca').value, valor);
  trocarVeiculo(novo.id);
  fecharTrocaVeic();
  aplicarKmEFecharTurno(valor);
  toast('✅ ' + nomeVeiculo(novo) + ' no ar — seu histórico continua todo aí');
});
document.getElementById('btnVeicCancelar').addEventListener('click', function() {
  document.getElementById('veicForm').style.display     = 'none';
  document.getElementById('veicPergunta').style.display = 'block';
});
document.getElementById('btnVeicVoltar').addEventListener('click', function() {
  fecharTrocaVeic();
  inputKm.select();
});

// troca o veículo ativo. NÃO apaga nem reescreve nada do histórico.
function trocarVeiculo(vidNovo) {
  const vs     = lerVeiculos();
  const antigo = vs.find(x => x.id === vidAtivo());
  if (antigo) antigo.ate = hojeISO();
  const novo = vs.find(x => x.id === vidNovo);
  if (novo) { novo.ate = null; novo.desde = hojeISO(); }
  salvarVeiculos(vs);
  setVidAtivo(vidNovo);
  aplicarVeiculoNaTela();
}

// põe o veículo ativo na tela inteira (header, ícone, manutenção, odômetro)
function aplicarVeiculoNaTela() {
  const v = veiculoAtivo();
  const p = getPerfil();
  const hv = document.getElementById('headerVeiculo');
  if (hv) {
    hv.textContent = v ? (nomeVeiculo(v) + (v.placa ? ' · ' + v.placa : ''))
                       : ((p.modelo || '') + (p.placa ? ' · ' + p.placa : ''));
  }
  iconeVeiculo = iconeDoTipo(tipoVeiculoAtivo());
  if (typeof sliderThumb !== 'undefined' && sliderThumb) sliderThumb.innerHTML = iconeVeiculo;
  if (typeof sliderTexto !== 'undefined' && sliderTexto && !turnoIniciado) sliderTexto.innerHTML = iconeVeiculo + '  Bora rodar ' + ico('seta-dir');
  configurarManutencaoPorVeiculo(tipoVeiculoAtivo());
  kmAtual = (v && v.odo != null) ? v.odo : 0;
  renderOdometro();
  atualizarTodosAlertas();
  atualizarTelaManutencao();
  atualizarCustoRealKm();
  pintarKmHoje();
}

// ─── GRAVA O KM E FECHA O DIA ────────────────────────────────
// ─── QUANTOS DIAS ESTE FECHAMENTO COBRE ──────────────────────
// O app calculava "km rodados hoje" como (odômetro de agora − último registro),
// SEM olhar a data. Quem ficasse 3 dias sem registrar tinha os 600 km dos três
// dias lançados como se fossem de um só: a média diária inflava, o custo por km
// despencava, e o motorista passava a achar que roda muito mais barato do que
// roda. Agora o app conta os dias e guarda essa informação junto.
function diasDesdeUltimoRegistro() {
  const ra = lerLS('registroAnterior', null);
  const rh = lerLS('registroHoje', null);
  const base = (rh && rh.data) ? rh : ra;                 // o registro que serve de régua
  if (!base || !base.data) return 1;
  const d1 = new Date(String(base.data).slice(0, 10) + 'T12:00:00');
  // compara com o DIA DO TURNO: fechando 00:20, o turno é da véspera, então
  // o vão é contado a partir dela — senão acusaria um dia a mais.
  const d2 = new Date(diaDoTurno() + 'T12:00:00');
  if (isNaN(d1) || isNaN(d2)) return 1;
  const dias = Math.round((d2 - d1) / 86400000);
  return dias > 0 ? dias : 1;
}
function aplicarKmEFecharTurno(valor) {
  // ⚠️ CORREÇÃO (auditoria): era `new Date().toLocaleDateString()` sem locale
  // — o formato depende do idioma do aparelho (en-US, pt-BR, etc dão strings
  // diferentes pro mesmo dia). Era o ÚNICO lugar do app que não usava
  // hojeISO(). Se o motorista mudasse o idioma do celular entre dois
  // fechamentos, a comparação de "mesmo dia" quebrava silenciosamente.
  // `hoje` aqui é o DIA DO TURNO, não o do relógio: turno que vira a meia-noite
  // pertence ao dia em que começou. Ver diaDoTurno().
  const hoje    = diaDoTurno();
  const vidUsar = vidAtivo();
  const registroAtual = lerLS('registroHoje', null);
  const _diasDoFechamento = diasDesdeUltimoRegistro();   // ANTES de sobrescrever o registroHoje

  // só empurra pro "anterior" se for de OUTRO dia ou de OUTRO veículo.
  // Registrar duas vezes no mesmo dia é EDIÇÃO — não pode mexer na régua.
  if (registroAtual && (registroAtual.data !== hoje || (registroAtual.vid || null) !== vidUsar)) {
    salvarLS('registroAnterior', registroAtual);
  }
  salvarLS('registroHoje', { km: valor, data: hoje, vid: vidUsar });
  setOdoVeiculo(vidUsar, valor);

  kmAtual = valor;
  pintarKmHoje();
  odometroTotal.innerHTML = ico('estrada') + ' ' + esc(kmAtual) + ' km no total';
  renderOdometro();   // dígitos giram até o km novo 🎰

  // km do dia: fonte única. Só grava quando o app REALMENTE sabe.
  const kmD = kmRodadoHoje();
  kmTurnoAtual = (kmD !== null && kmD > 0) ? kmD : 0;
  if (kmD !== null && kmD > 0) {
    const mapa = lerLS('kmPorDia', {});
    // `dias` = quantos dias esse km cobre. 1 é o normal. Mais que isso quer
    // dizer que ele ficou sem registrar e esse número NÃO é de um dia só —
    // quem consome média por dia precisa saber disso pra não se enganar.
    mapa[hoje] = { km: kmD, vid: vidUsar, dias: _diasDoFechamento || 1 };
    salvarLS('kmPorDia', mapa);
  }

  // ── fecha o turno e guarda as HORAS rodadas (pro ganho/hora) ──
  const ta = lerLS('turnoAtivo', null);
  if (ta && ta.inicio) {
    let horas = (Date.now() - ta.inicio) / 3600000;   // ms → horas
    // trava de segurança: turno esquecido ligado não vira 12h de trabalho
    if (horas > 16) horas = 16;
    if (horas >= 0.1) {
      const hp = lerLS('horasPorDia', {});
      hp[hoje] = (hp[hoje] || 0) + horas;
      salvarLS('horasPorDia', hp);
    }
    localStorage.removeItem('turnoAtivo');
  }
  esconderTurnoLive();
  ptsHook('turno', 'tur:' + hoje);
  guardarReservaDoDia(hoje);

  atualizarTodosAlertas();
  atualizarTelaManutencao();
  atualizarCustoRealKm();
  atualizarResumoDia();
  atualizarReserva();
  ressincronizarReceitaHoje();

  // streak: conta 1 vez por dia; se pulou mais de 1 dia, a sequência recomeça do 1
  const ultimoDiaStreak = localStorage.getItem('streakUltimoDia');
  if (ultimoDiaStreak !== hoje) {
    // "ontem" em relação ao DIA DO TURNO, não ao relógio de agora.
    streak = (ultimoDiaStreak === diaAnteriorISO(hoje)) ? streak + 1 : 1;
    salvarLS('streak', streak);
    sincronizarPerfil();
    salvarLS('streakUltimoDia', hoje);
  }
  streakDisplay.textContent = '🔥 ' + streak;
  modal.style.display = 'none';
  inputKm.value = '';
  pontoA = null; pontoB = null;
  enfileirarBalaoProg('encerrarDia');   // 1º da fila — NÃO mexe em km, só ensina (dispara após o streak)
  abrirModalCombustivel();
}

// ═══════════════════════════════════════════════════════════════
//  CORRIGIR O KM (toque no odômetro)
//  ─────────────────────────────────────────────────────────────
//  Existe porque o motorista digita errado — e até aqui não havia
//  NENHUMA forma de desfazer. O número errado virava a base de
//  todas as contas seguintes (custo/km, manutenção, km do dia).
//
//  REGRAS (a cadeia de km é a parte mais frágil do app):
//   • Corrige APENAS o último registro. Dias antigos não se mexem:
//     cada dia depende do anterior, e recalcular a corrente inteira
//     é convite a bug pior que o original.
//   • NUNCA empurra pro registroAnterior. Isso é EDIÇÃO do último
//     fechamento, não um fechamento novo — mexer na régua aqui
//     inventaria um dia de trabalho que não existiu.
//   • Não aceita valor menor que o registro anterior (daria km
//     negativo) nem salto absurdo — os mesmos limites do fechamento.
//   • Recalcula kmPorDia do dia daquele registro e ressincroniza
//     tudo que depende dele, inclusive a nuvem.
// ═══════════════════════════════════════════════════════════════
function abrirCorrigirKm() {
  const rh = lerLS('registroHoje', null);
  const ra = lerLS('registroAnterior', null);
  const vAt = veiculoAtivo();
  const ref = document.getElementById('corrKmRef');

  if (!rh && (!vAt || vAt.odo == null)) {
    // nunca registrou nada: não há o que corrigir
    toast('Ainda não há km registrado pra corrigir');
    return;
  }
  const atual = rh ? rh.km : vAt.odo;
  const quando = rh ? (rh.data === hojeISO() ? 'hoje' : 'em ' + new Date(rh.data + 'T12:00:00').toLocaleDateString('pt-BR')) : '';
  let txt = 'Último registro' + (quando ? ' (' + quando + ')' : '') + ': <b class="num">' + fmtKm(atual) + ' km</b>.';
  if (ra && (ra.vid || null) === (rh && rh.vid || vidAtivo())) {
    txt += '<br>Antes dele: <b class="num">' + fmtKm(ra.km) + ' km</b>.';
  }
  ref.innerHTML = txt;
  document.getElementById('corrKmInput').value = atual;
  document.getElementById('corrKmErro').style.display = 'none';
  document.getElementById('corrKmPreview').style.display = 'none';
  document.getElementById('modalCorrigirKm').style.display = 'flex';
  previewCorrecaoKm();
}

// mostra ao vivo quantos km o dia passa a ter com o número digitado
function previewCorrecaoKm() {
  const rh = lerLS('registroHoje', null);
  const ra = lerLS('registroAnterior', null);
  const box = document.getElementById('corrKmPreview');
  const valor = numKm(document.getElementById('corrKmInput').value);
  const mesmoVeic = rh && ra && (rh.vid || null) === (ra.vid || null);
  if (!valor || !mesmoVeic) { box.style.display = 'none'; return; }
  const kmDia = valor - ra.km;
  box.style.display = 'block';
  if (kmDia < 0) {
    box.classList.add('neutro');
    box.innerHTML = 'Esse número é <b>menor</b> que o registro anterior.';
  } else {
    box.classList.remove('neutro');
    box.innerHTML = 'O dia passa a contar <b class="num">' + fmtKm(kmDia) + ' km</b> rodados';
  }
}

document.getElementById('btnCorrKmCancelar').addEventListener('click', function () {
  document.getElementById('modalCorrigirKm').style.display = 'none';
});
document.getElementById('btnCorrKmSalvar').addEventListener('click', function () {
  const valor = numKm(document.getElementById('corrKmInput').value);
  const erro  = document.getElementById('corrKmErro');
  if (!valor || valor <= 0) { erro.textContent = 'Digite o km do painel.'; erro.style.display = 'block'; return; }

  const rh = lerLS('registroHoje', null);
  const ra = lerLS('registroAnterior', null);
  // não pode ficar abaixo do registro anterior do MESMO veículo (km negativo)
  if (rh && ra && (rh.vid || null) === (ra.vid || null) && valor < ra.km) {
    erro.innerHTML = 'Não dá: o registro anterior desse veículo é <b>' + fmtKm(ra.km) + ' km</b>. O painel não anda pra trás.';
    erro.style.display = 'block'; return;
  }
  erro.style.display = 'none';
  aplicarCorrecaoKm(valor);
  document.getElementById('modalCorrigirKm').style.display = 'none';
  toast('🛣️ Km corrigido!');
});

// Grava a correção e refaz TUDO que dependia do número errado.
function aplicarCorrecaoKm(valor) {
  const vidUsar = vidAtivo();
  const rh = lerLS('registroHoje', null);

  if (rh) {
    rh.km = valor;                      // edita o registro — NÃO empurra pro anterior
    salvarLS('registroHoje', rh);
  }
  setOdoVeiculo(vidUsar, valor);
  kmAtual = valor;

  // recalcula o km rodado do dia daquele registro
  const diaAlvo = rh ? rh.data : hojeISO();
  const ra = lerLS('registroAnterior', null);
  const mapa = lerLS('kmPorDia', {});
  // ⚠️ `dias` PRECISA sobreviver à correção. O fechamento grava
  // { km, vid, dias:N } quando o registro cobre vários dias, e TODO consumidor
  // faz `(r.dias||1)===1` pra deixar esse registro fora das médias por dia.
  // Regravar sem o campo ressuscitava 680 km de 4 dias como se fossem UM —
  // e esse dia entrava na média que gera o piso.
  const diasAntes = (mapa[diaAlvo] && mapa[diaAlvo].dias) || 1;
  if (rh && ra && (rh.vid || null) === (ra.vid || null)) {
    const kmD = valor - ra.km;
    if (kmD > 0) mapa[diaAlvo] = { km: kmD, vid: vidUsar, dias: diasAntes };
    else         delete mapa[diaAlvo];   // sem km conhecido é melhor que km errado
  } else {
    delete mapa[diaAlvo];                // sem base de comparação: o app não inventa
  }
  salvarLS('kmPorDia', mapa);

  // repinta tudo que usava o número velho
  pintarKmHoje();
  renderOdometro();
  atualizarTodosAlertas();
  atualizarTelaManutencao();
  atualizarCustoRealKm();
  atualizarResumoDia();
  ressincronizarReceitaHoje();   // leva o km_dia corrigido pra nuvem também
  if (document.getElementById('telaFinancas')) atualizarTelaFinancas();
}

// ─── MODAL COMBUSTÍVEL (após finalizar turno) ────────────────
function abrirModalCombustivel() {
  etapaAbasteceu.style.display = 'block';
  modalCombustivel.style.display = 'flex';
}
btnSimAbasteceu.addEventListener('click', function() {
  // Abre o MESMO formulario da aba Combustivel. Antes existiam dois formularios
  // separados fazendo a mesma coisa — foi por isso que o campo de km ficou
  // faltando num deles, e depois o aviso de km suspeito tambem.
  modalCombustivel.style.display = 'none';
  _abastDoTurno = true;
  abrirFormAbastecimento(kmTurnoAtual > 0 ? kmTurnoAtual : null);
});

// aplica o último combustível usado (destaca o botão certo e devolve o nome)
function aplicarUltimoTipo(containerSel) {
  const alvo = lerLS('ultimoTipoComb', 'Gasolina');
  let achou = null;
  document.querySelectorAll(containerSel + ' .tipo-btn').forEach(b => {
    b.classList.remove('ativo');
    if (b.textContent.trim() === alvo) achou = b;
  });
  if (achou) achou.classList.add('ativo');
  return achou ? alvo : 'Gasolina';
}
// Texto de aviso do formulario de abastecimento. Funcao UNICA porque existem
// DUAS telas que registram abastecimento (pos-turno e aba Combustivel) — foi
// exatamente por elas terem codigo separado que o campo de km ficou faltando
// numa delas por muito tempo.
function avisoAbastecimento(v, k, l, tipo) {
  const ehCarro = tipoVeiculoAtivo() === 'carro';
  const fx      = faixaConsumo();
  const faixa   = fx.min + ' a ' + fx.max + ' km por litro';
  // GNV nao entra na checagem de km/L: o motorista costuma completar o
  // cilindro (pequeno, ~15m3) aos poucos e com frequencia, em vez de encher o
  // tanque de uma vez como gasolina/etanol. Com litros e km baixos, qualquer
  // imprecisao na hora de digitar o km pesa muito mais na conta e gera aviso
  // falso num abastecimento normal. O aviso de custo por km (abaixo) continua
  // valendo pra GNV — ele sozinho ja pega km digitado errado, porque nem o
  // GNV mais caro do Brasil chega perto de R$3/km rodado.
  // ⚠️ Os limites aqui eram OUTROS (2 km/L chumbado, sem teto) — diferentes dos
  // que o kmSuspeito() usa no resto do app. Resultado: 31 km/L num carro passava
  // calado no formulário e depois era recusado pelo detector da tela Início.
  // É a mesma dívida que a v3.53 já tinha limpado nos outros dois lugares.
  // Agora quem decide é sempre o kmSuspeito(); aqui só se escolhe o TEXTO.
  if (kmSuspeito({ valor: v, km: k, litros: l, tipo: tipo })) {
    const kpl = (l > 0) ? (k / l) : null;
    if (kpl !== null && kpl < fx.min / 2) {
      return '\u26a0\ufe0f ' + l + 'L para ' + fmtKm(k) + ' km daria so ' + kpl.toFixed(1).replace('.', ',') +
             ' km por litro. ' + (ehCarro ? 'Um carro faz ' : 'Uma moto faz ') + faixa +
             ' \u2014 esse km parece baixo demais. Confira no painel.';
    }
    if (kpl !== null && kpl > fx.max * 2) {
      return '\u26a0\ufe0f ' + l + 'L para ' + fmtKm(k) + ' km daria ' + kpl.toFixed(1).replace('.', ',') +
             ' km por litro. ' + (ehCarro ? 'Um carro faz ' : 'Uma moto faz ') + faixa +
             ' \u2014 esse km parece alto demais. Se ficou dias sem registrar, ' +
             'esse km cobre mais de um abastecimento.';
    }
  }
  if (v > 0 && k > 0 && (v / k) > 3) {
    return '\u26a0\ufe0f ' + fmtBRL(v/k) + ' de combustivel por km e muito acima do normal ' +
           '(o comum fica entre R$ 0,20 e R$ 0,80). Provavelmente o km esta baixo demais.';
  }
  return '';
}
function pintarAviso(idBox, elValor, msg) {
  const box = document.querySelector(idBox);
  if (box) { box.textContent = msg; box.style.display = msg ? 'block' : 'none'; }
  if (elValor) elValor.style.color = msg ? 'var(--signal)' : '';
}

let _lockSalvar = false;   // trava anti-clique-duplo dos botões de salvar

// ─── TELA COMBUSTÍVEL ────────────────────────────────────────
['tipoGasolinaTela','tipoEtanolTela','tipoFlexTela','tipoGNVTela','tipoDieselTela','tipoMistoTela'].forEach(id => {
  document.querySelector('#' + id).addEventListener('click', function() {
    document.querySelectorAll('#modalAbastecer .tipo-btn').forEach(b => b.classList.remove('ativo'));
    this.classList.add('ativo');
    tipoSelecionadoTela = this.textContent;
  });
});
function calcCustoPorKmTela() {
  const v = numBR(document.querySelector('#inputValorTela').value);
  const k = numKm(document.querySelector('#inputKmTela').value);
  const l = numBR(document.querySelector('#inputLitrosTela').value);
  const el = document.querySelector('#combPreviewValTela');
  el.textContent = (v > 0 && k > 0) ? fmtBRL((v/k)) + '/km' : '— /km';
  pintarAviso('#combAvisoTela', el, avisoAbastecimento(v, k, l, tipoSelecionadoTela));   // mesma regra da tela pos-turno
}
function limparCamposAbast() {
  document.querySelector('#inputValorTela').value = '';
  document.querySelector('#inputLitrosTela').value = '';
  document.querySelector('#inputKmTela').value = '';
  document.querySelector('#inputPostoTela').value = '';
  document.querySelector('#combPreviewValTela').textContent = '— /km';
}
// ─── AUTOCOMPLETAR NOME DO POSTO ──────────────────────────────
// "Posto Tupi", "posto tupi" e "POSTO TUPI" viravam 3 postos diferentes pra
// qualquer analise por posto (Fatia 3 nasceria quebrada sem isso). Em vez de
// pedir mais um campo (motorista abastecendo tem pressa), sugere os nomes que
// ele ja usou: escolheu da lista, o nome sai identico ao anterior — dado
// limpo sem esforco extra. Digitou um posto novo, funciona como sempre.
function atualizarListaPostos() {
  const dl = document.querySelector('#listaPostos');
  if (!dl) return;
  const vistos = new Set();
  const nomes = [];
  lerLS('historicoAbastecimentos', []).forEach(r => {
    const p = (r.posto || '').trim();
    if (!p) return;
    const chave = p.toLowerCase();
    if (vistos.has(chave)) return;   // so a grafia mais recente desse posto entra
    vistos.add(chave);
    nomes.push(p);
  });
  dl.innerHTML = nomes.map(n => '<option value="' + esc(n) + '">').join('');
}
let editandoAbastId = null;
function editarAbastecimento(id) {
  const h = lerLS('historicoAbastecimentos', []);
  const r = h.find(x => x.id === id);
  if (!r) return;
  editandoAbastId = id;
  atualizarListaPostos();
  document.querySelector('#inputValorTela').value  = (r.valor  != null) ? String(r.valor).replace('.', ',')  : '';
  document.querySelector('#inputLitrosTela').value = (r.litros != null) ? String(r.litros).replace('.', ',') : '';
  document.querySelector('#inputKmTela').value     = (r.km     != null) ? String(r.km) : '';
  document.querySelector('#inputPostoTela').value  = r.posto || '';
  tipoSelecionadoTela = r.tipo || 'Gasolina';
  document.querySelectorAll('#modalAbastecer .tipo-btn').forEach(b => b.classList.toggle('ativo', b.textContent.trim() === tipoSelecionadoTela));
  calcCustoPorKmTela();
  // Se este é o registro que o app vem cobrando, a saída aparece AQUI — que é
  // onde o "Corrigir agora" larga o motorista.
  const cx = document.getElementById('abastConferirBox');
  if (cx) {
    if (kmSuspeito(r)) {
      cx.innerHTML = '<div style="font-size:var(--f1);color:var(--dim);margin-top:8px;">'
                   + 'Se esse km está certo mesmo, não precisa mudar nada:</div>'
                   + '<button class="comb-conferir" onclick="conferirDaEdicao()">'
                   + ico('check') + ' Está certo, pode contar</button>';
      cx.style.display = 'block';
    } else if (r.kmOk) {
      cx.innerHTML = '<div style="font-size:var(--f1);color:var(--dim);margin-top:8px;">'
                   + ico('check') + ' Km conferido por você. '
                   + '<button class="comb-desfazer" onclick="desfazerDaEdicao()">desfazer</button></div>';
      cx.style.display = 'block';
    } else { cx.style.display = 'none'; cx.innerHTML = ''; }
  }
  document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Salvar alteração';
  document.getElementById('modalAbastecer').style.display = 'flex';
}
// ⚠️ A conferência tem que ir pra nuvem. Sem isto ela morria no aparelho:
// o motorista trocava de celular e o registro voltava marcado de vermelho,
// fora da conta de R$/km, com o "Corrigir agora" ressuscitado pra sempre.
function sincronizarKmOk(r) {
  if (!r || typeof salvarRegistroHibrido !== 'function') return;
  salvarRegistroHibrido('abastecimentos', {
    id: r.id, data_iso: r.dataISO, tipo: r.tipo, valor: r.valor,
    litros: r.litros, km: r.km, cpm: r.cpm, posto: r.posto,
    veiculo_id: r.vid || null, km_ok: !!r.kmOk
  }, 'id').catch(function () {});
}

// O motorista assume o número. A conta volta a usá-lo e o alerta some.
function confirmarKmAbastecimento(id) {
  const h = lerLS('historicoAbastecimentos', []);
  const r = h.find(x => x.id === id);
  if (!r) return;
  pedirConfirmacao(
    ico('check') + ' Esse km está certo?',
    'Você está dizendo que rodou mesmo ' + fmtKm(r.km) + ' km com esse abastecimento. '
    + 'Ele volta a contar no seu custo por km, e o número da tela vai mudar. '
    + 'Se o km estiver errado de verdade, o custo por km fica errado junto — e é ele que '
    + 'define o seu piso. Na dúvida, cancele e ajuste o km no lápis.',
    function () {
      const h2 = lerLS('historicoAbastecimentos', []);
      const alvo = h2.find(x => x.id === id);
      if (!alvo) return;
      alvo.kmOk = true;
      salvarLS('historicoAbastecimentos', h2);
      sincronizarKmOk(alvo);
      refreshAposAbast();
      toast('Pronto — esse abastecimento voltou pra conta');
    });
}
// Dá pra voltar atrás: se ele conferiu errado, não pode virar outro beco.
function desfazerKmAbastecimento(id) {
  const h = lerLS('historicoAbastecimentos', []);
  const r = h.find(x => x.id === id);
  if (!r) return;
  delete r.kmOk;
  salvarLS('historicoAbastecimentos', h);
  sincronizarKmOk(r);
  refreshAposAbast();
  toast('Voltou a ficar de fora da conta');
}
// atalhos do modal de edição — fecham o modal antes, senão a confirmação
// nasce atrás dele e a tela parece travada.
function conferirDaEdicao() {
  const id = editandoAbastId; if (!id) return;
  editandoAbastId = null;
  document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Registrar';
  document.getElementById('modalAbastecer').style.display = 'none';
  confirmarKmAbastecimento(id);
}
function desfazerDaEdicao() {
  const id = editandoAbastId; if (!id) return;
  editandoAbastId = null;
  document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Registrar';
  document.getElementById('modalAbastecer').style.display = 'none';
  desfazerKmAbastecimento(id);
}
function excluirAbastecimento(id) {
  pedirConfirmacao(ico('lixeira') + ' Apagar abastecimento', 'Quer apagar este lançamento? Isso não dá pra desfazer.', function() {
    let h = lerLS('historicoAbastecimentos', []);
    h = h.filter(r => r.id !== id);
    salvarLS('historicoAbastecimentos', h);
    if (typeof excluirRegistroHibrido === 'function') {
      excluirRegistroHibrido('abastecimentos', 'id', id).catch(function () {});
    }
    refreshAposAbast();
    toast('Abastecimento apagado');
  });
}
document.querySelector('#btnSalvarTela').addEventListener('click', function() {
  const valor  = numBR(document.querySelector('#inputValorTela').value);
  const litros = numBR(document.querySelector('#inputLitrosTela').value) || null;
  const km     = numKm(document.querySelector('#inputKmTela').value) || null;
  const posto  = document.querySelector('#inputPostoTela').value.trim() || null;
  if (!valor || valor <= 0) { toast('Informe o valor gasto', 'erro'); return; }
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  if (_lockSalvar) return;
  _lockSalvar = true; setTimeout(() => { _lockSalvar = false; }, 800);
  const ehEdicao = !!editandoAbastId;   // só o registro NOVO dispara o balão (edição não)
  if (editandoAbastId) {
    const h = lerLS('historicoAbastecimentos', []);
    const r = h.find(x => x.id === editandoAbastId);
    if (r) {
      // km editado à mão desfaz a conferência: o número mudou, a conferência
      // era sobre o número antigo
      if (r.km !== km) delete r.kmOk;
      r.tipo = tipoSelecionadoTela; r.valor = valor; r.litros = litros; r.km = km; r.posto = posto;
      r.ppl = (valor && litros) ? (valor / litros).toFixed(2) : null;
      r.cpm = (valor && km)     ? (valor / km).toFixed(2)     : null;
      salvarLS('historicoAbastecimentos', h);
      if (typeof salvarRegistroHibrido === 'function') {
        salvarRegistroHibrido('abastecimentos', {
          id: r.id, data_iso: r.dataISO, tipo: r.tipo, valor: r.valor,
          litros: r.litros, km: r.km, cpm: r.cpm, posto: r.posto,
          veiculo_id: r.vid || null, km_ok: !!r.kmOk
        }, 'id').catch(function () {});
      }
      refreshAposAbast();
    }
    editandoAbastId = null;
    document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Registrar';
    toast('Abastecimento atualizado');
  } else {
    const cpm = (valor && km) ? (valor / km).toFixed(2) : null;
    salvarAbastecimento(tipoSelecionadoTela, valor, litros, km, cpm, posto);
    salvarLS('ultimoTipoComb', tipoSelecionadoTela);   // lembra pro próximo
    atualizarCustoRealKm();
    toast('⛽ Abastecimento registrado!');
  }
  limparCamposAbast();
  document.getElementById('modalAbastecer').style.display = 'none';
  // Veio do fecha-turno? Entao o streak fecha agora e o balao entra na FILA
  // (pra nao aparecer por cima do streak). Veio da aba? Balao direto.
  if (_abastDoTurno) {
    _abastDoTurno = false;
    if (!ehEdicao) enfileirarBalaoProg('abastecimento');
    mostrarStreak();
  } else if (!ehEdicao) {
    dispararBalaoProg('abastecimento');   // ensina na 1ª vez (1x só)
  }
});

// ─── ABRIR / FECHAR MODAL DE ABASTECIMENTO ───────────────────
// Abre o formulario de abastecimento — UNICO no app. Usado pelos dois caminhos:
// o botao da aba Combustivel e o "Sim" depois de encerrar o turno.
// kmSugerido: preenche o campo de km (o pos-turno manda o km que ele rodou).
function abrirFormAbastecimento(kmSugerido) {
  editandoAbastId = null;
  document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Registrar';
  limparCamposAbast();
  atualizarListaPostos();
  if (kmSugerido) document.querySelector('#inputKmTela').value = kmSugerido;
  // dica do km so aparece quando veio do turno (senao confunde quem abre pela aba)
  // uma dica de cada vez: se o km ja veio preenchido, explicar "pode deixar em
  // branco" so confunde
  const dicaT = document.querySelector('#dicaKmTurno');
  const dicaN = document.querySelector('#dicaKmNormal');
  if (dicaT) dicaT.style.display = _abastDoTurno ? 'block' : 'none';
  if (dicaN) dicaN.style.display = _abastDoTurno ? 'none' : 'block';
  tipoSelecionadoTela = aplicarUltimoTipo('#modalAbastecer');
  calcCustoPorKmTela();
  document.getElementById('modalAbastecer').style.display = 'flex';
}
document.getElementById('btnAbrirAbastecer').addEventListener('click', function() {
  _abastDoTurno = false;
  abrirFormAbastecimento(null);
});
document.getElementById('btnCancelarAbastecer').addEventListener('click', function() {
  editandoAbastId = null;
  document.querySelector('#btnSalvarTela').innerHTML = ico('check') + ' Registrar';
  document.getElementById('modalAbastecer').style.display = 'none';
  // desistiu de registrar depois do turno: o dia fecha do mesmo jeito
  if (_abastDoTurno) { _abastDoTurno = false; mostrarStreak(); }
});

// ─── SALVAR ABASTECIMENTO ────────────────────────────────────
function gerarIdAbast() { return 'ab' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
// Conserta abastecimentos que voltaram da nuvem antes da correção: eles vinham
// sem `vid` (invisíveis pra TODA conta por veículo), sem `ppl` (sem selinho de
// caro/barato e sem aviso de preço) e com `data` em ISO em vez do formato de
// exibição. Roda a cada abertura, mas só toca no que está faltando — rodar
// várias vezes não muda nada.
// ⚠️ CINTO DE SEGURANÇA DA ORDEM.
// O app inteiro trata o índice 0 como "o mais recente": o extrato mostra os 5
// primeiros como "os mais recentes", o simulador diz "seu último posto", o
// selinho compara com "os 4 anteriores" (índices maiores) e o Isaac lê hist[0]
// como o último litro. Isso só é verdade porque o registro novo entra por
// unshift — e deixa de ser verdade assim que o histórico vem da nuvem, de um
// backup antigo ou de um arquivo restaurado à mão.
// O .order() do Supabase já resolve o caminho principal; isto aqui cobre o
// resto e roda em toda abertura. sort() é estável, então empate no mesmo dia
// preserva a ordem que já estava lá.
// ⚠️ O LIVRO TEM QUE FECHAR: receita − taxa − combustível − despesas = lucro.
// Ele estava aberto. A carta do mês dizia "Saíram R$ 412" e logo abaixo
// "R$ 400 de combustível, R$ 83 de despesas" — 483, não 412. Sobravam R$ 71.
//
// CAUSA: `ressincronizarReceitaHoje()` só conserta o DIA DE HOJE. E a
// `recalcularCombDosDias()` (que roda ao restaurar da nuvem) regrava o
// combustível do dia mas NÃO recalcula o lucro — joga a diferença na taxa. Se
// a diferença for negativa (custo maior que receita − lucro), a taxa é travada
// em zero e o livro fica desequilibrado, calado.
//
// ⚠️ E o erro caía sempre pro MESMO LADO: lucro alto demais. O motorista
// achava que sobrou R$ 778 quando sobraram R$ 707. Superestimar lucro é o
// pior lado pra errar neste app — é o "troca dinheiro e acha que tá no lucro"
// acontecendo DENTRO da ferramenta que existe pra impedir isso.
//
// Quem manda é o LANÇAMENTO, não o resumo: abastecimento e despesa são
// registros individuais que o motorista fez; o lucro é conta derivada deles.
// Então o lucro se ajusta ao custo, nunca o contrário.
function reconciliarFinancas() {
  const fin = lerLS('historicoFinancas', []);
  if (!fin.length) return;

  // ⚠️ TRAVA CONTRA A PRÓPRIA CORREÇÃO. Isto roda na abertura do app — e num
  // aparelho novo a restauração ainda pode estar no meio do caminho: finanças
  // já voltaram, abastecimentos não. Reconciliar nesse instante zeraria o
  // combustível de todo dia e INFLARIA o lucro — exatamente o erro que esta
  // função existe pra consertar. Se as finanças conhecem combustível e a lista
  // de abastecimentos está vazia, a fonte não é confiável: não mexe.
  const abastecimentos = lerLS('historicoAbastecimentos', []);
  const finTemComb = fin.some(function (r) { return (r.comb || 0) > 0; });
  if (!abastecimentos.length && finTemComb) return;

  const combPorDia = {};
  abastecimentos.forEach(function (a) {
    if (!a.dataISO) return;
    combPorDia[a.dataISO] = (combPorDia[a.dataISO] || 0) + (a.valor || 0);
  });
  const despPorDia = {};
  const mapaDesp = lerLS('despesasPorDia', {}) || {};
  Object.keys(mapaDesp).forEach(function (dia) {
    despPorDia[dia] = (mapaDesp[dia] || []).reduce(function (t, d) { return t + (d.valor || 0); }, 0);
  });

  // o custo do dia entra numa linha só — duas linhas no mesmo dia contariam duas vezes
  const jaUsou = {};
  let mudou = false;
  fin.forEach(function (r) {
    const iso = r.dataISO;
    if (!iso) return;
    const combNovo = jaUsou[iso] ? 0 : (combPorDia[iso] || 0);
    const despNovo = jaUsou[iso] ? 0 : (despPorDia[iso] != null ? despPorDia[iso] : (r.desp || 0));
    jaUsou[iso] = true;
    const taxa  = r.taxa || 0;
    const lucroNovo = (r.receita || 0) - taxa - combNovo - despNovo;
    if (Math.abs((r.comb || 0) - combNovo) > 0.005 ||
        Math.abs((r.desp || 0) - despNovo) > 0.005 ||
        Math.abs((r.lucro || 0) - lucroNovo) > 0.005) {
      r.comb = combNovo; r.desp = despNovo; r.lucro = lucroNovo;
      mudou = true;
    }
  });
  if (mudou) {
    salvarLS('historicoFinancas', fin);
    // a nuvem tem que receber o número corrigido, senão o aparelho novo
    // restaura o lucro inflado de volta
    if (typeof salvarRegistroHibrido === 'function') {
      fin.slice(0, 62).forEach(function (r) {          // ~2 meses: o resto é histórico frio
        salvarRegistroHibrido('financas', {
          data_iso: r.dataISO, receita: r.receita || 0, liquido: r.lucro || 0,
          taxa_real: (r.taxa != null) ? r.taxa : null,
          km_dia: (lerLS('kmPorDia', {})[r.dataISO] || {}).km || null,
          despesas: r.desp || 0
        }, 'usuario_id,data_iso').catch(function () {});
      });
    }
  }
}

function ordenarHistoricos() {
  [['historicoAbastecimentos', 'dataISO'], ['historicoFinancas', 'dataISO']]
    .forEach(function (par) {
      const arr = lerLS(par[0], []);
      if (!Array.isArray(arr) || arr.length < 2) return;
      const antes = arr.map(function (r) { return r[par[1]] || ''; }).join('|');
      const ord = arr.slice().sort(function (a, b) {
        return String(b[par[1]] || '').localeCompare(String(a[par[1]] || ''));
      });
      // só grava se mudou: escrita à toa em toda abertura é desgaste sem motivo
      if (ord.map(function (r) { return r[par[1]] || ''; }).join('|') !== antes) {
        salvarLS(par[0], ord);
      }
    });
}

function repararAbastecimentosRestaurados() {
  const h = lerLS('historicoAbastecimentos', []);
  if (!h.length) return;
  const veics = lerVeiculos();
  // Só carimba o veículo quando existe UM só: aí não há chute. Com 2+ veículos
  // a nuvem antiga não sabe de qual era, e adivinhar misturaria a média de um
  // carro com a de uma moto — o oposto do que o app existe pra fazer.
  const vidUnico = (veics.length === 1) ? veics[0].id : null;
  let mudou = false;
  h.forEach(r => {
    if (!r.vid && vidUnico)                      { r.vid = vidUnico; mudou = true; }
    if (!r.ppl && r.valor > 0 && r.litros > 0)   { r.ppl = (r.valor / r.litros).toFixed(2); mudou = true; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) { r.data = isoParaExibicao(r.data); mudou = true; }
  });
  if (mudou) salvarLS('historicoAbastecimentos', h);
}
function migrarIdsAbastecimento() {
  const h = lerLS('historicoAbastecimentos', []);
  let mudou = false;
  h.forEach(r => { if (!r.id) { r.id = gerarIdAbast(); mudou = true; } });
  if (mudou) salvarLS('historicoAbastecimentos', h);
}
function salvarAbastecimento(tipo, valor, litros, km, cpm, posto) {
  const ppl = (valor && litros) ? (valor / litros).toFixed(2) : null;
  let historico = lerLS('historicoAbastecimentos', []);
  const registro = {
    data: new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    id: gerarIdAbast(),
    dataISO: hojeISO(),   // data completa pra filtrar por mês/semana no extrato
    vid: vidAtivo(),      // de QUAL veículo é esse combustível (a média não mistura)
    tipo, valor, litros, km, cpm, ppl, posto: posto || null
  };
  historico.unshift(registro);
  if (historico.length > 1000) historico = historico.slice(0, 1000);   // guarda bastante coisa
  salvarLS('historicoAbastecimentos', historico);
  // Supabase (Fatia 1): sobe em paralelo — nunca trava a UI, offline vira fila.
  if (typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('abastecimentos', {
      id: registro.id, data_iso: registro.dataISO, tipo: registro.tipo,
      valor: registro.valor, litros: registro.litros, km: registro.km,
      cpm: registro.cpm, posto: registro.posto,
      veiculo_id: registro.vid || null,  // sem isto a nuvem nao sabe de qual veiculo e
      km_ok: !!registro.kmOk
    }, 'id').catch(function () {});
  }
  refreshAposAbast();
  avisarPrecoDoPosto(registro);   // ele ainda esta no posto: da tempo de lembrar pra proxima
}

// Compara o preco que ele acabou de pagar com os 4 abastecimentos anteriores do
// MESMO tipo (mesma regra do selinho do extrato). Avisa na hora, enquanto ele
// ainda esta no posto — no extrato ele so veria dias depois, sem serventia.
function avisarPrecoDoPosto(reg) {
  if (!reg || !reg.ppl) return;
  const anteriores = lerLS('historicoAbastecimentos', [])
    .filter(x => x.id !== reg.id && x.ppl && x.tipo === reg.tipo)
    .slice(0, 4);
  if (anteriores.length < 1) return;          // sem base: nao inventa comparacao
  const media = anteriores.reduce((t, x) => t + numBR(x.ppl), 0) / anteriores.length;
  const dif   = Number((numBR(reg.ppl) - media).toFixed(2));
  if (Math.abs(dif) < 0.1) return;            // diferenca irrelevante: nao enche o saco
  const qtd = anteriores.length === 1 ? 'o anterior' : 'os ' + anteriores.length + ' anteriores';
  const msg = dif > 0
    ? '\u26a0\ufe0f Esse litro saiu ' + fmtBRL(dif) + ' mais caro que ' + qtd
    : '\u2705 Boa! ' + fmtBRL(Math.abs(dif)) + ' mais barato por litro que ' + qtd;
  // Se o streak estiver na frente, espera ele sair — senao o aviso passa por
  // baixo da tela cheia e o motorista nem le (foi o que aconteceu no teste).
  const streakAberto = () => {
    const m = document.getElementById('modalStreak');
    return m && getComputedStyle(m).display !== 'none';
  };
  const mostrar = () => {
    if (streakAberto()) { setTimeout(mostrar, 800); return; }   // tenta de novo depois
    toast(msg);
  };
  setTimeout(mostrar, 2400);
}

function refreshAposAbast() {
  ressincronizarReceitaHoje();
  atualizarTelaCombustivel();
  renderTanqueDash();
  atualizarCustoRealKm();
  atualizarBannerLucro();
  atualizarResumoDia();
  if (document.getElementById('telaFinancas')) atualizarTelaFinancas();
  if (document.getElementById('extLista')) renderExtrato();
}

// NOVO: mantém a receita de HOJE sempre em sincronia com o combustível do dia
function ressincronizarReceitaHoje() {
  const hist = lerLS('historicoFinancas', []);
  const temHoje = hist.some(r => r.dataISO === hojeISO());
  if (!temHoje) return;                       // ainda não registrou receita hoje: nada a fazer
  const combTotal = combustívelHoje();
  const despTotal = despesasTotalHoje();
  let jaAlocou = false;                        // combustível e despesas do dia entram uma vez só
  hist.forEach(r => {
    if (r.dataISO === hojeISO()) {
      const liquido = r.receita - r.taxa;      // líquido = bruto menos taxa
      if (!jaAlocou) { r.comb = combTotal; r.desp = despTotal; jaAlocou = true; }
      else           { r.comb = 0; r.desp = 0; }
      r.lucro = liquido - r.comb - (r.desp || 0);
    }
  });
  salvarLS('historicoFinancas', hist);
  // ⚠️ A nuvem TAMBÉM precisa ser atualizada aqui. Antes, só o localStorage era
  // corrigido: quem registrava a receita e DEPOIS abastecia ou lançava despesa
  // ficava com o número velho no Supabase para sempre (receita, lucro, despesas
  // e km_dia congelados no instante do registro). Foi o que apareceu no teste.
  const rHoje = hist.find(r => r.dataISO === hojeISO());
  if (rHoje && typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('financas', {
      data_iso:  hojeISO(),
      receita:   rHoje.receita || 0,
      liquido:   rHoje.lucro   || 0,
      taxa_real: (rHoje.taxa != null) ? rHoje.taxa : null,
      km_dia:    kmRodadoHoje(),
      despesas:  rHoje.desp    || 0
    }, 'usuario_id,data_iso').catch(function () {});
  }
}

// ⚠️ O valor dentro do arco tinha tamanho fixo e transbordava por cima do
// desenho quando passava de R$ 100. Chutar um tamanho menor pra todo mundo
// resolveria o transbordo e estragaria o normal — o número é a estrela da tela.
// Aqui ele começa grande e só encolhe quando o texto realmente não cabe.
function ajustarValorDoArco(el) {
  if (!el) return;
  const n = (el.textContent || '').length;
  el.style.fontSize = n <= 9  ? '34px'    // R$ 250,00
                    : n <= 11 ? '28px'    // R$ 1.250,00
                    :           '25px';   // -R$ 1.250,00 (prejuízo)
}
// atualiza o banner de lucro do dashboard a partir dos registros de hoje
function atualizarBannerLucro() {
  const el  = document.getElementById('bannerLucroValor');
  const sub = document.getElementById('bannerLucroSub');
  const bd  = document.getElementById('gaugeBreakdown');
  if (!el) return;
  const recs = registrosHojeFin();
  if (recs.length === 0) {
    el.textContent = ''; el.style.color = 'var(--money)';   // sem '—' solto atravessando o texto
    sub.textContent = 'Registre sua receita do dia'; sub.style.display = '';
    if (bd) bd.style.display = 'none';
    return;
  }
  const lucro   = recs.reduce((s, r) => s + r.lucro,   0);
  const receita = recs.reduce((s, r) => s + r.receita, 0);
  const custos  = recs.reduce((s, r) => s + r.taxa + r.comb + (r.desp || 0), 0);
  el.textContent = fmtBRL(lucro);
  ajustarValorDoArco(el);
  el.style.color = lucro >= 0 ? 'var(--money)' : 'var(--danger)';
  // com dados: tira a linha de dentro do arco (o ponteiro varre ali) e mostra abaixo
  sub.style.display = 'none';
  if (bd) {
    bd.textContent = 'Receita ' + fmtBRL0(receita) + ' · Custos ' + fmtBRL0(custos);
    bd.style.display = '';
  }
}
function atualizarTelaCombustivel() {
  const historico = lerLS('historicoAbastecimentos', []);
  // topo = mês atual (bate com o rótulo "no mês")
  const ym = hojeISO().slice(0, 7);
  const doMes = historico.filter(r => (r.dataISO || '').slice(0, 7) === ym);
  const baseTopo = doMes.length ? doMes : historico;   // se não há dataISO (dados antigos), usa tudo
  const totalGasto = baseTopo.reduce((s, r) => s + r.valor, 0);
  const totalKm    = baseTopo.reduce((s, r) => s + (r.km || 0), 0);
  renderTanqueGrande();   // tanque grande = gasto do mês vs. seu normal
  // Gasto no mês = todos os veículos (é o dinheiro que saiu do bolso).
  // Custo médio/km = só o veículo ATIVO (é o número que decide corrida).
  const bc     = baseCombustivel();
  const cKmMes = combustivelKmMes();
  // mesma regra da tela Início: número que o app sabe estar errado vira '—'
  // ⚠️ Aqui ainda apagava o número inteiro por causa de UM registro ruim — a
  // v3.61 corrigiu isso na Início e esqueceu esta tela (de novo o padrão "regra
  // copiada que diverge"). combustivelKmMes() já exclui os furados.
  const nFuradosMes = qtdSuspeitos();
  const cmSuspeito  = cKmMes > 3 || (cKmMes <= 0 && nFuradosMes > 0);
  document.querySelector('#custoMedioVal').textContent = (cKmMes > 0 && !cmSuspeito) ? fmtBRL(cKmMes) : '—';
  let subCm;
  if (cmSuspeito) { const _s2 = abastecimentoSuspeito(); subCm = _s2 ? textoSuspeito(_s2) : ico('alerta') + ' Um abastecimento está com o km errado.'; }
  else if (cKmMes > 0) {
    subCm = (bc.escopo === 'mes' ? 'média do mês' : 'média de todos os registros') + ' · ' + esc(nomeVeiculo(veiculoAtivo()));
    if (nFuradosMes > 0) {
      const _f2 = abastecimentoSuspeito();
      subCm += (nFuradosMes === 1 && _f2)
        ? ' · sem o de ' + esc(identificaAbast(_f2.reg)) + ' (km errado)'
        : ' · sem ' + nFuradosMes + ' de km errado';
    }
  }
  else {
    const n = abastDoVeiculoAtivo().length;
    subCm = n > 0 ? 'aprendendo ' + esc(nomeVeiculo(veiculoAtivo())) + ' · registre o km ao abastecer'
                  : 'registre valor + km ao abastecer';
  }
  const _elSub = document.querySelector('#custoMedioSub');
  if (cmSuspeito || nFuradosMes > 0) {
    _elSub.innerHTML = subCm + '<br><button onclick="event.stopPropagation();irCorrigirAbastecimento()" ' +
      'style="margin-top:7px;background:rgba(255,176,32,.14);border:1px solid rgba(255,176,32,.45);' +
      'color:var(--signal);font-family:inherit;font-size:var(--f1);font-weight:700;padding:6px 14px;' +
      'border-radius:16px;cursor:pointer;">Corrigir agora ' + ico('seta-dir') + '</button>';
  } else { _elSub.textContent = subCm; }
}

// helper reutilizado na tela de combustível e no extrato
function renderItensAbastecimento(elLista, registros, baseParaPadrao) {
  if (registros.length === 0) { elLista.innerHTML = '<div class="comb-vazio">Nenhum abastecimento neste período.</div>'; return; }
  elLista.innerHTML = registros.map(r => {
    const furado = kmSuspeito(r);
    let badge = '';
    if (r.ppl && !furado) {
      // Compara com os 4 abastecimentos ANTERIORES do mesmo tipo, nao com o
      // historico inteiro: combustivel muda de preco o tempo todo, e a media
      // de meses atras faz tudo parecer "Caro" pra sempre — o selinho vira um
      // alarme que toca sempre e o motorista para de olhar.
      // (a lista ja vem da mais recente pra mais antiga)
      const idx = baseParaPadrao.indexOf(r);
      const mesmoTipo = baseParaPadrao
        .filter((x, i) => i > idx && x.ppl && x.tipo === r.tipo)   // so os ANTERIORES a este
        .slice(0, 4);
      if (mesmoTipo.length >= 1) {
        const media = mesmoTipo.reduce((s, x) => s + numBR(x.ppl), 0) / mesmoTipo.length;
        const diff  = numBR(r.ppl) - media;
        const qtd   = mesmoTipo.length === 1 ? 'o anterior' : 'os ' + mesmoTipo.length + ' anteriores';
        if (diff > 0.1)       badge = `<div class="comb-badge comb-badge-caro">${ico('alerta')} +${fmtBRL(diff)}/L que ${qtd}</div>`;
        else if (diff < -0.1) badge = `<div class="comb-badge comb-badge-barato">${ico('check')} −${fmtBRL(Math.abs(diff))}/L que ${qtd}</div>`;
        // "de os 4 anteriores" — qtd ja vem com artigo ("o anterior" / "os N
        // anteriores"), entao aqui tem que ser QUE, nao DE.
        else                  badge = `<div class="comb-badge comb-badge-neutro">${ico('igual')} No mesmo preço que ${qtd}</div>`;
      }
    }
    // O selinho de preço some no registro furado: comparar R$/L de um dado que o
    // app sabe estar errado é dar crédito a ele. No lugar entra o motivo.
    if (furado) {
      // ⚠️ Duas saídas, não uma. Antes só existia "ajuste o km" — e quem tinha
      // digitado o km CERTO ficava preso: nada a ajustar, alerta pra sempre.
      badge = `<div class="comb-badge comb-badge-erro">${ico('alerta')} Km errado — fora da conta de R$/km<br>` +
              `<span style="font-weight:600;">${esc(porqueSuspeito(r, true))}</span><br>` +
              `<span style="font-weight:600;opacity:.85;">Ajuste o km no ${ico('lapis')} aqui do lado — ou, se foi isso mesmo:</span>` +
              `<button class="comb-conferir" onclick="confirmarKmAbastecimento('${r.id}')">${ico('check')} Está certo, pode contar</button></div>`;
    }
    // Conferido à mão continua visível: se o custo por km ficar estranho depois,
    // ele precisa saber por onde começar a olhar.
    if (r.kmOk) {
      badge += `<div class="comb-badge comb-badge-neutro">${ico('check')} Km conferido por você ` +
               `<button class="comb-desfazer" onclick="desfazerKmAbastecimento('${r.id}')">desfazer</button></div>`;
    }
    // ⚠️ O km NÃO aparecia em lugar nenhum da lista. O app pedia "corrija o km"
    // num registro onde o motorista não conseguia nem VER o km atual.
    const kmTxt = r.km > 0
      ? (furado ? `<b style="color:var(--danger);">${fmtKm(r.km)} km ${ico('alerta')}</b>` : fmtKm(r.km) + ' km')
      : '<span style="color:var(--danger);">sem km</span>';
    return `<div class="comb-item${furado ? ' comb-item-erro' : ''}">
      <div class="comb-item-left">
        <div class="comb-item-dia">${r.data || ''}</div>
        <div class="comb-item-detalhe">${r.posto ? ico('pin') + ' ' + esc(r.posto) + ' · ' : ''}${r.tipo}${r.litros ? ' · ' + r.litros + 'L' : ''}${r.ppl ? ' · ' + fmtBRL(numBR(r.ppl)) + '/L' : ''} · ${kmTxt}</div>
        ${badge}
      </div>
      <div class="comb-item-right">
        <div class="comb-item-val">${fmtBRL(r.valor)}</div>
        <div class="comb-item-cpm">${furado ? '<span style="color:var(--danger);">não conta</span>' : (r.cpm ? fmtBRL(numBR(r.cpm)) + '/km' : '—')}</div>
      </div>
      <div class="comb-item-acoes">
        <button class="comb-acao" onclick="editarAbastecimento('${r.id}')" title="Editar">${ico('lapis')}</button>
        <button class="comb-acao" onclick="excluirAbastecimento('${r.id}')" title="Apagar">${ico('lixeira')}</button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  EXTRATOS (combustível e finanças) — por mês ou por semana
// ═══════════════════════════════════════════════════════════════
let extratoModo   = 'mes';   let extratoOffset = 0;    // combustível

// ⚠️ O extrato despejava TODOS os abastecimentos do período de uma vez. Com 7
// já vira parede de texto; num mês de uso real são 15, 20 — e aí o motorista
// não acha nada, nem o registro que o app está pedindo pra ele corrigir.
// Agora aparecem os 5 mais recentes e o resto entra num toque.
// ⚠️ EXCEÇÃO IMPORTANTE: o registro com km errado aparece SEMPRE, mesmo fora
// dos 5. O aviso do topo manda "ache o registro marcado de vermelho na lista" —
// se ele estiver escondido, o aviso vira caça ao tesouro.
const EXTRATO_VISIVEL = 5;
let _extratoTodos = false;
function alternarListaExtrato() { _extratoTodos = !_extratoTodos; renderExtrato(); }
let extFinModo    = 'mes';   let extFinOffset  = 0;    // finanças
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let _dadosExtratoComb = null, _dadosExtratoFin = null;   // guardam o período atual pra exportar

// calcula início/fim/rótulo de um período (mês ou semana), com deslocamento
function calcPeriodo(modo, offset) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  let inicio, fim, label;
  if (modo === 'mes') {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
    inicio = new Date(d.getFullYear(), d.getMonth(), 1);
    fim    = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    label  = MESES_PT[d.getMonth()] + ' ' + d.getFullYear();
  } else {
    const base = new Date(hoje); base.setDate(base.getDate() + offset * 7);
    const dia = base.getDay();
    inicio = new Date(base); inicio.setDate(base.getDate() + (dia === 0 ? -6 : 1 - dia));
    fim    = new Date(inicio); fim.setDate(inicio.getDate() + 6);
    const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    label = offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana passada' : fmt(inicio) + ' – ' + fmt(fim);
  }
  return { inicio, fim, label, iniISO: isoLocal(inicio), fimISO: isoLocal(fim) };
}
// "30/06 a 06/07/2026" — só informativo
function rangeDatas(ini, fim) {
  const f = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return f(ini) + ' a ' + f(fim) + '/' + fim.getFullYear();
}

// ── EXTRATO COMBUSTÍVEL ──
function abrirExtrato() {
  extratoModo = 'mes'; extratoOffset = 0; _extratoTodos = false;
  document.getElementById('extMes').classList.add('ativo');
  document.getElementById('extSemana').classList.remove('ativo');
  renderExtrato();
  mostrarTela(document.getElementById('telaExtrato'));
  navCombustivel.classList.add('ativo');
}
function renderExtrato() {
  const per = calcPeriodo(extratoModo, extratoOffset);
  document.getElementById('extPeriodo').textContent = per.label;
  document.getElementById('extDatas').textContent = rangeDatas(per.inicio, per.fim);
  const hist = lerLS('historicoAbastecimentos', []);
  const doPeriodo = hist.filter(r => r.dataISO && r.dataISO >= per.iniISO && r.dataISO <= per.fimISO);
  const gasto  = doPeriodo.reduce((s, r) => s + r.valor, 0);
  const litros = doPeriodo.reduce((s, r) => s + (r.litros || 0), 0);
  const km     = doPeriodo.reduce((s, r) => s + (r.km || 0), 0);
  document.getElementById('extGasto').textContent = fmtBRL0(gasto);
  document.getElementById('extQtd').textContent   = doPeriodo.length;
  document.getElementById('extPreco').textContent = litros > 0 ? fmtBRL((gasto/litros)) : '—';
  // R$/km só faz sentido dentro de UM veículo. Período com vários → '—'.
  const vidsPer = Array.from(new Set(doPeriodo.map(r => r.vid || '?')));
  const cpkEl   = document.getElementById('extCpk');
  // ⚠️ Este número era `gasto / km` com TUDO dentro — inclusive registros que o
  // próprio app já sabia estarem com o km errado. Dava a cena absurda de o
  // bloco de baixo dizer "não consigo comparar, tem km errado" e este aqui,
  // logo acima, exibir R$ 0,44 com toda a confiança. Agora segue a mesma regra
  // do resto: o furado fica de fora da conta por km (o gasto continua inteiro,
  // porque o dinheiro saiu do bolso de verdade) e a tela diz que deixou de fora.
  const limpos   = doPeriodo.filter(r => !kmSuspeito(r));
  const kmLimpo  = limpos.reduce((s, r) => s + (r.km || 0), 0);
  const gastoLim = limpos.reduce((s, r) => s + ((r.km > 0) ? (r.valor || 0) : 0), 0);
  const nFurados = doPeriodo.length - limpos.length;
  if (vidsPer.length > 1) { cpkEl.textContent = '—'; cpkEl.title = 'Vários veículos no período'; }
  else if (kmLimpo > 0)   { cpkEl.textContent = fmtBRL(gastoLim / kmLimpo);
                            cpkEl.title = nFurados > 0 ? 'Sem ' + nFurados + ' abastecimento(s) com km errado' : ''; }
  else                    { cpkEl.textContent = '—';
                            cpkEl.title = nFurados > 0 ? 'Todos os registros com km estão errados' : ''; }
  const avisoCpk = document.getElementById('extCpkAviso');
  if (avisoCpk) {
    // O texto antigo só dizia o que foi deixado de fora — o motorista leigo lia
    // aquilo sem entender o que fazer, e ficava com a impressão de que o app
    // tinha parado de funcionar. Agora diz também o que ISSO SIGNIFICA e o que
    // ele ganha corrigindo.
    if (nFurados > 0) {
      const qtos = nFurados === 1
        ? '1 abastecimento com o km errado ficou'
        : nFurados + ' abastecimentos com o km errado ficaram';
      // ⚠️ Faltava o principal: QUAL. Agora o aviso nomeia cada um (dia, posto,
      // valor) e diz o que não fecha — os mesmos que estão marcados de vermelho
      // na lista logo abaixo. Máximo de 3 pra não virar parede de texto.
      const ruins = doPeriodo.filter(kmSuspeito);
      const itens = ruins.slice(0, 3).map(r =>
        '<li style="margin-top:4px;"><b>' + esc(identificaAbast(r)) + '</b><br>' +
        '<span style="opacity:.85;">' + esc(porqueSuspeito(r, true)) + '</span></li>').join('');
      const resto = ruins.length > 3 ? '<div style="margin-top:4px;opacity:.85;">e mais ' +
        (ruins.length - 3) + ' na lista abaixo.</div>' : '';
      avisoCpk.innerHTML = '<b>' + qtos + ' de fora desta conta.</b>' +
        '<ul style="margin:6px 0 0;padding-left:16px;">' + itens + '</ul>' + resto +
        '<div style="margin-top:6px;">' +
        (kmLimpo > 0
          ? 'O número acima usa só os que estão certos. Ache o registro marcado de vermelho na lista '
            + 'e ajuste o km no ' + ico('lapis') + '.'
          : 'Sem nenhum km confiável eu não consigo calcular o custo por km. '
            + 'Ache o registro marcado de vermelho na lista e ajuste o km no ' + ico('lapis') + '.')
        // ⚠️ Existe um segundo caminho e ele PRECISA estar aqui: quem digitou o km
        // certo não tem nada a ajustar, e sem esta frase o aviso vira uma ordem
        // impossível que fica na tela pra sempre.
        + ' Se o km estiver certo mesmo, o próprio registro tem o botão <b>Está certo, pode contar</b>.'
        + '</div>';
      avisoCpk.style.display = 'block';
    } else {
      avisoCpk.textContent = '';
      avisoCpk.style.display = 'none';
    }
  }
  const elLista = document.getElementById('extLista');
  // os 5 mais recentes + qualquer um com km errado que tenha ficado pra trás
  const naTela = _extratoTodos
    ? doPeriodo
    : doPeriodo.filter((r, i) => i < EXTRATO_VISIVEL || kmSuspeito(r));
  renderItensAbastecimento(elLista, naTela, hist);
  const escondidos = doPeriodo.length - naTela.length;
  if (escondidos > 0) {
    elLista.insertAdjacentHTML('beforeend',
      '<button class="comb-vermais" onclick="alternarListaExtrato()">Ver os outros ' +
      escondidos + (escondidos === 1 ? ' abastecimento' : ' abastecimentos') + '</button>');
  } else if (_extratoTodos && doPeriodo.length > EXTRATO_VISIVEL) {
    elLista.insertAdjacentHTML('beforeend',
      '<button class="comb-vermais" onclick="alternarListaExtrato()">Mostrar só os 5 últimos</button>');
  }
  renderPorTipo(doPeriodo);
  document.getElementById('extNext').disabled = extratoOffset >= 0;
  _dadosExtratoComb = { per, registros: doPeriodo, gasto, litros, km };
}

// ═══════════════════════════════════════════════════════════════
//  BLOCO "POR TIPO DE COMBUSTÍVEL" — comparador que gera insight
// ═══════════════════════════════════════════════════════════════
const TIPO_CLASSE = { 'Gasolina':'gas', 'Etanol':'eta', 'Flex':'flex', 'GNV':'gnv', 'Diesel':'dies', '50/50':'mist' };
function renderPorTipo(registros) {
  const bloco  = document.getElementById('tiposBloco');
  const lista  = document.getElementById('tiposLista');
  const verBox = document.getElementById('tiposVeredict');
  // gasolina no carro vs gasolina na moto não se comparam: só o veículo ativo
  const vidS = vidAtivo();
  if (vidS && registros) registros = registros.filter(r => r.vid === vidS);
  if (!registros || registros.length === 0) { bloco.style.display = 'none'; return; }

  // ⚠️ Registro com km furado fica de fora do COMPARATIVO. Sem isto o app
  // afirmava coisas falsas ("gasolina 91% mais barata por km") a partir de um
  // dado que ele mesmo já sabia estar errado. O gasto continua aparecendo
  // (o dinheiro saiu do bolso de verdade) — o que sai é o custo por km.
  const kmFurado = kmSuspeito;            // regra única — ver kmSuspeito()
  const temFurado = registros.some(kmFurado);

  // agrupa por tipo
  const grupos = {};
  registros.forEach(r => {
    const t = r.tipo || 'Outro';
    if (!grupos[t]) grupos[t] = { tipo: t, gasto: 0, km: 0, litros: 0, n: 0 };
    grupos[t].gasto  += r.valor || 0;
    grupos[t].litros += r.litros || 0;
    grupos[t].n++;
    // km furado nao entra na conta de custo/km (mas o gasto acima entra:
    // o dinheiro saiu do bolso de verdade)
    if (!kmFurado(r)) { grupos[t].km += r.km || 0; grupos[t].gastoKm = (grupos[t].gastoKm || 0) + (r.valor || 0); }
  });
  const tipos = Object.values(grupos);
  // só faz sentido mostrar se tiver mais de um tipo
  if (tipos.length < 2) { bloco.style.display = 'none'; return; }
  bloco.style.display = 'block';

  const gastoTotal = tipos.reduce((s, g) => s + g.gasto, 0);
  tipos.sort((a, b) => b.gasto - a.gasto);   // maior gasto primeiro

  lista.innerHTML = tipos.map(g => {
    const pct = gastoTotal > 0 ? Math.round((g.gasto / gastoTotal) * 100) : 0;
    const cpk = g.km > 0 ? fmtBRL(((g.gastoKm || 0) / g.km)) + '/km' : '—';
    const cls = TIPO_CLASSE[g.tipo] || 'gas';
    const cor = { gas:'var(--signal)', eta:'var(--money)', flex:'var(--info)', gnv:'var(--purple)', dies:'#8a95a3', mist:'#c78a3a' }[cls];
    return `
      <div class="tipo-linha">
        <div class="tipo-linha-topo">
          <span class="tipo-linha-nome"><span class="dot ${cls}"></span>${g.tipo}</span>
          <span class="tipo-linha-val"><b>${fmtBRL0(g.gasto)}</b> (${pct}%)</span>
        </div>
        <div class="tipo-linha-bar"><span style="width:${pct}%;background:${cor}"></span></div>
        <div class="tipo-linha-cpk">custo por km: <b>${cpk}</b></div>
      </div>`;
  }).join('');

  // veredicto: qual tipo tá saindo MAIS BARATO por km
  const comCpk = tipos.filter(g => g.km > 0).map(g => ({ tipo: g.tipo, cpk: (g.gastoKm || 0) / g.km }));
  if (comCpk.length >= 2) {
    comCpk.sort((a, b) => a.cpk - b.cpk);   // menor cpk primeiro (melhor)
    const melhor = comCpk[0], pior = comCpk[comCpk.length - 1];
    const diff   = Math.round(((pior.cpk - melhor.cpk) / pior.cpk) * 100);
    const nota = temFurado
      ? '<br><span style="font-size:var(--f1);color:var(--faint)">Deixei de fora um abastecimento com o km errado — corrija pra conta ficar completa.</span>'
      : '';
    // Porcentagem sozinha e abstrata: o motorista pensa em DINHEIRO. Mostra
    // a diferenca por km E quanto isso daria nos km que ele ja rodou no periodo.
    // ⚠️ A conta usa o valor JA ARREDONDADO que aparece na tela. Senao o
    // motorista refaz a conta (R$ 0,01 x 1.020 km) e nao fecha com o total
    // mostrado — e para de confiar no numero. Mesmo cuidado do balao de ajuda.
    const difKm  = Number((pior.cpk - melhor.cpk).toFixed(2));   // R$ por km, como aparece
    const kmTotal = tipos.reduce((t, g) => t + (g.km || 0), 0);
    const noPeriodo = difKm * kmTotal;
    if (diff >= 5) {
      verBox.style.display = 'block';
      let txt = dot('verde') + ` Neste período, <b>${melhor.tipo}</b> saiu <b>${fmtBRL(difKm)} mais barato por km</b> que ${pior.tipo} (${diff}%).`;
      if (noPeriodo >= 5) txt += ` Nos ${fmtKm(kmTotal)} km que você rodou, daria <b>${fmtBRL0(noPeriodo)}</b> de diferença.`;
      verBox.innerHTML = txt + nota;
    } else {
      verBox.style.display = 'block';
      verBox.innerHTML = ico('balanca') + ` Os tipos custaram quase igual por km (${fmtBRL(difKm)} de diferença). Vai no que for mais fácil de achar no posto.` + nota;
    }
  } else if (temFurado) {
    // nao da pra comparar porque o unico dado do outro tipo esta furado — diz isso
    verBox.style.display = 'block';
    verBox.innerHTML = ico('alerta') + ' Não consigo comparar os tipos: um abastecimento está com o km errado. Corrija que eu faço a conta.';
  } else {
    verBox.style.display = 'none';
  }
}

// ── EXTRATO FINANÇAS ──
function abrirExtratoFin() {
  extFinModo = 'mes'; extFinOffset = 0;
  document.getElementById('extFinMes').classList.add('ativo');
  document.getElementById('extFinSemana').classList.remove('ativo');
  renderExtratoFin();
  mostrarTela(document.getElementById('telaExtratoFin'));
  navFinancas.classList.add('ativo');
}
function renderExtratoFin() {
  const per = calcPeriodo(extFinModo, extFinOffset);
  document.getElementById('extFinPeriodo').textContent = per.label;
  document.getElementById('extFinDatas').textContent = rangeDatas(per.inicio, per.fim);
  const hist = lerLS('historicoFinancas', []);
  const doPeriodo = hist.filter(r => r.dataISO && r.dataISO >= per.iniISO && r.dataISO <= per.fimISO);
  // agrupa por dia
  const porDia = {};
  doPeriodo.forEach(r => {
    const k = r.dataISO;
    if (!porDia[k]) porDia[k] = { data: r.data, dataISO: k, receita:0, taxa:0, comb:0, desp:0, lucro:0 };
    porDia[k].receita += r.receita; porDia[k].taxa += r.taxa; porDia[k].comb += r.comb;
    porDia[k].desp += (r.desp || 0);   // faltava: sem isso a despesa some do extrato
    porDia[k].lucro += r.lucro;
  });
  const dias = Object.values(porDia).sort((a,b) => b.dataISO.localeCompare(a.dataISO));
  const lucro   = dias.reduce((s,d)=>s+d.lucro,0);
  const receita = dias.reduce((s,d)=>s+d.receita,0);
  const comb    = dias.reduce((s,d)=>s+d.comb,0);
  const taxa    = dias.reduce((s,d)=>s+d.taxa,0);
  const desp    = dias.reduce((s,d)=>s+d.desp,0);
  const media   = dias.length ? lucro/dias.length : 0;
  document.getElementById('extFinLucro').textContent   = fmtBRL0(lucro);
  document.getElementById('extFinReceita').textContent = fmtBRL0(receita);
  document.getElementById('extFinTaxa').textContent    = '- ' + fmtBRL(taxa);
  document.getElementById('extFinComb').textContent    = '- ' + fmtBRL(comb);
  document.getElementById('extFinDesp').textContent    = '- ' + fmtBRL(desp);
  document.getElementById('extFinDias').textContent    = dias.length;
  document.getElementById('extFinMedia').textContent   = fmtBRL0(media);
  const lista = document.getElementById('extFinLista');
  lista.innerHTML = dias.length === 0
    ? '<div class="comb-vazio">Nenhuma receita neste período.</div>'
    : dias.map(r => `
      <div class="fin-hist-item">
        <div><div class="fin-hist-data">${r.data}</div><div class="fin-hist-sub">Receita ${fmtBRL0(r.receita)} · Taxa ${fmtBRL0(r.taxa)} · Comb ${fmtBRL0(r.comb)}${(r.desp||0)>0?' · Desp ' + fmtBRL0(r.desp):''}</div></div>
        <div><div class="fin-hist-lucro" style="color:${r.lucro>=0?'var(--money)':'var(--danger)'}">${fmtBRL(r.lucro)}</div><div class="fin-hist-receita">lucro líquido</div></div>
      </div>`).join('');
  document.getElementById('extFinNext').disabled = extFinOffset >= 0;
  _dadosExtratoFin = { per, dias, lucro, receita, comb, taxa, desp, media };
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTAR — PDF (via impressão do navegador) e CSV
// ═══════════════════════════════════════════════════════════════
function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob(['\uFEFF' + conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nome;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function imprimirPDF(titulo, subtitulo, resumoLinhas, tabelaHeader, tabelaLinhas) {
  const perfil = getPerfil();
  const resumoHTML = resumoLinhas.map(([k,v]) => `<div class="rz"><span>${k}</span><b>${v}</b></div>`).join('');
  const ths = tabelaHeader.map(h => `<th>${h}</th>`).join('');
  const trs = tabelaLinhas.map(cols => '<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
  const win = window.open('', '_blank');
  if (!win) { toast('Permita pop-ups pra gerar o PDF', 'erro'); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      *{font-family:Arial,Helvetica,sans-serif;color:#111}
      body{padding:28px;max-width:720px;margin:auto}
      /* ⚠️ px LITERAL aqui, nunca var(--fN): esta folha vive numa janela nova
         (window.open), que não tem o :root do app. Com var() o navegador
         descarta a regra e o PDF sai inteiro no tamanho padrão. */
      h1{font-size:20px;margin:0} .sub{color:#666;font-size:13px;margin:2px 0 18px}
      .who{font-size:12px;color:#888;margin-bottom:18px}
      .resumo{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
      .rz{display:flex;justify-content:space-between;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:13px}
      .rz b{color:#000}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee}
      th{background:#f5f5f5;font-size:11px;text-transform:uppercase;color:#555}
      .foot{margin-top:24px;font-size:11px;color:#aaa;text-align:center}
      .marca{display:flex;align-items:center;gap:7px;margin-bottom:14px;
        padding-bottom:12px;border-bottom:2px solid #00b473}
      .marca-nome{font-size:15px;font-weight:bold;letter-spacing:.14em;color:#0b7a52}
      .marca-tag{font-size:11px;color:#999;margin-left:auto}
    </style></head><body>
    <div class="marca">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#00b473"
           stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3.5 17a9 9 0 1 1 17 0"/><path d="M12 17l4.2-5"/><circle cx="12" cy="17" r="1.4"/>
      </svg>
      <span class="marca-nome">COPILOTO</span>
      <span class="marca-tag">caderno digital do motorista de app</span>
    </div>
    <h1>${titulo}</h1><div class="sub">${subtitulo}</div>
    <div class="who">${perfil.nome || ''} · ${perfil.modelo || ''}${perfil.placa ? ' · ' + perfil.placa : ''}</div>
    <div class="resumo">${resumoHTML}</div>
    <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <div class="foot">Gerado pelo Copiloto · caderno digital do motorista</div>
    </body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

function exportarFinPDF() {
  const d = _dadosExtratoFin; if (!d || d.dias.length === 0) { toast('Nada pra exportar neste período', 'erro'); return; }
  imprimirPDF('Extrato de ganhos', d.per.label,
    [['Receita bruta',fmtBRL(d.receita)], ['Taxa da plataforma','- ' + fmtBRL(d.taxa)],
     ['Combustível','- ' + fmtBRL(d.comb)], ['Outras despesas','- ' + fmtBRL(d.desp)],
     ['Lucro líquido',fmtBRL(d.lucro)], ['Média por dia',fmtBRL(d.media)]],
    ['Dia','Receita','Taxa','Combustível','Despesas','Lucro'],
    d.dias.map(r => [r.data, fmtBRL(r.receita), fmtBRL(r.taxa), fmtBRL(r.comb), fmtBRL((r.desp||0)), fmtBRL(r.lucro)]));
}
function exportarFinCSV() {
  const d = _dadosExtratoFin; if (!d || d.dias.length === 0) { toast('Nada pra exportar neste período', 'erro'); return; }
  let csv = 'Dia;Receita bruta;Taxa;Combustivel;Outras despesas;Lucro liquido\n';
  d.dias.slice().reverse().forEach(r => { csv += `${r.data};${numBRL(r.receita)};${numBRL(r.taxa)};${numBRL(r.comb)};${numBRL(r.desp||0)};${numBRL(r.lucro)}\n`; });
  baixarArquivo('extrato-ganhos-' + d.per.label.replace(/[ /]/g,'_') + '.csv', csv, 'text/csv;charset=utf-8;');
}
function exportarCombPDF() {
  const d = _dadosExtratoComb; if (!d || d.registros.length === 0) { toast('Nada pra exportar neste período', 'erro'); return; }
  const preco = d.litros > 0 ? fmtBRL((d.gasto/d.litros)) : '—';
  const cpk   = d.km > 0 ? fmtBRL((d.gasto/d.km)) : '—';
  imprimirPDF('Extrato de combustível', d.per.label,
    [['Gasto no período',fmtBRL(d.gasto)], ['Abastecimentos',String(d.registros.length)], ['Preço médio/L',preco], ['Combustível/km',cpk]],
    ['Data','Tipo','Litros','R$/L','Valor','R$/km'],
    d.registros.map(r => [r.data||'', r.tipo, r.litros?r.litros+'L':'—', r.ppl?fmtBRL(numBR(r.ppl)):'—', fmtBRL(r.valor), r.cpm?fmtBRL(numBR(r.cpm)):'—']));
}
function exportarCombCSV() {
  const d = _dadosExtratoComb; if (!d || d.registros.length === 0) { toast('Nada pra exportar neste período', 'erro'); return; }
  let csv = 'Data;Tipo;Litros;PrecoPorLitro;Valor;CustoPorKm;Posto\n';
  d.registros.slice().reverse().forEach(r => { csv += `${r.data||''};${r.tipo};${r.litros||''};${r.ppl?numBRL(r.ppl):''};${numBRL(r.valor)};${r.cpm?numBRL(r.cpm):''};${r.posto||''}\n`; });
  baixarArquivo('extrato-combustivel-' + d.per.label.replace(/[ /]/g,'_') + '.csv', csv, 'text/csv;charset=utf-8;');
}


// ─── DOCUMENTOS ──────────────────────────────────────────────
// ícones SVG modernos (currentColor pega a cor por urgência)
const DOCS_ICONES = {
  crlv:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/><path d="M9 12h6M9 16h6M9 8h3"/></svg>',
  cnh:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.4"/><path d="M14 10h4M14 14h3"/></svg>',
  seguro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>',
  dpvat:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v4H9z"/><path d="M9 12h6M9 16h4"/></svg>',
  ipva:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="2.4"/><path d="M6 13h.01M18 13h.01"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  outro:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4"/></svg>',
};
// documentos com renovação anual — pra sugerir a próxima data automaticamente
const DOCS_TIPOS = [
  { id: 'crlv',   nome: 'CRLV',               renovaMeses: 12 },
  { id: 'cnh',    nome: 'CNH',                renovaMeses: 60 },   // CNH normal renova a cada 5 anos
  { id: 'seguro', nome: 'Seguro auto',        renovaMeses: 12 },
  { id: 'dpvat',  nome: 'Seguro obrigatório', renovaMeses: 12 },
  { id: 'ipva',   nome: 'IPVA',               renovaMeses: 12 },
];
function iconeDoc(tipoId)  { return DOCS_ICONES[tipoId] || DOCS_ICONES.outro; }
function proximaDataAnual(mesesAdiante) {
  const d = new Date(); d.setMonth(d.getMonth() + (mesesAdiante || 12));
  return isoLocal(d);
}
function diasAteVencer(dataStr) {
  if (!dataStr) return null;
  const venc = new Date(dataStr + 'T00:00:00');
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  return Math.ceil((venc - hoje) / (1000*60*60*24));
}
function statusDoc(dias) {
  if (dias === null) return { texto: 'Não cadastrado', cor: 'var(--dim)',    nivel: 'cinza' };
  if (dias < 0)      return { texto: 'Vencido há ' + Math.abs(dias) + 'd', cor: 'var(--danger)', nivel: 'verm' };
  if (dias <= 15)    return { texto: 'faltam ' + dias + 'd', cor: 'var(--danger)', nivel: 'verm' };
  if (dias <= 60)    return { texto: 'faltam ' + dias + 'd', cor: 'var(--signal)', nivel: 'amar' };
  return               { texto: 'faltam ' + dias + 'd', cor: 'var(--money)',  nivel: 'verde' };
}
function atualizarDocumentosDashboard() {
  const docs = lerLS('documentos', {});
  let maisUrgente = null, menosDias = Infinity;
  let alertaCount = 0;                  // quantos docs vencidos ou faltando <=15 dias
  // varre TODOS os documentos: os padrão (DOCS_TIPOS) E os personalizados que o motorista criou
  const _todosDocs = [
    ...DOCS_TIPOS.map(t => ({ id: t.id, nome: t.nome })),
    ...Object.keys(docs).filter(k => !DOCS_TIPOS.find(t => t.id === k))
      .map(k => ({ id: k, nome: (docs[k] && docs[k].nome) || k }))
  ];
  _todosDocs.forEach(tipo => {
    const d = docs[tipo.id];
    if (d && d.vencimento) {
      const dias = diasAteVencer(d.vencimento);
      if (dias < menosDias) { menosDias = dias; maisUrgente = { tipo, dias }; }
      if (dias <= 15) alertaCount++;
    }
  });
  // badge na nav (bolinha vermelha com quantidade)
  const badge = document.getElementById('navDocsBadge');
  if (badge) {
    if (alertaCount > 0) { badge.textContent = alertaCount; badge.style.display = 'flex'; }
    else                   badge.style.display = 'none';
  }
  const card      = document.querySelector('#cardDocumento');
  const cardLabel = document.querySelector('#cardDocLabel');
  const cardValor = document.querySelector('#cardDocValor');
  const cardSub   = document.querySelector('#cardDocSub');
  card.classList.remove('perigo');
  // alerta por exceção: no Início o card de documento só aparece quando há algo pra AGIR
  // (vencido ou vencendo em <=30 dias). Fora disso fica escondido; a aba Docs guarda a lista completa.
  const DOC_ALERTA_DIAS = 30;
  if (!maisUrgente || maisUrgente.dias > DOC_ALERTA_DIAS) { card.style.display = 'none'; return; }
  card.style.display = '';
  const st = statusDoc(maisUrgente.dias);
  cardLabel.textContent = maisUrgente.tipo.nome;
  cardValor.textContent = st.texto;
  cardValor.style.color = st.cor;
  cardSub.textContent   = maisUrgente.dias < 0 ? 'há ' + Math.abs(maisUrgente.dias) + ' dias' : 'toque p/ ver';
  if (maisUrgente.dias <= 15) card.classList.add('perigo');
}
function atualizarTelaDocumentos() {
  const docs  = lerLS('documentos', {});
  const lista = document.querySelector('#docLista');
  const todos = [
    ...DOCS_TIPOS.map(t => ({ ...t, fixo: true })),
    ...Object.keys(docs).filter(k => !DOCS_TIPOS.find(t => t.id === k))
      .map(k => ({ id: k, nome: docs[k].nome || k, icone: '📋', fixo: false }))
  ];
  lista.innerHTML = todos.map(tipo => {
    const d    = docs[tipo.id] || {};
    const dias = d.vencimento ? diasAteVencer(d.vencimento) : null;
    const st   = statusDoc(dias);
    // barra de validade: enche conforme aproxima do vencimento (janela de 90 dias)
    let barra = '';
    if (dias !== null) {
      const pct = Math.max(0, Math.min(100, Math.round(((90 - dias) / 90) * 100)));
      barra = `<div class="doc-bar"><span style="width:${pct}%;background:${st.cor}"></span></div>`;
    }
    return `<div class="doc-item ${st.nivel}">
      <div class="doc-icone" style="color:${st.cor}">${iconeDoc(tipo.id)}</div>
      <div class="doc-info">
        <div class="doc-nome">${esc(tipo.nome)}</div>
        <div class="doc-venc">${d.vencimento ? 'Vence ' + new Date(d.vencimento+'T00:00:00').toLocaleDateString('pt-BR') : 'Não cadastrado'}</div>
        ${barra}
      </div>
      <div class="doc-dir">
        <div class="doc-status" style="color:${st.cor}">${st.texto}</div>
        <div class="doc-acoes">
          <button class="doc-btn-edit" onclick="abrirModalDoc('${tipo.id}')" title="Editar">${ico('lapis')}</button>
          <button class="doc-btn-edit" onclick="excluirDoc('${tipo.id}')" title="Remover">${ico('lixeira')}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function abrirModalDoc(tipoId) {
  const docs = lerLS('documentos', {});
  const d    = docs[tipoId] || {};
  const tipoDef = DOCS_TIPOS.find(t => t.id === tipoId);
  const nome = (tipoDef && tipoDef.nome) || d.nome || tipoId;
  document.getElementById('modalDocTitulo').innerHTML = '<span class="modal-doc-ic">' + iconeDoc(tipoId) + '</span> ' + esc(nome);
  document.getElementById('inputDocVencimento').value   = d.vencimento || '';
  document.getElementById('inputDocObs').value          = d.obs || '';
  document.getElementById('modalDoc').dataset.tipoId    = tipoId;
  document.getElementById('modalDoc').dataset.nomeDoc   = nome || tipoId;
  // botão "renovou? adiantar 1 ano" — só faz sentido pra docs anuais/conhecidos
  const btnSug = document.getElementById('btnSugerirData');
  if (tipoDef && tipoDef.renovaMeses) {
    const meses = tipoDef.renovaMeses;
    btnSug.innerHTML = ico('calendario') + ' Renovou? Adiantar ' + (meses === 12 ? '1 ano' : (meses / 12) + ' anos');
    btnSug.dataset.meses = meses;
    btnSug.style.display = 'block';
  } else {
    btnSug.style.display = 'none';
  }
  document.getElementById('modalDoc').style.display     = 'flex';
}
document.getElementById('btnSugerirData').addEventListener('click', function() {
  const meses = Number(this.dataset.meses) || 12;
  const atual = document.getElementById('inputDocVencimento').value;
  // se já tem data, soma X meses a partir dela; senão, X meses a partir de hoje
  const base = atual ? new Date(atual + 'T12:00:00') : new Date();
  base.setMonth(base.getMonth() + meses);
  document.getElementById('inputDocVencimento').value = isoLocal(base);
});
function excluirDoc(tipoId) {
  const msg = DOCS_TIPOS.find(t => t.id === tipoId) ? 'Deseja remover os dados deste documento?' : 'Deseja excluir este documento?';
  pedirConfirmacao(ico('lixeira') + ' Remover documento', msg, function() {
    const docs = lerLS('documentos', {});
    delete docs[tipoId];
    salvarLS('documentos', docs);
    if (typeof excluirRegistroHibrido === 'function') {
      excluirRegistroHibrido('documentos', 'tipo_id', tipoId).catch(function () {});
    }
    atualizarTelaDocumentos();
    atualizarDocumentosDashboard();
    toast('Documento removido.');
  });
}
document.querySelector('#btnCancelarDoc').addEventListener('click', () => { document.getElementById('modalDoc').style.display = 'none'; });
document.querySelector('#btnSalvarDoc').addEventListener('click', function() {
  const tipoId = document.getElementById('modalDoc').dataset.tipoId;
  const nome   = document.getElementById('modalDoc').dataset.nomeDoc;
  const venc   = document.getElementById('inputDocVencimento').value;
  const obs    = document.getElementById('inputDocObs').value.trim();
  if (!venc) { toast('Informe a data de vencimento', 'erro'); return; }
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  const docs = lerLS('documentos', {});
  docs[tipoId] = { vencimento: venc, obs, nome };
  salvarLS('documentos', docs);
  if (typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('documentos', { tipo_id: tipoId, nome, vencimento: venc, obs }, 'usuario_id,tipo_id').catch(function () {});
  }
  document.getElementById('modalDoc').style.display = 'none';
  atualizarTelaDocumentos();
  atualizarDocumentosDashboard();
  toast('📄 Documento salvo!');
  ptsHook('documento', 'doc:' + hojeISO());
});
document.querySelector('#btnNovoDoc').addEventListener('click', function() {
  document.getElementById('inputNovoDocNome').value = '';
  document.getElementById('inputNovoDocVenc').value = '';
  document.getElementById('inputNovoDocObs').value  = '';
  document.getElementById('modalNovoDoc').style.display = 'flex';
});
document.querySelector('#btnCancelarNovoDoc').addEventListener('click', () => { document.getElementById('modalNovoDoc').style.display = 'none'; });
document.querySelector('#btnSalvarNovoDoc').addEventListener('click', function() {
  const nome = document.getElementById('inputNovoDocNome').value.trim();
  const venc = document.getElementById('inputNovoDocVenc').value;
  const obs  = document.getElementById('inputNovoDocObs').value.trim();
  if (!nome) { toast('Informe o nome do documento', 'erro'); return; }
  if (!venc) { toast('Informe a data de vencimento', 'erro'); return; }
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  const id   = 'custom_' + Date.now();
  const docs = lerLS('documentos', {});
  docs[id]   = { vencimento: venc, obs, nome, icone: '📋' };
  salvarLS('documentos', docs);
  if (typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('documentos', { tipo_id: id, nome, vencimento: venc, obs }, 'usuario_id,tipo_id').catch(function () {});
  }
  document.getElementById('modalNovoDoc').style.display = 'none';
  atualizarTelaDocumentos();
  atualizarDocumentosDashboard();
  toast('📄 Documento adicionado!');
});

// ─── STREAK ──────────────────────────────────────────────────
function mostrarStreak() {
  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  modalStreakNum.textContent  = streak;
  modalStreakData.textContent = dataHoje;
  const diasTxt = streak === 1 ? '1 dia seguido' : streak + ' dias seguidos';
  modalStreakInfo.textContent = diasTxt + '. Enquanto tem gente parada, você tá construindo a sua saída.';
  modalStreak.style.display  = 'flex';
}
modalStreakBtn.addEventListener('click', () => {
  modalStreak.style.display = 'none';
  avisarPisoSeMudou();                         // o piso pode ter nascido/mudado com o dia de hoje
  setTimeout(processarFilaBalaoProg, 220);      // mostra o 1º da fila (encerrar → abastecimento)
});

// ─── FINANÇAS ────────────────────────────────────────────────
btnRegistrarReceita.addEventListener('click', function() {
  const hist = lerLS('historicoFinancas', []);
  const hoje = hist.find(r => r.dataISO === hojeISO());
  if (hoje) {
    // já lançou hoje → abre com o valor pra AJUSTAR (um lançamento por dia)
    tipoReceita = hoje.tipo || 'liquido';
    inputReceita.value = (tipoReceita === 'bruto') ? hoje.receita : (hoje.receita - hoje.taxa);
  } else {
    inputReceita.value = '';
  }
  document.getElementById('modalReceitaTitulo').innerHTML = ico('dinheiro') + (hoje ? ' Ajustar receita de hoje' : ' Receita do dia');
  selecionarTipoReceita(tipoReceita);   // sincroniza a tela com o modo atual (padrão: líquido)
  modalReceita.style.display = 'flex';
});
btnCancelarReceita.addEventListener('click',  () => { modalReceita.style.display = 'none'; });

function selecionarTipoReceita(tipo) {
  tipoReceita = tipo;
  const perfil  = getPerfil();
  const temTaxa = perfil.taxa != null && perfil.taxa > 0;
  document.getElementById('tipoBruto').classList.toggle('ativo',   tipo === 'bruto');
  document.getElementById('tipoLiquido').classList.toggle('ativo', tipo === 'liquido');
  document.getElementById('labelReceita').textContent = tipo === 'bruto' ? 'Receita bruta' : 'Valor recebido';
  // modo bruto sem taxa configurada → pergunta UMA vez (nada de 25% chutado)
  document.getElementById('campoTaxa').style.display = (tipo === 'bruto' && !temTaxa) ? 'block' : 'none';
  if (temTaxa) {
    const pct = Math.round(perfil.taxa * 10) / 10;
    document.getElementById('labelTaxa').textContent = 'Taxa plataforma (' + pct + '%)';
  } else {
    document.getElementById('labelTaxa').textContent = 'Taxa plataforma';
  }
  document.getElementById('receitaDica').textContent = tipo === 'bruto'
    ? (temTaxa ? 'Usando sua taxa de ' + (Math.round(perfil.taxa * 10) / 10) + '%. O líquido é mais exato!'
               : 'Me diz a taxa da sua plataforma que eu calculo o líquido pra você.')
    : 'Esse é o valor certo — o que caiu na sua conta.';
  calcPreviewReceita();
}

// calcula bruto/taxa/líquido conforme o modo escolhido
function contaReceita(valor, brutoOpc) {
  const perfil = getPerfil();
  if (tipoReceita === 'bruto') {
    // taxa salva no perfil, ou a que o usuário digitou agora no campinho (0 se nenhuma)
    let pct = (perfil.taxa != null && perfil.taxa > 0) ? perfil.taxa : (numBR(document.getElementById('inputTaxaPct').value) || 0);
    if (pct < 0 || pct >= 60) pct = 0;   // ignora valores sem sentido
    const taxa = valor * (pct / 100);
    return { bruto: valor, taxa, liquido: valor - taxa };
  }
  // líquido: 'valor' já é o que caiu. bruto opcional só serve pra aprender a taxa.
  if (brutoOpc > valor) return { bruto: brutoOpc, taxa: brutoOpc - valor, liquido: valor };
  return { bruto: valor, taxa: 0, liquido: valor };
}

function calcPreviewReceita() {
  const valor    = numBR(document.getElementById('inputReceita').value) || 0;
  const brutoOpc = 0;   // campo de bruto opcional removido (modo simples)
  const combHoje = combustívelHoje();
  const c = contaReceita(valor, brutoOpc);
  const desp = despesasTotalHoje();
  const lucro = c.liquido - combHoje - desp;

  document.getElementById('prevReceita').textContent = fmtBRL(c.bruto);
  document.getElementById('prevTaxa').textContent    = '- ' + fmtBRL(c.taxa);
  document.getElementById('prevComb').textContent    = '- ' + fmtBRL(combHoje);
  const linhaDesp = document.getElementById('linhaDesp');
  if (linhaDesp) { linhaDesp.style.display = desp > 0 ? 'flex' : 'none'; document.getElementById('prevDesp').textContent = '- ' + fmtBRL(desp); }
  document.getElementById('prevLucro').textContent   = fmtBRL(lucro);
  document.getElementById('prevLucro').style.color   = lucro >= 0 ? 'var(--money)' : 'var(--danger)';
  // mostra a linha de taxa só quando há taxa (bruto, ou líquido com bruto informado)
  document.getElementById('linhaTaxa').style.display = c.taxa > 0 ? 'flex' : 'none';
}

// NOVO: o app aprende sua taxa REAL a partir de bruto x líquido
function aprenderTaxa(bruto, liquido) {
  if (!(bruto > liquido)) return;
  const pct = ((bruto - liquido) / bruto) * 100;
  if (pct <= 0 || pct >= 60) return;           // ignora valores estranhos
  const arr = lerLS('taxasReais', []);
  arr.unshift(pct);
  const ultimas = arr.slice(0, 20);            // média das últimas 20
  salvarLS('taxasReais', ultimas);
  const media = ultimas.reduce((s, x) => s + x, 0) / ultimas.length;
  const perfil = getPerfil();
  perfil.taxa = Math.round(media * 10) / 10;   // salva com 1 casa decimal
  salvarLS('perfilUsuario', perfil);
  sincronizarPerfil();
}

btnConfirmarReceita.addEventListener('click', function() {
  const valor = numBR(document.getElementById('inputReceita').value);
  if (!valor || valor <= 0) { toast('Informe o valor recebido', 'erro'); return; }
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  if (_lockSalvar) return;
  _lockSalvar = true; setTimeout(() => { _lockSalvar = false; }, 800);
  const brutoOpc = 0;   // campo de bruto opcional removido (modo simples)
  const combHoje = combustívelHoje();
  const c = contaReceita(valor, brutoOpc);
  const desp = despesasTotalHoje();
  const lucro = c.liquido - combHoje - desp;

  // se veio bruto + líquido, aprende a taxa real
  if (tipoReceita === 'liquido' && brutoOpc > valor) aprenderTaxa(brutoOpc, valor);
  // modo bruto: se digitou a taxa no campinho, salva no perfil (configura uma vez, nunca mais pergunta)
  if (tipoReceita === 'bruto') {
    const perfilT = getPerfil();
    if (perfilT.taxa == null || perfilT.taxa <= 0) {
      const pctDig = numBR(document.getElementById('inputTaxaPct').value);
      if (pctDig > 0 && pctDig < 60) { perfilT.taxa = Math.round(pctDig * 10) / 10; salvarLS('perfilUsuario', perfilT); }
    }
  }

  let historicoF = lerLS('historicoFinancas', []);
  historicoF = historicoF.filter(r => r.dataISO !== hojeISO());   // um lançamento por dia: remove o de hoje antes
  historicoF.unshift({
    data:    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
    dataISO: hojeISO(),
    receita: c.bruto, taxa: c.taxa, comb: combHoje, desp, lucro, tipo: tipoReceita,
    odo: kmAtual, kmDia: kmRodadoHoje(), vid: vidAtivo()
  });
  salvarLS('historicoFinancas', historicoF);
  // Supabase (Fatia 1): sobe em paralelo. onConflict por data — 1 linha por dia, igual ao local.
  if (typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('financas', {
      data_iso: hojeISO(), receita: c.bruto, liquido: lucro,
      taxa_real: c.taxa, km_dia: kmRodadoHoje(), despesas: desp
    }, 'usuario_id,data_iso').catch(function () {});
  }
  atualizarBannerLucro();
  modalReceita.style.display = 'none';
  atualizarResumoDia();       // atualiza ganho/hora e meta no dashboard
  atualizarTelaFinancas();
  toast('✅ Receita do dia salva!');
  ptsHook('receita', 'rec:' + hojeISO());
  dispararBalaoProg('receita');          // balão que ENSINA na 1ª receita (1x só)
});


// ═══════════════════════════════════════════════════════════════
//  BALÕES PROGRESSIVOS DO ISAAC
//  Ensinam UMA lição na 1ª vez de cada ação (receita, abastecer…).
//  Cada balão aparece UMA vez na vida — o selo fica no localStorage,
//  mesmo padrão do 'isacApresentacoes'. NUNCA inventa número: só fala.
//
//  ►► PRA ADICIONAR UM GATILHO NOVO: ponha a lição em BALOES_PROG e
//     chame dispararBalaoProg('chave') LOGO DEPOIS do salvamento.
//     (⚠️ no "encerrar o dia" isso encosta na cadeia de km: chamar
//      só no finalzinho, depois de tudo gravado — nunca no meio.)
// ═══════════════════════════════════════════════════════════════
let _filaBalaoProg = [];   // fila de balões esperando o momento certo (ex: streak fechar). 1 por vez.
const BALOES_PROG = {
  receita: {
    titulo: 'Entrar dinheiro não é ganhar dinheiro.',
    texto:  'A plataforma mostra o valor cheio. Mas dali sai a <b style="color:var(--danger)">taxa dela e a gasolina</b> — e o dia rende menos do que parece. '
          + '<b style="color:var(--signal)">O Copiloto não fica com nada seu:</b> '
          + 'só te mostro o que <b style="color:var(--money)">sobrou de verdade no seu bolso</b>.'
  },
  abastecimento: {
    titulo: 'Quanto custa cada km que você roda?',
    texto:  'Rodar custa mais que a gasolina: tem o <b style="color:var(--danger)">desgaste do carro que ninguém soma</b>. '
          + 'A maioria não sabe esse número — e é ele que diz <b style="color:var(--signal)">se o dia valeu a pena</b>. '
          + 'Agora o Copiloto mostra pra você.'
  },
  manutencao: {
    titulo: 'Eu aviso antes de quebrar.',
    texto:  'Peça não quebra no dia bom. Ela te espera na <b style="color:var(--danger)">pior hora — no meio da corrida</b>. '
          + 'Registrou a troca? Eu conto os km e <b style="color:var(--signal)">grito antes</b>, com folga pra <b style="color:var(--money)">resolver barato</b>. '
          + '<b style="color:var(--danger)">Quebrar na rua é caro e a pé.</b>'
  },
  encerrarDia: {
    titulo: 'Sua hora vale quanto?',
    texto:  'Ganhar R$ 300 em 6 horas é bem diferente de ganhar em 12. Agora você sabe <b style="color:var(--signal)">quanto cada hora rendeu de verdade</b>. '
          + 'E todo dia eu separo um tiquinho na sua <b style="color:var(--money)">reserva</b>, pra quando a conta grande chegar.'
  }
};
function balaoProgVisto(chave) {
  const m = lerLS('balaoProgVistos', {});
  return !!m[chave];
}
function marcarBalaoProg(chave) {
  const m = lerLS('balaoProgVistos', {});
  m[chave] = true;
  salvarLS('balaoProgVistos', m);
}
function dispararBalaoProg(chave) {
  const b = BALOES_PROG[chave];
  if (!b) return;
  if (balaoProgVisto(chave)) return;                 // essa lição já foi dada
  // trava anti-empilhamento: não abre por cima de OUTRO modal já aberto
  const outroModalAberto = Array.from(document.querySelectorAll('.modal-overlay'))
    .some(m => m.id !== 'modalIsaacProg' && getComputedStyle(m).display !== 'none');
  if (outroModalAberto) return;
  document.getElementById('isaacProgTitulo').textContent = b.titulo;
  document.getElementById('isaacProgTexto').innerHTML    = b.texto;
  document.getElementById('modalIsaacProg').style.display = 'flex';
  marcarBalaoProg(chave);                             // marca só quando REALMENTE mostrou
}
// ── fila: enfileira e mostra 1 de cada vez (nunca dois na cara) ──
function enfileirarBalaoProg(chave) {
  if (balaoProgVisto(chave)) return;                  // lição já dada
  if (_filaBalaoProg.includes(chave)) return;         // já está na fila
  _filaBalaoProg.push(chave);
}
function processarFilaBalaoProg() {
  if (_filaBalaoProg.length === 0) return;
  dispararBalaoProg(_filaBalaoProg.shift());          // o "Entendi" chama o próximo
}
(function ligarBotaoIsaacProg() {
  const btn = document.getElementById('btnIsaacProgOk');
  if (btn) btn.addEventListener('click', function() {
    document.getElementById('modalIsaacProg').style.display = 'none';
    setTimeout(processarFilaBalaoProg, 180);          // encadeia o próximo da fila, se houver
  });
})();

// ═══════════════════════════════════════════════════════════════
//  AJUSTES (engrenagem) — perfil · veículos · reserva/taxa · dados
//  Só LÊ e grava perfil/veículos pelas funções que já existem.
//  A troca de veículo usa trocarVeiculo() (não apaga histórico).
// ═══════════════════════════════════════════════════════════════
function abrirAjustes() {
  const p = getPerfil();
  document.getElementById('ajNome').value       = p.nome || '';
  renderVeiculosAjustes();
  // Botão "Sair" só aparece pra quem está logado — quem não está não tem
  // de onde sair, e o botão só confundiria.
  const logado = (typeof usuarioLogado === 'function') && !!usuarioLogado();
  document.getElementById('ajBtnSair').style.display  = logado ? 'block' : 'none';
  document.getElementById('ajSairDica').style.display = logado ? 'block' : 'none';
  document.getElementById('ajBtnEnviarTudo').style.display = logado ? 'block' : 'none';
  document.getElementById('ajEnviarDica').style.display    = logado ? 'block' : 'none';
  document.getElementById('ajBtnExcluirConta').style.display = logado ? 'block' : 'none';
  document.getElementById('ajExcluirDica').style.display     = logado ? 'block' : 'none';
  // ⚠️ O "Salvar nome" ficava sempre ali, ocupando uma fileira inteira pra uma
  // ação que o motorista faz uma vez. Agora só aparece quando o nome MUDA —
  // e aí ele é óbvio, porque surgiu na hora em que fazia sentido.
  document.getElementById('ajBtnSalvarNome').style.display = 'none';
  // as seções dobradas voltam fechadas toda vez que ele reabre os Ajustes
  document.querySelectorAll('#modalAjustes .aj-fold').forEach(function (d) { d.open = false; });
  document.getElementById('modalAjustes').style.display = 'flex';
}
// "Enviar tudo pra nuvem" — a subida em massa tinha trava de uma-vez-so, entao
// dois aparelhos ficavam cada um com um pedaco do historico e nada reconciliava.
// Aqui ela roda a pedido do motorista. E upsert por id: atualiza o que existe,
// acrescenta o que falta, nunca apaga.
// "Excluir minha conta" — diferente do "Apagar tudo deste aparelho".
// O outro limpa o celular e o motorista pode voltar entrando na conta de novo.
// Este apaga a conta e os dados da NUVEM também, sem volta. Exigência do Google
// Play (todo app com cadastro precisa oferecer isso) e direito garantido pela
// LGPD. Quem apaga de fato é a função no banco — ver supabase-excluir-conta.sql.
document.getElementById('ajBtnExcluirConta').addEventListener('click', function () {
  const btn = document.getElementById('ajBtnExcluirConta');
  if (btn.disabled) return;
  if (typeof usuarioLogado !== 'function' || !usuarioLogado()) { toast('Entre na sua conta primeiro', 'erro'); return; }
  if (!navigator.onLine) { toast('Precisa de internet pra apagar da nuvem', 'erro'); return; }
  fecharAjustes();
  // Duas confirmações: é a ação mais destrutiva do app.
  pedirConfirmacao('Excluir sua conta?',
    'Apaga TUDO, aqui e na nuvem: lançamentos, veículos, histórico, reserva e a própria conta. ' +
    'Não dá pra desfazer. Se quiser guardar seus números, baixe uma cópia antes.',
    function () {
      pedirConfirmacao('Tem certeza mesmo?',
        'Última chance. Depois disso não tem como recuperar nada.',
        function () {
          btn.disabled = true;
          toast('Apagando sua conta...');
          excluirContaNaNuvem().then(function (r) {
            btn.disabled = false;
            if (r && r.ok) {
              // só limpa o aparelho DEPOIS que a nuvem confirmou: se a rede
              // cair no meio, o motorista não fica sem dado local e com a
              // conta ainda de pé na nuvem.
              try { localStorage.clear(); } catch (e) {}
              location.reload();
            } else if (r && r.offline) {
              toast('Sem internet agora. Tente de novo depois.', 'erro');
            } else {
              toast('Não consegui apagar agora. Tente mais tarde.', 'erro');
            }
          }).catch(function () {
            btn.disabled = false;
            toast('Não consegui apagar agora. Tente mais tarde.', 'erro');
          });
        });
    });
});
document.getElementById('ajBtnEnviarTudo').addEventListener('click', function () {
  const btn = document.getElementById('ajBtnEnviarTudo');
  if (btn.disabled) return;
  if (typeof usuarioLogado !== 'function' || !usuarioLogado()) { toast('Entre na sua conta primeiro', 'erro'); return; }
  if (!navigator.onLine) { toast('Sem internet agora. Tente de novo depois.', 'erro'); return; }
  const textoOriginal = btn.textContent;
  btn.disabled = true; btn.textContent = 'Enviando...';
  migrarMotoristaAntigo(usuarioLogado().id, true).then(function (r) {
    btn.disabled = false; btn.textContent = textoOriginal;
    if (r && r.ok) toast('Tudo deste aparelho foi pra sua conta');
    else           toast('Parte não subiu. Tente de novo mais tarde.', 'erro');
  }).catch(function () {
    btn.disabled = false; btn.textContent = textoOriginal;
    toast('Não consegui enviar agora', 'erro');
  });
});
document.getElementById('ajBtnSair').addEventListener('click', function () {
  // Fecha os Ajustes ANTES de pedir a confirmação: senão a confirmação sobe
  // atrás do painel e o motorista precisa fechar um pra ver o outro.
  document.getElementById('modalAjustes').style.display = 'none';
  pedirConfirmacao(
    '🚪 Sair da conta',
    'Você vai precisar entrar de novo para salvar suas alterações. Quer sair?',
    async function () {
      if (typeof sbSair === 'function') await sbSair();
      salvarLS('saiuDaConta', true);   // se fechar o app, continua travado ao reabrir
      _pediuLogin = false;
      // Sair significa sair: o app trava na tela de login (opção A). Os dados
      // continuam no aparelho — entrando de novo, tudo volta do jeito que estava.
      travarNaTelaDeLogin();
    }
  );
});

// Esconde o app e deixa só o login na frente. Usado ao sair da conta.
// ⚠️ NÃO dá pra esconder o .dashboard inteiro: o modal de login mora dentro
// dele. Esconde as telas e a navegação, que é o que o motorista veria.
function travarNaTelaDeLogin() {
  document.querySelectorAll('.modal-overlay, .modal-streak').forEach(function (m) {
    if (m.id !== 'modalLogin') m.style.display = 'none';
  });
  ['telaInicio','telaManutencao','telaCombustivel','telaFinancas','telaDocumentos','telaCade','telaExtrato','telaExtratoFin','telaDespesas']
    .forEach(function (id) { const t = document.getElementById(id); if (t) t.style.display = 'none'; });
  const nav = document.getElementById('navInferior');
  if (nav) nav.style.display = 'none';
  const p = lerLS('perfilUsuario', null);
  abrirLoginExistente(p && p.email);
  document.getElementById('btnFecharLogin').style.display = 'none';   // sem X: não dá pra escapar
  document.getElementById('btnCancelarLogin').style.display = 'none';
  document.getElementById('btnCriarConta').style.display = '';        // ...mas dá pra recomeçar
}

// Devolve o app depois que ele entra de novo.
function destravarDaTelaDeLogin() {
  // ⚠️ mostrarTela() espera o ELEMENTO, não o id em texto — passar string
  // quebra na hora de aplicar o display e o app não voltaria após o login.
  const nav = document.getElementById('navInferior');
  if (nav) nav.style.display = 'flex';
  document.getElementById('btnFecharLogin').style.display = '';
  document.getElementById('btnCancelarLogin').style.display = '';
  document.getElementById('btnCriarConta').style.display = 'none';
  if (typeof telaInicio !== 'undefined' && telaInicio) {
    mostrarTela(telaInicio);
    if (typeof navInicio !== 'undefined' && navInicio) navInicio.classList.add('ativo');
    initDashboard();
  }
}

// ─── Login exigido ao lançar ──────────────────────────────────
// Quem saiu (ou teve a sessão expirada) precisa entrar de novo para que os
// lançamentos voltem a ser salvos. Regras que NÃO se quebram:
//   1. o lançamento JÁ foi salvo aqui antes desta tela — nada se perde;
//   2. offline não pede login: sem internet não há como entrar, e o app
//      é PWA — tem que funcionar sem sinal. Salva local e sobe depois;
//   3. quem nunca criou conta não é incomodado;
//   4. pede uma vez por sessão, não a cada clique.
// ─── Login exigido ao lançar ──────────────────────────────────
// Regra combinada com o dono do produto:
//   • Bora rodar (encerrar turno) → deixa fechar e pede login DEPOIS.
//     É o momento mais crítico do dia: ele rodou o turno inteiro e está
//     fechando o km. Interromper aqui seria o pior lugar possível.
//   • Receita, abastecimento, despesa, manutenção, documento → login ANTES
//     de registrar. Sem entrar, não lança.
//   • Sem internet → tudo passa. Não há como entrar sem sinal, e o app é
//     PWA: tem que funcionar em túnel, estrada, chip sem dados.
//   • Quem nunca criou conta não é incomodado.
function precisaLogin() {
  if (!navigator.onLine) return false;
  if (typeof usuarioLogado !== 'function' || typeof getSB !== 'function') return false;
  if (usuarioLogado()) return false;
  // ⚠️ Antes isto exigia `perfil.email`, que só existe pra quem se cadastrou
  // NESTE aparelho. Quem restaurou da nuvem (ou já teve sessão) não tem esse
  // campo — e o bloqueio nunca disparava. Agora a marca de que existe conta é
  // o `contaCriada`, gravado tanto no cadastro quanto no login.
  const p = lerLS('perfilUsuario', null);
  return !!(lerLS('contaCriada', false) || (p && p.email));
}

// Telas que BLOQUEIAM: quem chama faz `if (bloquearSemLogin()) return;`
// ANTES de salvar — o lançamento não acontece sem entrar.
function bloquearSemLogin() {
  if (!precisaLogin()) return false;
  // Fecha o que estiver aberto antes de subir o login: senão ele aparece
  // ATRÁS do formulário e o motorista não entende o que aconteceu.
  document.querySelectorAll('.modal-overlay, .modal-streak').forEach(function (m) {
    if (m.id !== 'modalLogin') m.style.display = 'none';
  });
  const p = lerLS('perfilUsuario', null);
  abrirLoginExistente(p && p.email);
  return true;
}

// Só no fecha-turno: o registro já aconteceu, o login vem depois.
function exigirLoginSePreciso() {
  if (_pediuLogin) return;
  if (!precisaLogin()) return;
  _pediuLogin = true;
  document.querySelectorAll('.modal-overlay, .modal-streak').forEach(function (m) {
    if (m.id !== 'modalLogin') m.style.display = 'none';
  });
  const p = lerLS('perfilUsuario', null);
  abrirLoginExistente(p && p.email);
}
function fecharAjustes() { document.getElementById('modalAjustes').style.display = 'none'; }

function renderVeiculosAjustes() {
  const box = document.getElementById('ajListaVeic');
  if (!box) return;
  const vs = lerVeiculos();
  const at = vidAtivo();
  if (!vs.length) { box.innerHTML = '<div class="aj-dica">Nenhum veículo cadastrado ainda.</div>'; return; }
  box.innerHTML = vs.map(function(v) {
    const ativo = v.id === at;
    const placa = v.placa ? ' · ' + esc(v.placa) : '';
    const tag   = ativo ? '<span class="aj-veic-tag">ativo</span>'
                        : '<span class="aj-veic-tag trocar">trocar ›</span>';
    return '<div class="aj-veic ' + (ativo ? 'ativo' : '') + '" onclick="trocarVeicAjustes(\'' + v.id + '\')">'
         + '<span class="aj-veic-nome">' + esc(nomeVeiculo(v)) + placa + '</span>' + tag + '</div>';
  }).join('');
}
function trocarVeicAjustes(vid) {
  if (vid === vidAtivo()) return;               // já é o ativo
  trocarVeiculo(vid);                            // troca o ativo — NÃO mexe no histórico
  renderVeiculosAjustes();
  if (typeof atualizarResumoDia === 'function') atualizarResumoDia();
  toast('🔄 Agora rodando ' + nomeVeiculo(veiculoAtivo()));
}

// ── + ADICIONAR VEÍCULO (só cria na garagem; NÃO fecha dia, não toca no km) ──
let _ajAddTipo = 'moto';
function ajSelTipo(t) {
  _ajAddTipo = (t === 'carro') ? 'carro' : 'moto';
  document.getElementById('ajTipoMoto').classList.toggle('ativo', _ajAddTipo === 'moto');
  document.getElementById('ajTipoCarro').classList.toggle('ativo', _ajAddTipo === 'carro');
}
(function ligarAddVeic() {
  const btnAbrir = document.getElementById('ajBtnAddVeic');
  if (!btnAbrir) return;
  const form = document.getElementById('ajAddVeicForm');
  const erro = document.getElementById('ajAddVeicErro');
  btnAbrir.addEventListener('click', function() {
    btnAbrir.style.display = 'none';
    form.style.display = 'block';
    document.getElementById('ajVeicModelo').value = '';
    document.getElementById('ajVeicPlaca').value  = '';
    document.getElementById('ajVeicKm').value      = '';
    erro.style.display = 'none';
    ajSelTipo('moto');
  });
  document.getElementById('ajTipoMoto').addEventListener('click',  () => ajSelTipo('moto'));
  document.getElementById('ajTipoCarro').addEventListener('click', () => ajSelTipo('carro'));
  document.getElementById('ajAddVeicCancelar').addEventListener('click', function() {
    form.style.display = 'none'; btnAbrir.style.display = '';
  });
  document.getElementById('ajAddVeicSalvar').addEventListener('click', function() {
    const modelo = document.getElementById('ajVeicModelo').value.trim();
    if (!modelo) { erro.textContent = 'Informe o modelo.'; erro.style.display = 'block'; return; }
    const placa = document.getElementById('ajVeicPlaca').value;
    const kmRaw = document.getElementById('ajVeicKm').value.trim();
    let odo = null;
    if (kmRaw) {
      const k = numKm(kmRaw);
      if (k == null || k < 0) { erro.textContent = 'Km inválido. Deixe em branco se não souber.'; erro.style.display = 'block'; return; }
      odo = Math.round(k);
    }
    const novo = criarVeiculo(_ajAddTipo, modelo, placa, odo);   // só cria — NÃO fecha dia
    form.style.display = 'none'; btnAbrir.style.display = '';
    renderVeiculosAjustes();
    toast('✅ ' + nomeVeiculo(novo) + ' na garagem. Toque nele pra rodar.');
  });
})();

document.getElementById('ajNome').addEventListener('input', function () {
  const atual = (getPerfil().nome || '').trim();
  const novo  = this.value.trim();
  document.getElementById('ajBtnSalvarNome').style.display =
    (novo && novo !== atual) ? 'block' : 'none';
});
document.getElementById('ajBtnSalvarNome').addEventListener('click', function() {
  const nome = document.getElementById('ajNome').value.trim();
  if (!nome) { toast('Digite seu nome', 'erro'); return; }
  const p = getPerfil(); p.nome = nome; salvarLS('perfilUsuario', p);
  sincronizarPerfil();
  const hSaud = document.getElementById('headerSaudacao');       // atualiza o cabeçalho na hora
  if (hSaud) {
    const h = new Date().getHours();
    const saud = h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite');
    hSaud.textContent = saud + ' ' + arrumarNome(nome.split(' ')[0]) + ' 👋';
  }
  toast('✅ Nome salvo!');
  this.style.display = 'none';   // salvou: o botão some de novo
});

// ── BACKUP: baixa um JSON com TODO o localStorage ──
document.getElementById('ajBtnBackup').addEventListener('click', function() {
  try {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      dump[k] = localStorage.getItem(k);
    }
    const payload = { _app: 'copiloto', _v: 1, _data: new Date().toISOString(), dados: dump };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'copiloto-backup-' + hojeISO() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('⬇️ Backup baixado!');
  } catch (e) { toast('Não consegui gerar o backup', 'erro'); }
});

// ── RESTAURAR: lê o JSON e repõe tudo (com confirmação) ──
document.getElementById('ajBtnRestaurar').addEventListener('click', function() {
  document.getElementById('ajInputRestore').click();
});
document.getElementById('ajInputRestore').addEventListener('change', function(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';                               // deixa reescolher o mesmo arquivo depois
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function() {
    let payload;
    try { payload = JSON.parse(reader.result); } catch (e) { toast('Arquivo inválido', 'erro'); return; }
    const dados = (payload && payload.dados && typeof payload.dados === 'object') ? payload.dados : null;
    if (!dados) { toast('Backup não reconhecido', 'erro'); return; }
    pedirConfirmacao('Restaurar backup?',
      'Isso substitui os dados de agora pelos do arquivo. Não dá pra desfazer.',
      function() {
        try {
          localStorage.clear();
          Object.keys(dados).forEach(function(k) { localStorage.setItem(k, dados[k]); });
          location.reload();
        } catch (e) { toast('Falha ao restaurar', 'erro'); }
      });
  };
  reader.readAsText(file);
});

// ── APAGAR TUDO: confirmação DUPLA ──
document.getElementById('ajBtnApagar').addEventListener('click', function() {
  pedirConfirmacao('Apagar tudo deste aparelho?',
    'Limpa este celular e o app volta como novo. Sua CONTA e o histórico na nuvem continuam — dá pra voltar entrando de novo. ' +
    'Pra apagar de vez, use "Excluir minha conta".',
    function() {
      pedirConfirmacao('Tem certeza mesmo?',
        'Última chance. Isso apaga tudo pra sempre.',
        function() { try { localStorage.clear(); } catch (e) {} location.reload(); });
    });
});

// ═══════════════════════════════════════════════════════════════
//  PROJEÇÃO DO MÊS — estima o fechamento com base no seu ritmo
// ═══════════════════════════════════════════════════════════════
function projecaoMensal() {
  const hist = lerLS('historicoFinancas', []);
  const hoje = new Date();
  const ym   = hojeISO().slice(0, 7);   // AAAA-MM (relógio local)
  const doMes = hist.filter(r => (r.dataISO || '').slice(0, 7) === ym);
  if (doMes.length === 0) return null;

  const porDia = {};
  doMes.forEach(r => { porDia[r.dataISO] = (porDia[r.dataISO] || 0) + r.lucro; });
  const diasRodados = Object.keys(porDia).length;
  if (diasRodados === 0) return null;   // mês zerado: não faz 0÷0 (dava "R$ NaN" na tela)
  const lucroMes    = Object.values(porDia).reduce((s, v) => s + v, 0);
  const diaDoMes    = hoje.getDate();
  const diasNoMes   = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const mediaDia    = lucroMes / diasRodados;
  const freq        = Math.min(1, diasRodados / diaDoMes);       // com que frequência ele roda
  const diasProjetados = Math.max(diasRodados, Math.round(freq * diasNoMes));
  const projecao    = mediaDia * diasProjetados;
  return { lucroMes, diasRodados, mediaDia, projecao, diasNoMes, diaDoMes, diasProjetados, suficiente: diasRodados >= 3 };
}
function renderProjecao() {
  const card = document.getElementById('projCard');
  if (!card) return;
  const p     = projecaoMensal();
  const valor = document.getElementById('projValor');
  const sub   = document.getElementById('projSub');
  const barra = document.getElementById('projBarra');
  const pe    = document.getElementById('projPe');
  const tag   = document.getElementById('projTag');

  if (!p) {
    valor.textContent = '—';
    sub.textContent = 'Registre sua receita pra eu projetar seu mês';
    barra.style.width = '0%'; pe.textContent = ''; tag.style.display = 'none';
    return;
  }
  tag.style.display = 'inline-block';
  valor.textContent = fmtBRL0(p.projecao);
  if (!p.suficiente) {
    tag.textContent = 'ainda juntando';
    sub.textContent = 'Rode mais uns dias que a projeção fica mais certeira.';
  } else {
    tag.textContent = 'estimativa';
    sub.textContent = 'No seu ritmo: ' + p.diasRodados + ' dias rodados, média ' + fmtBRL0(p.mediaDia) + '/dia.';
  }
  const pct = p.projecao > 0 ? Math.max(0, Math.min(100, Math.round((p.lucroMes / p.projecao) * 100))) : 0;
  barra.style.width = pct + '%';
  pe.innerHTML = 'Já garantiu <b>' + fmtBRL0(p.lucroMes) + '</b> este mês (' + pct + '% da projeção).';
}

// ─── DESPESAS DO DIA (grid opcional) ─────────────────────────
const CATS_DESPESA = {
  pedagio:        { icon:'pedagio',  label:'Pedágio' },
  alimentacao:    { icon:'comida',   label:'Alimentação' },
  lavagem:        { icon:'lavagem',  label:'Lavagem' },
  estacionamento: { icon:'estacionar', label:'Estacionamento' },
  internet:       { icon:'celular',  label:'Internet/chip' },
  outro:          { icon:'mais',     label:'Outro' },
};
let despCatSel = null;
// Reconstrói a categoria a partir da descrição. Serve para as despesas que
// subiram para a nuvem ANTES da coluna `cat` existir — nelas só sobrou o texto
// ("Pedágio", "Alimentação"...). Sem isto, tudo voltaria como "Outro".
function catPelaDescricao(texto) {
  const t = String(texto || '').toLowerCase();
  if (/ped[áa]gio/.test(t))      return 'pedagio';
  if (/aliment/.test(t))         return 'alimentacao';
  if (/lavagem/.test(t))         return 'lavagem';
  if (/estacion/.test(t))        return 'estacionamento';
  if (/internet|chip/.test(t))   return 'internet';
  return 'outro';
}
function lerDespesasDia(iso) {
  const todas = lerLS('despesasPorDia', {});
  return todas[iso] || [];
}
function salvarDespesasDia(iso, lista) {
  const todas = lerLS('despesasPorDia', {});
  if (lista.length) todas[iso] = lista; else delete todas[iso];
  salvarLS('despesasPorDia', todas);
}
function despesasTotalHoje() {
  return lerDespesasDia(hojeISO()).reduce((s, d) => s + d.valor, 0);
}
function renderDespesas() {
  const elLista = document.getElementById('despLista');
  if (!elLista) return;
  const lista = lerDespesasDia(hojeISO());
  elLista.innerHTML = lista.map(d =>
    `<div class="desp-item">
       <div class="desp-item-esq">${ico((CATS_DESPESA[d.cat] || {}).icon || 'saindo')} ${esc(d.label)}</div>
       <div class="desp-item-dir">
         <span class="desp-item-val">− ${fmtBRL(d.valor)}</span>
         <button class="desp-item-x" onclick="removerDespesa('${d.id}')" aria-label="Remover">${ico('x')}</button>
       </div>
     </div>`).join('');
  const total = despesasTotalHoje();
  const elVazio = document.getElementById('despVazio'); if (elVazio) elVazio.style.display = lista.length ? 'none' : 'block';
  const elTotal = document.getElementById('despTotal');
  if (elTotal) {
    if (total > 0) { elTotal.style.display = 'flex'; elTotal.innerHTML = '<span class="desp-total-lbl">Total de hoje</span><span class="desp-total-val">− ' + fmtBRL(total) + '</span>'; }
    else elTotal.style.display = 'none';
  }
  const btnT = document.getElementById('btnDespesasTotal'); if (btnT) btnT.textContent = total > 0 ? ' · − ' + fmtBRL(total) : '';
}
function refreshAposDespesa() {
  ressincronizarReceitaHoje();
  atualizarBannerLucro();
  atualizarResumoDia();
  if (document.getElementById('telaFinancas')) atualizarTelaFinancas();
}
function selecionarChipDespesa(cat) {
  if (!CATS_DESPESA[cat]) return;
  despCatSel = cat;
  document.querySelectorAll('#despChips .desp-chip').forEach(c => c.classList.toggle('ativo', c.dataset.cat === cat));
  document.getElementById('despInputCat').textContent = CATS_DESPESA[cat].label;
  const row = document.getElementById('despInputRow');
  row.style.display = 'flex';
  const inp = document.getElementById('despInputValor');
  inp.value = '';
  inp.focus();
}
function adicionarDespesa() {
  if (!despCatSel) return;
  const valor = numBR(document.getElementById('despInputValor').value);
  if (!valor || valor <= 0) { toast('Informe um valor', 'erro'); return; }
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  // trava anti-clique-duplo (mesmo BUG-001 da v3.16) — aqui faltava. Despesa usa
  // lista.push (soma), diferente de documento/manutenção que sobrescrevem por
  // chave, então um duplo-toque aqui realmente duplicava o lançamento.
  if (_lockSalvar) return;
  _lockSalvar = true; setTimeout(() => { _lockSalvar = false; }, 800);
  const lista = lerDespesasDia(hojeISO());
  lista.push({
    id: 'dp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    cat: despCatSel, label: CATS_DESPESA[despCatSel].label, valor
  });
  salvarDespesasDia(hojeISO(), lista);
  // Supabase: a despesa recém-criada é a última da lista
  const nova = lista[lista.length - 1];
  if (typeof salvarRegistroHibrido === 'function') {
    salvarRegistroHibrido('despesas', {
      id: nova.id, data_iso: hojeISO(),
      descricao: nova.label, valor: nova.valor,
      cat: nova.cat || 'outro'   // sem isto, pedágio voltava da nuvem como "outros"
    }, 'id').catch(function () {});
  }
  refreshAposDespesa();
  document.getElementById('despInputRow').style.display = 'none';
  document.querySelectorAll('#despChips .desp-chip').forEach(c => c.classList.remove('ativo'));
  despCatSel = null;
  renderDespesas();
  ptsHook('despesa', 'desp:' + hojeISO());   // 1 ponto por dia (trava anti-farm)
  toast('Despesa adicionada');
}
function removerDespesa(id) {
  let lista = lerDespesasDia(hojeISO());
  lista = lista.filter(d => d.id !== id);
  salvarDespesasDia(hojeISO(), lista);
  if (typeof excluirRegistroHibrido === 'function') {
    excluirRegistroHibrido('despesas', 'id', id).catch(function () {});
  }
  renderDespesas();
  refreshAposDespesa();
}
(function ligarDespesas() {
  const chips = document.getElementById('despChips');
  if (chips) chips.addEventListener('click', function(e) {
    const chip = e.target.closest('.desp-chip');
    if (chip) selecionarChipDespesa(chip.dataset.cat);
  });
  const add = document.getElementById('despAddBtn');
  if (add) add.addEventListener('click', adicionarDespesa);
  const inp = document.getElementById('despInputValor');
  if (inp) inp.addEventListener('keydown', function(e) { if (e.key === 'Enter') adicionarDespesa(); });
})();

let desempenhoView = 'mes';
// Quantos dias o motorista já tem, e quantos faltam pra cada aba funcionar.
// Cada aba tem uma régua diferente porque cada conta precisa de coisa diferente:
// comparar HOJE com o normal dele exige um normal (5 dias); comparar SEMANAS
// exige 3 dias; projetar o MÊS exige pelo menos um dia lançado.
function faltaDias(n) {   // concordância: "Falta 1 dia" / "Faltam 3 dias"
  return (n === 1 ? 'Falta <b>1 dia</b>' : 'Faltam <b>' + n + ' dias</b>');
}
function textoFaltaDesempenho(aba) {
  const hist = lerLS('historicoFinancas', []);
  const dias = new Set(hist.map(r => r.dataISO).filter(Boolean));
  const n    = dias.size;
  const temHoje = dias.has(hojeISO());
  if (aba === 'hoje') {
    const anteriores = n - (temHoje ? 1 : 0);
    const faltam = 5 - anteriores;
    if (!temHoje) {
      return anteriores >= 5
        ? ico('raio') + ' <b>Registre a receita de hoje</b> e eu comparo na hora com o seu normal.'
        : ico('raio') + ' Pra saber se hoje foi bom eu preciso saber qual é o <b>seu normal</b>. ' +
          faltaDias(faltam) + ' — e hoje ainda nem entrou.';
    }
    return ico('raio') + ' <b>Hoje já está registrado</b> — o que falta é o resto. ' +
           (anteriores === 0
              ? 'Sem nenhum outro dia no histórico'
              : 'Com <b>' + anteriores + (anteriores === 1 ? ' dia</b>' : ' dias</b>')) +
           ' eu ainda não sei qual é o <b>seu normal</b>, e com menos de 5 a média é chute. ' +
           faltaDias(faltam) + '.';
  }
  if (aba === 'semana') {
    const faltam = 3 - n;
    return ico('calendario') + ' Comparar uma semana com a outra precisa de <b>3 dias</b> registrados. ' +
           'Você tem <b>' + n + (n === 1 ? ' dia</b>' : ' dias</b>') + ' — ' +
           faltaDias(faltam).toLowerCase().replace('falta', 'falta') + '.';
  }
  return ico('sobe') + ' <b>Registre a receita de um dia</b> que eu já projeto onde seu mês fecha — ' +
         'pra você não levar susto no dia 30.';
}
function mostrarDesempenho(v) {
  desempenhoView = v;
  const map = { hoje:'compPersonal', semana:'comparativoSemanal', mes:'projCard' };
  Object.values(map).forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  if (v === 'hoje') renderCompPersonal();
  else if (v === 'semana') atualizarComparativoSemanal();
  else { renderProjecao(); const pc = document.getElementById('projCard'); if (pc) pc.style.display = 'block'; }
  const sel = document.getElementById(map[v] || 'projCard');
  const pronto = sel && getComputedStyle(sel).display !== 'none';
  const ph = document.getElementById('desempenhoPlaceholder');
  if (ph) {
    ph.style.display = pronto ? 'none' : 'block';
    if (!pronto) {
      // ⚠️ O texto era fixo: dizia "Registra hoje e eu te mostro" mesmo pra quem
      // JÁ tinha registrado hoje. O motorista lançava a receita, via o número na
      // tela, abria a aba e o app mandava ele fazer o que ele acabou de fazer.
      // (mesma correção que a v3.64 fez no simulador — o app sabe a contagem,
      // então ele tem que DIZER a contagem em vez de mandar recado genérico)
      ph.innerHTML = textoFaltaDesempenho(desempenhoView);
    }
  }
  document.querySelectorAll('#desempenhoToggle .seg-btn').forEach(b => b.classList.toggle('ativo', b.dataset.v === v));
}
function atualizarTelaFinancas() {
  renderDespesas();
  const historico = lerLS('historicoFinancas', []);
  renderProjecao();
  if (historico.length === 0) {
    ['finLucroValor','finReceita','finTaxa','finCombustivel','finLucroKm'].forEach(id => document.getElementById(id).textContent = '—');
    document.getElementById('finLucroSub').textContent = 'Registre sua receita do dia';
    mostrarDesempenho(desempenhoView); return;
  }
  // ⚠️ O rótulo desta caixa é "LUCRO LÍQUIDO HOJE" e o código pegava
  // historico[0] SEM conferir a data. Quem fechou ontem e abria as Finanças
  // hoje de manhã via o lucro de ontem carimbado como de hoje — enquanto a
  // tela Início, ali do lado, dizia corretamente "Registre sua receita do dia".
  // Duas telas do mesmo app se contradizendo, e a que mentia era a que ele
  // abre pra decidir se para ou continua rodando.
  const ultimo = historico.find(r => r.dataISO === hojeISO());
  if (!ultimo) {
    ['finLucroValor','finReceita','finTaxa','finCombustivel','finLucroKm']
      .forEach(id => document.getElementById(id).textContent = '—');
    document.getElementById('finLucroValor').style.color = 'var(--text)';
    document.getElementById('finLucroSub').textContent = 'Registre sua receita do dia';
    mostrarDesempenho(desempenhoView); return;
  }
  document.getElementById('finLucroValor').textContent  = fmtBRL(ultimo.lucro);
  document.getElementById('finLucroValor').style.color  = ultimo.lucro >= 0 ? 'var(--money)' : 'var(--danger)';
  document.getElementById('finLucroSub').textContent    = 'Receita ' + fmtBRL0(ultimo.receita) + ' · Custos ' + fmtBRL0(ultimo.taxa + ultimo.comb + (ultimo.desp || 0));
  document.getElementById('finReceita').textContent     = fmtBRL(ultimo.receita);
  document.getElementById('finTaxa').textContent        = '- ' + fmtBRL(ultimo.taxa);
  document.getElementById('finCombustivel').textContent = ultimo.comb > 0 ? '- ' + fmtBRL(ultimo.comb) : '—';
  // km do dia: fonte única (kmPorDia). Sem km conhecido, mostra '—' — não inventa.
  const kmCalc = kmDoDia(ultimo.dataISO);
  document.getElementById('finLucroKm').textContent = (kmCalc && kmCalc > 0) ? fmtBRL((ultimo.lucro / kmCalc)) : '—';
  mostrarDesempenho(desempenhoView);
}

// ─── CARD COMPARATIVO "HOJE vs SEU NORMAL" ───────────────────
// só aparece com pelo menos 5 dias de histórico (senão a média é chute)
function renderCompPersonal() {
  const box = document.getElementById('compPersonal');
  if (!box) return;
  const hist = lerLS('historicoFinancas', []);
  // soma por dia (evita registros duplicados)
  const porDia = {};
  hist.forEach(r => { if (r.dataISO) porDia[r.dataISO] = (porDia[r.dataISO] || 0) + r.lucro; });
  const isos = Object.keys(porDia).sort().reverse();   // mais recentes primeiro
  const iso = hojeISO();
  const anteriores = isos.filter(k => k !== iso).slice(0, 30);   // até 30 dias, sem contar hoje
  if (anteriores.length < 5) { box.style.display = 'none'; return; }
  const hoje = porDia[iso];
  if (hoje === undefined) { box.style.display = 'none'; return; }
  const media = anteriores.reduce((s, k) => s + porDia[k], 0) / anteriores.length;
  const diff  = hoje - media;
  box.style.display = 'block';
  document.getElementById('cpHoje').textContent  = fmtBRL0(hoje) + ' hoje';
  document.getElementById('cpMedia').textContent = fmtBRL0(media);
  document.getElementById('cpBase').textContent  = 'média dos últimos ' + anteriores.length + ' dias que você rodou';
  const v = document.getElementById('cpVerdict');
  v.classList.remove('acima','abaixo','igual');
  if (Math.abs(diff) < media * 0.08) {           // dentro de ±8% = "normal"
    v.classList.add('igual');
    v.innerHTML = ico('balanca') + ' Dia dentro do seu normal';
  } else if (diff > 0) {
    v.classList.add('acima');
    v.innerHTML = dot('verde') + ' ' + fmtBRL0(diff) + ' acima do seu normal';
  } else {
    v.classList.add('abaixo');
    v.innerHTML = dot('vermelho') + ' ' + fmtBRL0(Math.abs(diff)) + ' abaixo do seu normal';
  }
}
function abrirAjudaComp() { document.getElementById('modalAjudaComp').style.display = 'flex'; }
document.getElementById('btnFecharAjudaComp').addEventListener('click', () => { document.getElementById('modalAjudaComp').style.display = 'none'; });
document.getElementById('btnFecharAjudaCard').addEventListener('click', () => { document.getElementById('modalAjudaCard').style.display = 'none'; });


// ─── COMPARATIVO SEMANAL ─────────────────────────────────────
function getInicioSemana(date) {
  const d = new Date(date), dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia));
  d.setHours(0,0,0,0); return d;
}
function atualizarComparativoSemanal() {
  const historico = lerLS('historicoFinancas', []);
  const bloco = document.getElementById('comparativoSemanal');
  // esconde o bloco inteiro enquanto não tem dado o bastante pra fazer sentido
  const diasUnicos = new Set(historico.map(r => r.dataISO).filter(Boolean));
  if (diasUnicos.size < 3) { bloco.style.display = 'none'; return; }
  bloco.style.display = 'block';
  const grafico = document.getElementById('compGrafico');
  const destaques = document.getElementById('compDestaques');
  const vazio = document.getElementById('compVazio');
  if (historico.length === 0) {
    grafico.innerHTML = ''; destaques.style.display = 'none'; vazio.style.display = 'block';
    document.getElementById('compTotalAtual').textContent    = '—';
    document.getElementById('compVariacao').textContent      = '—';
    document.getElementById('compVariacaoLabel').textContent = 'sem histórico';
    return;
  }
  vazio.style.display = 'none';
  const hoje = new Date();
  const inicioAtual   = getInicioSemana(hoje);
  const inicioPassada = new Date(inicioAtual); inicioPassada.setDate(inicioPassada.getDate()-7);
  const porDia = {};
  historico.forEach(r => { if (!r.dataISO) return; if (!porDia[r.dataISO]) porDia[r.dataISO] = 0; porDia[r.dataISO] += r.lucro; });
  const DIAS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const atual = [], passada = [];
  for (let i = 0; i < 7; i++) {
    const dA = new Date(inicioAtual); dA.setDate(dA.getDate()+i);
    const dP = new Date(inicioPassada); dP.setDate(dP.getDate()+i);
    atual.push(porDia[isoLocal(dA)] ?? null);
    passada.push(porDia[isoLocal(dP)] ?? null);
  }
  const totalAtual   = atual.reduce((s,v)=>s+(v||0),0);
  const totalPassada = passada.reduce((s,v)=>s+(v||0),0);
  document.getElementById('compTotalAtual').textContent = fmtBRL(totalAtual);
  const varEl = document.getElementById('compVariacao'), varLabel = document.getElementById('compVariacaoLabel');
  if (totalPassada > 0) {
    const diff = totalAtual - totalPassada, pct = ((diff/totalPassada)*100).toFixed(0);
    varEl.textContent = (diff >= 0 ? '▲ +' : '▼ ') + pct + '%';
    varEl.className   = 'comp-variacao num ' + (diff >= 0 ? '' : 'negativo');
    varLabel.textContent = 'vs ' + fmtBRL0(totalPassada) + ' na semana passada';
  } else { varEl.textContent = '—'; varEl.className = 'comp-variacao num neutro'; varLabel.textContent = 'sem dados anteriores'; }
  const validos = atual.filter(v => v !== null);
  const maxV    = validos.length > 0 ? Math.max(...validos.map(Math.abs)) : 1;
  const diaHoje = hoje.getDay(), idxHoje = diaHoje === 0 ? 6 : diaHoje - 1;
  let melhorIdx = -1, piorIdx = -1, melhorVal = -Infinity, piorVal = Infinity;
  atual.forEach((v,i) => { if (v!==null) { if(v>melhorVal){melhorVal=v;melhorIdx=i;} if(v<piorVal){piorVal=v;piorIdx=i;} } });
  grafico.innerHTML = atual.map((v,i) => {
    const h = v!==null ? Math.max(4,Math.round((Math.abs(v)/maxV)*68)) : 4;
    let cls = 'normal';
    if (v===null) cls='vazio'; else if(i===idxHoje) cls='hoje'; else if(i===melhorIdx&&melhorIdx!==piorIdx) cls='melhor'; else if(i===piorIdx) cls='pior';
    // número pequeno em cima da barra (só nos dias com registro)
    const rotulo = v!==null ? `<div class="comp-barra-val">${Math.round(v)}</div>` : '<div class="comp-barra-val">&nbsp;</div>';
    return `<div class="comp-barra-wrap">${rotulo}<div class="comp-barra ${cls}" style="height:${h}px;"></div><div class="comp-barra-dia ${i===idxHoje?'hoje-label':''}">${DIAS[i]}</div></div>`;
  }).join('');
  if (validos.length >= 2) {
    destaques.style.display = 'grid';
    document.getElementById('compMelhorDia').textContent = DIAS[melhorIdx] + ' · ' + fmtBRL(melhorVal);
    document.getElementById('compPiorDia').textContent   = DIAS[piorIdx]   + ' · ' + fmtBRL(piorVal);
  } else { destaques.style.display = 'none'; }
}

// ─── NAVEGAÇÃO (6 abas) ──────────────────────────────────────
function mostrarTela(tela) {
  [telaInicio,telaManutencao,telaCombustivel,telaFinancas,telaDocumentos,telaCade,document.getElementById('telaExtrato'),document.getElementById('telaExtratoFin'),document.getElementById('telaDespesas')].forEach(t => { if (t) t.style.display='none'; });
  [navInicio,navManutencao,navCombustivel,navFinancas,navDocumentos,navCade].forEach(n => n.classList.remove('ativo'));
  tela.style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════
//  FECHAMENTO DO MÊS — os números
// ═══════════════════════════════════════════════════════════════
// ⚠️ Esta função NÃO escreve texto. Ela só apura o que aconteceu, e diz
// honestamente o que NÃO sabe (campos em null). Quem escreve é a carta —
// e a carta só pode falar do que vier preenchido aqui.
// Regra sagrada nº 2: o app nunca inventa número. Um mês com 3 dias
// registrados não vira "seu mês foi ruim".
function fecharMes(ym) {
  const fin  = lerLS('historicoFinancas', []).filter(r => (r.dataISO || '').slice(0, 7) === ym);
  if (!fin.length) return null;

  const horas = lerLS('horasPorDia', {});
  const kmMap = lerLS('kmPorDia', {});
  const abast = lerLS('historicoAbastecimentos', []).filter(r => (r.dataISO || '').slice(0, 7) === ym);

  // ── dinheiro ──
  const receita = fin.reduce((t, r) => t + (r.receita || 0), 0);
  const taxa    = fin.reduce((t, r) => t + (r.taxa    || 0), 0);
  const desp    = fin.reduce((t, r) => t + (r.desp    || 0), 0);
  const lucro   = fin.reduce((t, r) => t + (r.lucro   || 0), 0);
  // ⚠️ EXISTEM DOIS "COMBUSTÍVEL" E A CARTA MISTURAVA OS DOIS.
  //   combBomba = tudo que ele pagou no posto no mês (o dinheiro que saiu)
  //   combNaConta = só o que entrou no lucro dos dias com receita registrada
  // Eles divergem porque abastecimento em dia SEM receita não entra em conta
  // nenhuma (limitação conhecida). A carta dizia "Saíram R$ 413" e três linhas
  // depois "R$ 595 de combustível, R$ 83 de despesas" — 595 + 83 = 678, não 413.
  // O motorista soma e não fecha, e para de confiar na carta inteira.
  const combBomba   = abast.reduce((t, r) => t + (r.valor || 0), 0);
  const combNaConta = fin.reduce((t, r) => t + (r.comb || 0), 0);
  const comb        = combBomba;   // compatibilidade: quem já lia m.comb

  // ── esforço ──
  const dias = fin.length;
  const horasTotal = fin.reduce((t, r) => t + (horas[r.dataISO] || 0), 0);
  // ⚠️ só dias com hora marcada entram no R$/hora — senão a conta divide o
  // lucro do mês inteiro por meia dúzia de horas e inventa um número lindo
  // ⚠️ O denominador era `horasTotal` (TODOS os dias) e o numerador só os dias
  // com >= 0,5h. Um dia em que ele ligou o "Bora rodar" e desistiu em 20 min
  // entrava nas horas e não no lucro — a hora dele saía menor do que foi.
  // Numerador e denominador agora vêm do mesmo conjunto de dias.
  const diasDoRitmo  = fin.filter(r => (horas[r.dataISO] || 0) >= 0.5);
  const diasComHora  = diasDoRitmo.length;
  const lucroComHora = diasDoRitmo.reduce((t, r) => t + (r.lucro || 0), 0);
  const horasDoRitmo = diasDoRitmo.reduce((t, r) => t + (horas[r.dataISO] || 0), 0);
  const porHora = (diasComHora >= 2 && horasDoRitmo > 0) ? (lucroComHora / horasDoRitmo) : null;

  // ── km: só dias de 1 dia (registro que cobre vários não se reparte) ──
  // ⚠️ DOIS PROBLEMAS AQUI, os dois graves:
  //   1. `km` só somava os dias com km confiável, mas o numerador usava o gasto
  //      do MÊS INTEIRO. Quem fecha o turno 22 dias e lança receita em 12 lia
  //      "cada km te custou R$ 1,05" quando o real era R$ 0,55 — quase o dobro.
  //   2. A taxa da plataforma entrava no "custo por km". Taxa é desconto da
  //      corrida, não custo de rodar um km — e o resto do app define custo/km
  //      como combustível + desgaste. O mesmo motorista lia R$ 0,55 na Início
  //      e R$ 1,05 na carta, sem nada explicando a diferença.
  // Agora numerador e denominador vêm dos MESMOS dias, e a definição é a mesma
  // do resto do app.
  const diasComKm = [];
  let km = 0, temKm = false;
  fin.forEach(r => {
    const k = kmMap[r.dataISO];
    if (k && k.km > 0 && (k.dias || 1) === 1) { km += k.km; temKm = true; diasComKm.push(r.dataISO); }
  });
  const combDosDias = abast
    .filter(r => diasComKm.indexOf(r.dataISO) >= 0)
    .reduce((t, r) => t + (r.valor || 0), 0);
  // ⚠️ SEM GUARDA, ISTO ESCREVIA "Foram 9 km. Cada km te custou R$ 75,26."
  // Um dia com 9 km e R$ 677 de abastecimento nos mesmos dias dá 75 — número
  // absurdo, publicado com toda a confiança na frente do motorista.
  // O app JÁ TEM a régua do impossível: acima de R$ 3/km o kmSuspeito descarta
  // o registro. A carta tem que obedecer a mesma régua.
  // E mais: km que cobre 1 de 6 dias não é "o km do mês". Sem cobertura, o
  // número não é do mês — é de um dia solto, e dizer "foram 9 km" é mentir
  // sobre o mês. Regra sagrada nº 2: faltou dado, avisa e cala.
  const cobertura = dias > 0 ? (diasComKm.length / dias) : 0;
  const kmConfiavel = temKm && km > 0 && diasComKm.length >= 2 && cobertura >= 0.5;
  const bruto = (kmConfiavel && combDosDias > 0) ? (combDosDias / km) : null;
  const custoKm = (bruto !== null && bruto <= 3) ? bruto : null;

  // ── o melhor dia (um FATO pontual, não um padrão) ──
  // ⚠️ "qual DIA DA SEMANA rende mais" é padrão — isso é lupa, é premium.
  // "seu melhor dia foi 14/08" é só um fato do espelho. A diferença importa.
  let melhor = null;
  fin.forEach(r => { if (!melhor || (r.lucro || 0) > (melhor.lucro || 0)) melhor = r; });
  if (melhor && (melhor.lucro || 0) <= 0) melhor = null;

  // ── combustível ──
  const litros = abast.reduce((t, r) => t + (r.litros || 0), 0);
  const precoL = litros > 0 ? (comb / litros) : null;
  const postos = new Set(abast.map(r => (r.posto || '').trim().toLowerCase()).filter(Boolean)).size;

  // ── mês anterior, pra comparar ──
  const d = new Date(ym + '-15T12:00:00');
  d.setMonth(d.getMonth() - 1);
  const ymAnt = isoLocal(d).slice(0, 7);
  const finAnt = lerLS('historicoFinancas', []).filter(r => (r.dataISO || '').slice(0, 7) === ymAnt);
  // ⚠️ só compara se o mês anterior tiver corpo. Comparar 22 dias com 2 dias
  // e dizer "você caiu 80%" é mentira com cara de número.
  const anterior = finAnt.length >= 5
    ? { dias: finAnt.length, lucro: finAnt.reduce((t, r) => t + (r.lucro || 0), 0) }
    : null;

  return {
    ym, dias, receita, taxa, comb, desp, lucro,
    horasTotal, diasComHora, porHora,
    km: kmConfiavel ? km : null, custoKm,
    diasComKm: diasComKm.length, combBomba, combNaConta,
    litros, precoL, postos, abastecimentos: abast.length,
    melhor, anterior,
    // um mês com menos de 5 dias não sustenta frase de conclusão
    magro: dias < 5
  };
}
function nomeDoMes(ym) {
  const d = new Date(ym + '-15T12:00:00');
  const mes = d.toLocaleDateString('pt-BR', { month: 'long' });
  // ⚠️ só a PRIMEIRA letra sobe. O CSS capitalize subia a de cada palavra e
  // escrevia "Julho De 2026".
  return mes.charAt(0).toUpperCase() + mes.slice(1) + ' de ' + d.getFullYear();
}

// ═══════════════════════════════════════════════════════════════
//  A CARTA DO ISAAC — o fechamento do mês
// ═══════════════════════════════════════════════════════════════
// Por que é CARTA e não painel:
//
// Painel de números o Drivvo já faz — e faz há anos, com 2 milhões de
// usuários. Competir ali é perder. O que eles não têm é alguém falando.
//
// E a carta resolve sozinha a divisão grátis/pago: NARRAR o que aconteceu
// é espelho (grátis, nunca trancar). APONTAR o que fazer com isso é lupa
// (pago). A mesma informação, e o corte fica natural no fim do texto.
//
// ⚠️ O que NÃO pode entrar aqui, por decisão de produto:
//   · "qual dia da semana rende mais"  → é padrão, é lupa
//   · "qual posto sai mais barato"     → é padrão, é lupa
//   · qualquer conselho que não venha de um número que ele registrou
// "Seu melhor dia foi 14/08" pode: é um fato pontual, não um padrão.
function cartaDoMes(m) {
  if (!m) return '';
  const V = x => `[[v:${x}]]`, R = x => `[[r:${x}]]`, A = x => `[[a:${x}]]`;
  const nome = arrumarNome((getPerfil().nome || '').split(' ')[0]) || 'motorista';
  const p = [];

  // ── abertura: o mês pelo nome, e o número que ele veio buscar ──
  p.push(`${nome}, fechei o seu ${nomeDoMes(m.ym)}.\n`);

  if (m.magro) {
    // ⚠️ Regra sagrada nº 2. Com 3 dias registrados eu não sei como foi o mês
    // dele — sei como foram 3 dias. Dizer "seu mês foi fraco" seria inventar.
    p.push(`Antes de tudo: você registrou ${A(m.dias + (m.dias === 1 ? ' dia' : ' dias'))} neste mês. ` +
           `É pouco pra eu falar do mês inteiro, então vou falar só desses dias — e não tire conclusão daqui.\n`);
  }

  // ⚠️ A CONTA PRECISA FECHAR NA TELA. Os três números eram arredondados
  // separadamente: 1.190 − 413 dava 777, e a carta escrevia 778. O motorista
  // confere na calculadora, acha R$ 1 de diferença e perde a confiança na
  // carta inteira — que é o produto. Mesma lição da v3.43/44 (o comparador de
  // combustível usa o valor JÁ ARREDONDADO que aparece na tela).
  // Agora arredonda receita e lucro UMA vez, e deriva a saída dos dois.
  const sobrou   = m.lucro >= 0;
  const receitaR = Math.round(m.receita);
  const lucroR   = Math.round(m.lucro);
  const saiuR    = receitaR - lucroR;
  p.push(sobrou
    ? `Entraram ${V(fmtBRL0(receitaR))}. Saíram ${R(fmtBRL0(saiuR))}. ` +
      `Sobrou ${V(fmtBRL0(lucroR))} no seu bolso.\n`
    : `Entraram ${A(fmtBRL0(receitaR))}, mas saíram ${R(fmtBRL0(saiuR))}. ` +
      `O mês fechou ${R('no vermelho')}: ${R(fmtBRL0(Math.abs(lucroR)))} a menos do que entrou.\n`);

  // ── pra onde foi o que saiu ──
  // ⚠️ O detalhamento tem que somar EXATAMENTE o que a linha de cima chamou de
  // "saiu". Usava o total da bomba, que inclui dia sem receita registrada.
  const saidas = [];
  if (m.combNaConta > 0) saidas.push(`${fmtBRL0(m.combNaConta)} de combustível`);
  if (m.taxa > 0)        saidas.push(`${fmtBRL0(m.taxa)} de taxa das plataformas`);
  if (m.desp > 0)        saidas.push(`${fmtBRL0(m.desp)} de despesas`);
  if (saidas.length) {
    // ⚠️ O PERCENTUAL TEM QUE FALAR DO DINHEIRO DE VERDADE. Se parte do
    // combustível ficou fora da conta, dizer "a bomba levou 28%" SUBESTIMA o
    // custo dele — e subestimar custo é a direção perigosa neste app: faz o
    // motorista achar que sobra mais do que sobra. Quando há diferença, o
    // percentual sai do total da bomba e vai junto do aviso, pra não brigar
    // com o detalhamento logo acima.
    const foraDaConta = Math.round(m.combBomba - m.combNaConta);
    const baseFatia = foraDaConta >= 20 ? m.combNaConta : m.comb;
    const fatia = (m.receita > 0) ? Math.round(baseFatia / m.receita * 100) : 0;
    let bomba = '\n';
    // ⚠️ "a bomba levou 104% do que entrou" é matematicamente verdade e soa
    // como erro de conta — o motorista para de confiar no número seguinte.
    // Acima de 100% a frase muda pra dizer a MESMA coisa em português.
    // com diferença, o percentual desta linha calaria o custo real: some daqui
    // e reaparece no aviso, medido pelo que ele pagou de verdade.
    if (baseFatia > 0 && m.receita > 0 && foraDaConta < 20) {
      if (fatia >= 100)     bomba = ` Só a bomba custou ${R('mais do que entrou o mês inteiro')}.\n`;
      else if (fatia >= 10) bomba = ` Só a bomba levou ${A(fatia + '%')} de tudo que entrou.\n`;
    }
    p.push(`O que saiu foi ${saidas.join(', ')}.` + bomba);
    // ⚠️ A diferença entre a bomba e a conta NÃO pode ficar escondida: é
    // dinheiro real que o motorista gastou e que não apareceu em lugar nenhum.
    // Em vez de sumir com ela, o Isaac nomeia e diz o que fazer.
    if (foraDaConta >= 20) {
      const pctReal = (m.receita > 0) ? Math.round(m.combBomba / m.receita * 100) : 0;
      const quanto = (pctReal >= 100)
        ? `${R('mais do que entrou o mês inteiro')}`
        : `${A(pctReal + '%')} de tudo que entrou`;
      p.push(`Atenção: na bomba mesmo você pagou ${A(fmtBRL0(m.combBomba))} — ${quanto}. ` +
             `${A(fmtBRL0(foraDaConta))} caíram em dias sem receita registrada, então esse ` +
             `dinheiro saiu do seu bolso e ${R('não entrou na conta acima')}. Registre a receita ` +
             `do dia em que você abastece e eu fecho certo.\n`);
    }
  }

  // ── esforço: o número que quase ninguém sabe ──
  if (m.porHora !== null) {
    const h = Math.round(m.horasTotal);
    const inicio = `Você rodou ${m.dias} ${m.dias === 1 ? 'dia' : 'dias'} e ${h} ${h === 1 ? 'hora' : 'horas'}. `;
    // ⚠️ Com hora negativa, "esse é o número que o motorista do lado não sabe"
    // vira deboche — ele acabou de descobrir que trabalhou de graça.
    p.push(m.porHora >= 0
      ? inicio + `Sua hora valeu ${V(fmtBRL(m.porHora))} — esse é o número que o motorista do lado não sabe do dele.\n`
      : inicio + `Cada hora ao volante te custou ${R(fmtBRL(Math.abs(m.porHora)))} do seu bolso. ` +
                 `Não é falta de esforço: as ${h} horas estão aí. É a conta que não fecha.\n`);
  } else {
    p.push(`Você rodou ${m.dias} ${m.dias === 1 ? 'dia' : 'dias'}. ` +
           `Não sei quanto valeu sua hora porque faltou marcar o "Bora rodar" — sem as horas, essa conta não existe.\n`);
  }

  // ── a comparação que ninguém faz: km em algo que ele enxerga ──
  if (m.km === null && m.diasComKm > 0) {
    // tem km, mas de poucos dias: dizer "foram 9 km" seria falar do mês com o
    // dado de um dia. Diz o que tem e o que falta.
    p.push(`Não falo do km do mês: só ${A(m.diasComKm + (m.diasComKm === 1 ? ' dia' : ' dias'))} ` +
           `${m.diasComKm === 1 ? 'tem' : 'têm'} o km fechado, de ${m.dias}. ` +
           `Feche o dia pelo "Bora rodar" que no mês que vem essa conta existe.\n`);
  } else if (m.km !== null && m.km > 0) {
    let linha = `Foram ${V(fmtKm(m.km) + ' km')}`;
    const ref = referenciaDeDistancia(m.km);
    if (ref) linha += ` — ${ref}`;
    // ⚠️ "cada km te custou" batia de frente com o número da tela Início, que
    // inclui a reserva de manutenção. Dois números parecidos com nomes iguais
    // fazem o motorista achar que um dos dois está errado. Aqui é combustível.
    if (m.custoKm !== null) linha += `. Só de combustível, cada km te custou ${A(fmtBRL(m.custoKm))}`;
    p.push(linha + `.\n`);
  }

  // ── o melhor dia: fato pontual, não padrão (padrão é lupa) ──
  if (m.melhor && m.dias >= 5) {   // com menos de 5 dias não existe "melhor": existe o menos pior
    const d = new Date(m.melhor.dataISO + 'T12:00:00');
    p.push(`Seu melhor dia foi ${V(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))}: ` +
           `${V(fmtBRL0(m.melhor.lucro))} líquidos.\n`);
  }

  // ── mês anterior (só se o anterior tiver corpo) ──
  if (m.anterior) {
    const dif = m.lucro - m.anterior.lucro;
    const pct = m.anterior.lucro !== 0 ? Math.round(Math.abs(dif / m.anterior.lucro) * 100) : 0;
    if (Math.abs(dif) < 20) {
      p.push(`Comparado ao mês passado, ficou praticamente igual.\n`);
    } else if (dif > 0) {
      p.push(`Comparado ao mês passado, você levou ${V(fmtBRL0(dif) + ' a mais')} pra casa` +
             (pct ? ` (${pct}%)` : '') + `.\n`);
    } else {
      p.push(`Comparado ao mês passado, sobrou ${R(fmtBRL0(Math.abs(dif)) + ' a menos')}` +
             (pct ? ` (${pct}%)` : '') +
             `. Você rodou ${m.dias} dias contra ${m.anterior.dias}.\n`);
    }
  }

  // ── combustível, sem virar análise ──
  if (m.abastecimentos > 0 && m.precoL !== null) {
    p.push(`${m.abastecimentos === 1 ? 'Foi 1 abastecimento' : 'Foram ' + m.abastecimentos + ' abastecimentos'}` +
           (m.postos > 1 ? ` em ${m.postos} postos` : '') +
           `, a ${fmtBRL(m.precoL)} o litro em média.\n`);
  }

  return p.join('\n');
}

// A comparação que ninguém faz. Não é análise — é o mesmo km numa unidade
// que ele enxerga. Serve pro motorista sentir o tamanho do que rodou, e é a
// frase que ele manda no grupo.
// ⚠️ Distâncias rodoviárias aproximadas, e o texto diz "mais ou menos".
const _REFERENCIAS = [
  { km:  430, txt: 'Belo Horizonte a São Paulo' },
  { km:  600, txt: 'São Paulo a Curitiba' },
  { km:  900, txt: 'Belo Horizonte ao Rio, ida e volta' },
  { km: 1200, txt: 'São Paulo a Salvador' },
  { km: 2000, txt: 'São Paulo a Fortaleza' },
  { km: 3000, txt: 'Porto Alegre a Belém' },
  { km: 4300, txt: 'a BR-116 inteira, de ponta a ponta' }
];
function referenciaDeDistancia(km) {
  if (!km || km < 300) return null;   // abaixo disso a comparação não impressiona nem ajuda
  for (let i = _REFERENCIAS.length - 1; i >= 0; i--) {
    const r = _REFERENCIAS[i];
    if (km >= r.km * 0.85 && km <= r.km * 1.3) return `mais ou menos ${r.txt}`;
    if (km >= r.km * 1.8) {
      const vezes = Math.floor(km / r.km);
      if (vezes >= 2 && vezes <= 4) return `${vezes}x ${r.txt}`;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  RELATÓRIO DO MÊS — a tela
// ═══════════════════════════════════════════════════════════════
let _mesAberto = null;   // 'AAAA-MM'

// Quais meses têm dado? (do mais novo pro mais velho)
function mesesComRegistro() {
  const ms = new Set();
  lerLS('historicoFinancas', []).forEach(r => { if (r.dataISO) ms.add(r.dataISO.slice(0, 7)); });
  return [...ms].sort().reverse();
}
// O último mês JÁ FECHADO (não o corrente — mês em andamento não se fecha).
function ultimoMesFechado() {
  const atual = hojeISO().slice(0, 7);
  return mesesComRegistro().find(m => m < atual) || null;
}

function abrirRelatorioMes(ym) {
  const meses = mesesComRegistro();
  if (!meses.length) { toast('Ainda não tenho mês nenhum pra fechar'); return; }
  // abre no último mês fechado; se ele ainda não existe, no mês corrente
  _mesAberto = ym || ultimoMesFechado() || meses[0];
  // ⚠️ marca como visto: o selo "novo" some depois que ele abriu uma vez
  salvarLS('mesRelatorioVisto', _mesAberto);
  pintarSeloMes();
  renderRelatorioMes();
  document.getElementById('modalMes').style.display = 'flex';
}
function fecharRelatorioMes() { document.getElementById('modalMes').style.display = 'none'; }


// ═══════════════════════════════════════════════════════════════
//  A LUPA — as respostas que o espelho não dá
// ═══════════════════════════════════════════════════════════════
// O espelho (grátis) mostra O QUE aconteceu. A lupa responde POR QUÊ e O QUE
// FAZER. É a divisão que sustenta o premium — se a lupa vazar pro grátis, o
// pago nasce sem nada pra vender.
//
// ⚠️ AS TRÊS REGRAS DA LUPA (nenhuma é negociável):
//   1. Toda conclusão sai de um número que ELE registrou. Nunca média de
//      mercado, nunca conselho genérico. "Tente rodar em horário de pico" é
//      exatamente o que a categoria diz que enche o saco de influenciador.
//   2. Toda conclusão termina em DINHEIRO. "Sexta rende 23% mais" não move
//      ninguém; "sexta te paga R$ 71 a mais que terça" move.
//   3. Sem amostra, não fala. Dizer "sua sexta é melhor" com uma sexta só é
//      inventar padrão — e padrão inventado é pior que silêncio, porque ele
//      vai mudar a rotina de trabalho com base nisso.
const LUPA_MIN_AMOSTRA = 2;    // por dia da semana
const DIAS_SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
// ⚠️ Gênero: domingo e sábado são masculinos; de segunda a sexta são femininos
// (segunda-FEIRA). Sem isto sai "Sua sábado vale mais que sua segunda" — e
// português torto na frente do motorista custa credibilidade no número.
const DIAS_MASC = [true, false, false, false, false, false, true];
function possDia(i, maiusc) {
  const p = DIAS_MASC[i] ? 'seu' : 'sua';
  return maiusc ? p.charAt(0).toUpperCase() + p.slice(1) : p;
}
function plurDia(i) { return DIAS_SEM[i] + (DIAS_MASC[i] ? 's' : 's'); }

// ═══ O PORTÃO DO PREMIUM ═══════════════════════════════════════
// DECISÃO DO DONO DO PRODUTO (ago/2026), e ela é a linha mais limpa que já
// tivemos: **o DIA é grátis, o MÊS é pago.**
//   • Grátis: fechamento do dia, velocímetro, R$/hora, custo/km, reserva,
//     manutenção, documentos — tudo que responde "como foi HOJE".
//   • Pago: o fechamento do MÊS inteiro (a carta do Isaac) e a lupa.
// É fácil de explicar pro motorista em uma frase, e é fácil de defender: o
// hábito diário continua livre (regra sagrada nº 6 — o espelho nunca tranca),
// e o que se cobra é a leitura do conjunto.
//
// ⚠️ Uma função só controla tudo. Quando o Pix existir, ela consulta a
// assinatura — nada mais no app precisa mudar.
function premiumAtivo() { return lerLS('premiumAtivo', false) === true; }
// compatibilidade com o nome antigo
function lupaLiberada() { return premiumAtivo(); }

// 1. QUAL DIA DA SEMANA TE PAGA MELHOR
// Usa LUCRO, não receita: o dia de maior faturamento pode ser o de menor sobra.
//
// ⚠️ E USA R$/HORA, NÃO R$/DIA. Este foi um erro de raciocínio da v3.88 pego no
// primeiro teste com dado de verdade: a lupa dizia "seu sábado vale R$ 273 a
// mais que seu domingo" comparando o LUCRO DO DIA. Só que no domingo ele rodou
// 3 horas e no sábado 10. Não é o sábado que paga melhor — é que ele trabalha
// mais no sábado. A conclusão mandaria o motorista mudar a rotina com base numa
// comparação que não compara nada.
// Hora contra hora é a única medida justa: mede o dia, não o esforço.
// Sem hora marcada, cai pro R$/dia — mas AVISA que a hora não entrou na conta.
function lupaDiaDaSemana(fin) {
  const horas = lerLS('horasPorDia', {});
  const porDia = [[], [], [], [], [], [], []];
  fin.forEach(function (r) {
    if (!r.dataISO) return;
    const d = new Date(r.dataISO + 'T12:00:00');
    if (isNaN(d)) return;
    porDia[d.getDay()].push({ lucro: r.lucro || 0, h: horas[r.dataISO] || 0, iso: r.dataISO });
  });

  // ── caminho bom: por hora ──
  const porHora = porDia.map(function (arr, i) {
    const comH = arr.filter(function (x) { return x.h >= 1; });
    if (comH.length < LUPA_MIN_AMOSTRA) return null;
    const somaL = comH.reduce(function (t, x) { return t + x.lucro; }, 0);
    const somaH = comH.reduce(function (t, x) { return t + x.h; }, 0);
    if (!(somaH > 0)) return null;
    return { dia: i, n: comH.length, ph: somaL / somaH, horas: somaH };
  }).filter(Boolean);

  if (porHora.length >= 3) {
    porHora.sort(function (a, b) { return b.ph - a.ph; });
    const alto = porHora[0], baixo = porHora[porHora.length - 1];
    const difH = alto.ph - baixo.ph;
    if (difH < 2) return null;                       // R$ 2/hora não muda rotina
    // ⚠️ Isto é uma HIPÓTESE e vai escrita como hipótese: "se rendessem como".
    // O app pode projetar — não pode apresentar projeção como fato consumado.
    const seFosse = difH * baixo.horas;
    if (seFosse < 40) return null;
    return { porHora: true, alto: alto, baixo: baixo, dif: difH, seFosse: seFosse };
  }

  // ── caminho de reserva: por dia, com a ressalva na cara ──
  const medias = porDia.map(function (arr, i) {
    if (arr.length < LUPA_MIN_AMOSTRA) return null;
    return { dia: i, n: arr.length,
             media: arr.reduce(function (t, x) { return t + x.lucro; }, 0) / arr.length };
  }).filter(Boolean);
  if (medias.length < 3) return null;    // com 2 dias da semana não existe "padrão"
  medias.sort(function (a, b) { return b.media - a.media; });
  const alto = medias[0], baixo = medias[medias.length - 1];
  const dif = alto.media - baixo.media;
  if (dif < 25) return null;             // diferença pequena demais pra virar decisão
  return { porHora: false, alto: alto, baixo: baixo, dif: dif };
}

// 2. QUAL POSTO TE CUSTOU MAIS CARO
// Compara o preço médio do litro por posto e traduz a diferença no volume que
// ele realmente abasteceu — não numa hipótese.
function lupaPostos(abast) {
  const porPosto = {};
  abast.forEach(function (a) {
    const nome = (a.posto || '').trim();
    if (!nome || !a.litros || !a.valor) return;
    const k = nome.toLowerCase();
    if (!porPosto[k]) porPosto[k] = { nome: nome, litros: 0, valor: 0, n: 0 };
    porPosto[k].litros += a.litros; porPosto[k].valor += a.valor; porPosto[k].n++;
  });
  const lista = Object.keys(porPosto).map(function (k) {
    const p = porPosto[k];
    return { nome: p.nome, n: p.n, litros: p.litros, valor: p.valor, ppl: p.valor / p.litros };
  }).filter(function (p) { return p.n >= LUPA_MIN_AMOSTRA && p.litros > 0; });
  if (lista.length < 2) return null;
  lista.sort(function (a, b) { return a.ppl - b.ppl; });
  const barato = lista[0], caro = lista[lista.length - 1];
  const difL = caro.ppl - barato.ppl;
  if (difL < 0.08) return null;          // centavo de diferença não é decisão
  // quanto custou de verdade: os litros que ele pôs no posto caro, na diferença
  const custou = difL * caro.litros;
  if (custou < 10) return null;
  return { barato: barato, caro: caro, difL: difL, custou: custou };
}

// 3. O DIA QUE PARECEU BOM E NÃO FOI
// A tese do produto em uma frase: faturar não é ganhar. Só aparece quando o
// dia de maior RECEITA não é o de maior LUCRO — aí o número dele mesmo prova.
function lupaFaturarNaoEGanhar(fin) {
  if (fin.length < 5) return null;
  let maiorRec = null, maiorLuc = null;
  fin.forEach(function (r) {
    if (!maiorRec || (r.receita || 0) > (maiorRec.receita || 0)) maiorRec = r;
    if (!maiorLuc || (r.lucro   || 0) > (maiorLuc.lucro   || 0)) maiorLuc = r;
  });
  if (!maiorRec || !maiorLuc) return null;
  if (maiorRec.dataISO === maiorLuc.dataISO) return null;   // coincidiram: não há lição
  if ((maiorLuc.lucro || 0) <= (maiorRec.lucro || 0)) return null;
  const dif = (maiorLuc.lucro || 0) - (maiorRec.lucro || 0);
  if (dif < 15) return null;
  return { rec: maiorRec, luc: maiorLuc, dif: dif,
           difRec: (maiorRec.receita || 0) - (maiorLuc.receita || 0) };
}

function _dm(iso) {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Monta os blocos. Devolve [] quando não há nada digno — e aí a lupa não abre.
function acharNaLupa(ym) {
  const fin = lerLS('historicoFinancas', []).filter(function (r) {
    return (r.dataISO || '').slice(0, 7) === ym;
  });
  const abast = lerLS('historicoAbastecimentos', []).filter(function (r) {
    return (r.dataISO || '').slice(0, 7) === ym;
  });
  if (!fin.length) return [];
  const achados = [];

  const ds = lupaDiaDaSemana(fin);
  if (ds && ds.porHora) {
    achados.push({
      ic: 'calendario',
      tit: 'Sua hora ' + (DIAS_MASC[ds.alto.dia] ? 'no' : 'na') + ' ' + DIAS_SEM[ds.alto.dia] +
           ' vale ' + fmtBRL(ds.dif) + ' a mais',
      txt: 'Hora contra hora — que é a única comparação justa — ' +
           (DIAS_MASC[ds.alto.dia] ? 'no' : 'na') + ' ' + DIAS_SEM[ds.alto.dia] +
           ' você fez <b>' + fmtBRL(ds.alto.ph) + ' por hora</b> e ' +
           (DIAS_MASC[ds.baixo.dia] ? 'no' : 'na') + ' ' + DIAS_SEM[ds.baixo.dia] +
           ', <b>' + fmtBRL(ds.baixo.ph) + '</b>. Você rodou <b>' +
           ds.baixo.horas.toFixed(0) + ' horas</b> ' +
           (DIAS_MASC[ds.baixo.dia] ? 'aos ' : 'às ') + plurDia(ds.baixo.dia) +
           ' neste mês: no ritmo ' + (DIAS_MASC[ds.alto.dia] ? 'do' : 'da') + ' ' +
           DIAS_SEM[ds.alto.dia] + ', elas teriam rendido <b>' + fmtBRL0(ds.seFosse) + ' a mais</b>.',
      base: ds.alto.n + ' ' + plurDia(ds.alto.dia) + ' e ' + ds.baixo.n + ' ' +
            plurDia(ds.baixo.dia) + ' com hora marcada',
      teaser: 'Tem um dia da semana em que <b>sua hora vale ' + fmtBRL(ds.dif) + ' a mais</b> ' +
              'que em outro. Só nesse mês, isso deu ' + fmtBRL0(ds.seFosse) + '.'
    });
  } else if (ds) {
    achados.push({
      ic: 'calendario',
      tit: possDia(ds.alto.dia, true) + ' ' + DIAS_SEM[ds.alto.dia] + ' deixou mais que ' +
           possDia(ds.baixo.dia, false) + ' ' + DIAS_SEM[ds.baixo.dia],
      txt: 'Na média deste mês, ' + DIAS_SEM[ds.alto.dia] + ' te deixou <b>' + fmtBRL0(ds.alto.media) +
           '</b> no bolso e ' + DIAS_SEM[ds.baixo.dia] + ', <b>' + fmtBRL0(ds.baixo.media) +
           '</b> — <b>' + fmtBRL0(ds.dif) + ' de diferença</b>. ' +
           '⚠️ Mas eu não sei quantas horas você fez em cada um: pode ser que ' +
           DIAS_SEM[ds.alto.dia] + ' não pague melhor, e sim que você rode mais nele. ' +
           'Marque o "Bora rodar" que no mês que vem eu comparo hora contra hora.',
      base: ds.alto.n + ' ' + plurDia(ds.alto.dia) + ' e ' + ds.baixo.n + ' ' +
            plurDia(ds.baixo.dia) + ' registrad' + (DIAS_MASC[ds.baixo.dia] ? 'os' : 'as') +
            ', sem hora marcada',
      teaser: 'Um dia da semana te deixou <b>' + fmtBRL0(ds.dif) + ' a mais</b> que outro, na média.'
    });
  }

  const po = lupaPostos(abast);
  if (po) {
    achados.push({
      ic: 'bomba',
      tit: 'O ' + po.caro.nome + ' te custou ' + fmtBRL0(po.custou) + ' a mais',
      txt: 'No ' + po.barato.nome + ' você pagou <b>' + fmtBRL(po.barato.ppl) + '/L</b>. No ' +
           po.caro.nome + ', <b>' + fmtBRL(po.caro.ppl) + '/L</b>. Você pôs ' +
           '<b>' + Math.round(po.caro.litros) + ' litros</b> no mais caro — a diferença ' +
           'te custou <b>' + fmtBRL0(po.custou) + '</b> só neste mês.',
      base: po.caro.n + ' abastecimentos no ' + po.caro.nome + ', ' + po.barato.n + ' no ' + po.barato.nome,
      teaser: 'Um dos postos onde você abasteceu te custou <b>' + fmtBRL0(po.custou) + ' a mais</b> ' +
              'que outro neste mês.'
    });
  }

  const fg = lupaFaturarNaoEGanhar(fin);
  if (fg) {
    achados.push({
      ic: 'alerta',
      tit: 'Seu dia de maior faturamento não foi seu melhor dia',
      txt: 'No dia <b>' + _dm(fg.rec.dataISO) + '</b> você faturou <b>' + fmtBRL0(fg.rec.receita) +
           '</b>, o maior do mês — e sobrou <b>' + fmtBRL0(fg.rec.lucro) + '</b>. ' +
           'No dia <b>' + _dm(fg.luc.dataISO) + '</b> você faturou ' + fmtBRL0(fg.luc.receita) +
           ' e sobrou <b>' + fmtBRL0(fg.luc.lucro) + '</b>. ' +
           '<b>' + fmtBRL0(fg.dif) + ' a mais</b> faturando ' + fmtBRL0(Math.abs(fg.difRec)) + ' a menos.',
      base: 'comparação entre os dois dias que você registrou',
      teaser: 'Seu dia de maior faturamento <b>não foi</b> seu melhor dia. Teve dia que te ' +
              'deixou <b>' + fmtBRL0(fg.dif) + ' a mais</b> faturando menos.'
    });
  }
  return achados;
}

// ⚠️ LUPA VAZIA NÃO PODE SER SILÊNCIO.
// Com 6 dias registrados a lupa não achou nada — o que está CERTO, é a regra
// nº 3 funcionando. Mas ela simplesmente não apareceu, e sumir sem explicação
// é a mesma falha que o app já corrigiu duas vezes (o simulador que mandava
// "registre suas receitas" pra quem já registrou, e o piso que dizia "alguns
// dias" sem dizer quantos). Ausência sem motivo o motorista lê como app
// quebrado — ou pior, como promessa que não cumpriu.
// Agora ela diz O QUE FALTA, com a contagem do que ele já tem.
function porQueLupaVazia(ym) {
  const fin = lerLS('historicoFinancas', []).filter(function (r) {
    return (r.dataISO || '').slice(0, 7) === ym;
  });
  const abast = lerLS('historicoAbastecimentos', []).filter(function (r) {
    return (r.dataISO || '').slice(0, 7) === ym;
  });
  const faltas = [];

  // 1. dias da semana
  const contDia = [0, 0, 0, 0, 0, 0, 0];
  fin.forEach(function (r) {
    const d = new Date((r.dataISO || '') + 'T12:00:00');
    if (!isNaN(d)) contDia[d.getDay()]++;
  });
  const repetidos = contDia.filter(function (n) { return n >= LUPA_MIN_AMOSTRA; }).length;
  if (repetidos < 3) {
    faltas.push('<b>Qual dia da semana te paga melhor</b> — eu comparo a média de cada dia, ' +
      'e pra isso preciso de <b>pelo menos 2 registros no mesmo dia da semana, em 3 dias ' +
      'diferentes</b>. Hoje você tem ' + (repetidos === 0 ? 'nenhum dia repetido' :
      repetidos + (repetidos === 1 ? ' dia repetido' : ' dias repetidos')) + '. ' +
      'Um mês inteiro rodando resolve sozinho.');
  } else {
    // ⚠️ Tenho amostra e olhei: aqui a resposta é "não tem diferença", que é
    // RESPOSTA e não falta. Calar nesse caso faria o motorista achar que o app
    // não analisou — quando analisou e deu empate.
    faltas.push('<b>Qual dia da semana te paga melhor</b> — eu olhei, e neste mês seus dias ' +
      'renderam parecido. <b>Não vou inventar um dia campeão</b> onde a diferença não paga ' +
      'nem um almoço.');
  }

  // 2. postos
  const porPosto = {};
  abast.forEach(function (a) {
    const k = (a.posto || '').trim().toLowerCase();
    if (!k || !a.litros || !a.valor) return;
    porPosto[k] = (porPosto[k] || 0) + 1;
  });
  const comDois = Object.keys(porPosto).filter(function (k) { return porPosto[k] >= LUPA_MIN_AMOSTRA; }).length;
  const semNome = abast.filter(function (a) { return !(a.posto || '').trim(); }).length;
  const semLitros = abast.filter(function (a) { return !a.litros; }).length;
  if (comDois < 2) {
    let t = '<b>Qual posto te custou mais caro</b> — preciso de <b>2 abastecimentos no mesmo ' +
            'posto, em 2 postos diferentes</b>, pra a média de um posto não ser um dia solto. ' +
            'Hoje você tem ' + (comDois === 0 ? 'nenhum posto repetido' : comDois + ' posto repetido') + '.';
    if (semNome > 0)   t += ' E ' + semNome + ' ' + (semNome === 1 ? 'abastecimento ficou' : 'abastecimentos ficaram') +
                            ' <b>sem o nome do posto</b> — esses eu não consigo comparar.';
    if (semLitros > 0) t += ' Outros ' + semLitros + ' ficaram <b>sem os litros</b>, e sem litro não há preço por litro.';
    faltas.push(t);
  } else {
    let t = '<b>Qual posto te custou mais caro</b> — comparei os seus, e a diferença de preço ' +
            'foi pequena demais pra virar dinheiro. <b>Você não está pagando caro por escolher ' +
            'mal o posto</b> neste mês.';
    if (semNome > 0)   t += ' (' + semNome + ' ' + (semNome === 1 ? 'abastecimento ficou' : 'abastecimentos ficaram') +
                            ' sem o nome do posto e ' + (semNome === 1 ? 'ficou' : 'ficaram') + ' de fora.)';
    faltas.push(t);
  }

  // 3. faturar ≠ ganhar
  if (fin.length < 5) {
    faltas.push('<b>Se o seu dia de maior faturamento foi mesmo o melhor</b> — pra essa eu ' +
      'preciso de <b>5 dias registrados</b> no mês. Você tem ' + fin.length + '.');
  } else {
    faltas.push('<b>Se o seu dia de maior faturamento foi mesmo o melhor</b> — neste mês foi: ' +
      'o dia que mais entrou foi também o que mais sobrou. <b>Você não trocou dinheiro.</b>');
  }
  return faltas;
}

function blocoDaLupaVazia(faltas) {
  return '<div class="lupa-vazia">' +
    '<p>Olhei seus números e não achei nada que valha mudar sua rotina. Eu <b>não invento ' +
    'padrão</b> pra parecer inteligente: com pouco registro, "sua sexta é melhor" seria chute ' +
    '— e você mudaria seu jeito de trabalhar por causa de um chute meu.</p>' +
    '<p class="lupa-vazia-tit">Uma por uma:</p>' +
    '<ul>' + faltas.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>' +
    '</div>';
}

// ⚠️ O GATILHO. Uma tela trancada que só diz "assine" é ignorada — e mentir
// sobre o que tem dentro queima a confiança na primeira vez que ele paga.
// A saída honesta é o vão de curiosidade: mostrar o TAMANHO da resposta com o
// número REAL dele, e guardar QUAL é a resposta.
// "Um dos seus postos te custou R$ 35 a mais. Qual?" — o R$ 35 é verdade
// calculada do histórico dele; o que está atrás do cadeado é o nome do posto.
// Nada aqui é inventado pra vender.
function blocoTrancadoMes(m, achados) {
  const linhas = achados.filter(function (a) { return a.teaser; })
                        .map(function (a) { return '<li>' + a.teaser + ' <b class="lupa-qual">Qual?</b></li>'; });
  let h = '<div class="prem-caixa">' +
    '<div class="prem-selo">' + ico('cadeado') + ' Copiloto Premium</div>' +
    '<div class="prem-tit">Seu ' + nomeDoMes(m.ym) + ' está fechado.<br>Falta você ver.</div>';

  if (linhas.length) {
    h += '<div class="prem-sub">Cruzei os ' + m.dias + ' dias que você registrou e achei ' +
         (linhas.length === 1 ? 'uma coisa' : linhas.length + ' coisas') +
         ' que o fechamento do dia não mostra:</div>' +
         '<ul class="prem-lista">' + linhas.join('') + '</ul>';
  } else {
    h += '<div class="prem-sub">Dentro tem o fechamento completo: quanto entrou, quanto saiu, ' +
         'quanto sobrou, quanto valeu sua hora e quanto te custou cada km no mês.</div>';
  }
  h += '<div class="prem-inclui">' + ico('check') + ' A carta do mês inteira · ' +
       ico('check') + ' A lupa · ' + ico('check') + ' Todos os meses que você já rodou</div>' +
       '<button class="prem-btn" onclick="abrirPremium()">Quero destravar</button>' +
       '<div class="prem-pe">O fechamento de <b>todo dia</b> continua de graça, pra sempre.</div>' +
    '</div>';
  return h;
}

// ⚠️ Sem Pix não existe assinatura — e vender o que não dá pra entregar é a
// forma mais rápida de perder um motorista. Enquanto o pagamento não existe,
// esta tela diz a verdade e pega o contato.
function abrirPremium() {
  pedirConfirmacao(
    ico('cadeado') + ' Copiloto Premium',
    'Ainda não dá pra assinar — estou terminando o pagamento por Pix. '
    + 'Se quiser ser avisado quando abrir, me chama no suporte que eu te aviso primeiro. '
    + 'Vai custar menos que um litro de gasolina por mês.',
    function () { fecharRelatorioMes(); if (typeof abrirSuporte === 'function') abrirSuporte(); });
}

function blocoDaLupa(achados) {
  return achados.map(function (a) {
    return '<div class="lupa-item">' +
      '<div class="lupa-item-tit">' + ico(a.ic) + ' ' + a.tit + '</div>' +
      '<div class="lupa-item-txt">' + a.txt + '</div>' +
      '<div class="lupa-item-base">' + ico('check') + ' ' + esc(a.base) + '</div>' +
    '</div>';
  }).join('');
}

function renderRelatorioMes() {
  const m = fecharMes(_mesAberto);
  document.getElementById('mesTitulo').textContent = nomeDoMes(_mesAberto);

  const carta = document.getElementById('mesCarta');
  const lupa  = document.getElementById('mesLupa');
  const share = document.getElementById('mesShareBtn');

  if (!m) {
    carta.innerHTML = '<div class="mes-vazio">Não tenho nenhum dia registrado neste mês.</div>';
    lupa.style.display = 'none';
    share.style.display = 'none';
  } else if (!premiumAtivo()) {
    // ⚠️ O MÊS INTEIRO é premium — carta E lupa. Não é só a análise: é a
    // leitura do conjunto. O dia continua livre na tela do Isaac.
    carta.innerHTML = blocoTrancadoMes(m, m.magro ? [] : acharNaLupa(_mesAberto));
    share.style.display = 'none';      // não se compartilha o que não se viu
    lupa.style.display = 'none';
  } else {
    carta.innerHTML = cadeParaHTML(cartaDoMes(m));
    share.style.display = '';
    // ── A LUPA ──
    // ⚠️ Só aparece quando existe MESMO algo a analisar. Prometer análise num
    // mês de 3 dias é vender o que não tem — e o motorista descobre na hora.
    const achados = (!m.magro) ? acharNaLupa(_mesAberto) : [];
    const tit = document.querySelector('#mesLupa .mes-lupa-tit');
    if (achados.length) {
      lupa.style.display = 'block';
      lupa.classList.remove('vazia');
      if (tit) tit.innerHTML = ico('lampada') + ' ' +
        (achados.length === 1 ? 'Tem uma coisa nesses números que eu vi e você não'
                              : 'Tem ' + achados.length + ' coisas nesses números que eu vi e você não');
      document.getElementById('mesLupaTxt').innerHTML = lupaLiberada()
        ? blocoDaLupa(achados)
        : '<div class="lupa-trancada">' + ico('cadeado') + ' ' + achados.length +
          ' análises esperando por você neste mês.</div>';
    } else {
      // ⚠️ Mês magro (menos de 5 dias) já é explicado na abertura da carta —
      // repetir aqui seria o app dizendo duas vezes a mesma coisa.
      const faltas = m.magro ? [] : porQueLupaVazia(_mesAberto);
      lupa.style.display = faltas.length ? 'block' : 'none';
      lupa.classList.add('vazia');
      if (faltas.length) {
        if (tit) tit.innerHTML = ico('lampada') + ' Ainda não dá pra eu analisar este mês';
        document.getElementById('mesLupaTxt').innerHTML = blocoDaLupaVazia(faltas);
      }
    }
  }

  // navegação: só habilita pra onde existe mês
  const meses = mesesComRegistro();
  const i = meses.indexOf(_mesAberto);
  document.getElementById('mesPrev').disabled = (i < 0 || i >= meses.length - 1);
  document.getElementById('mesNext').disabled = (i <= 0);
}

// O selo "novo" na aba do Isaac. Só acende quando fechou um mês que ele
// ainda não viu — e some no primeiro toque.
function pintarSeloMes() {
  const btn  = document.getElementById('cadeMesBtn');
  const selo = document.getElementById('cadeMesSelo');
  if (!btn) return;
  const temMes = mesesComRegistro().length > 0;
  btn.style.display = temMes ? '' : 'none';
  if (!selo) return;
  const fechado = ultimoMesFechado();
  const visto   = lerLS('mesRelatorioVisto', null);
  selo.style.display = (fechado && visto !== fechado) ? '' : 'none';
  // o cadeado no próprio botão: ele vê que existe algo ali antes de tocar
  const lab = document.getElementById('cadeMesLabel');
  if (lab) lab.innerHTML = premiumAtivo()
    ? 'Ver o fechamento do mês'
    : 'Ver o fechamento do mês ' + ico('cadeado');
}

document.getElementById('mesPrev').addEventListener('click', function () {
  const meses = mesesComRegistro();
  const i = meses.indexOf(_mesAberto);
  if (i >= 0 && i < meses.length - 1) { _mesAberto = meses[i + 1]; renderRelatorioMes(); }
});
document.getElementById('mesNext').addEventListener('click', function () {
  const meses = mesesComRegistro();
  const i = meses.indexOf(_mesAberto);
  if (i > 0) { _mesAberto = meses[i - 1]; renderRelatorioMes(); }
});

// ── compartilhar o mês: card em imagem, mesmo estilo do diário ──
let _legendaMes = '';
async function desenharCardMes(mostrarValor) {
  const m = fecharMes(_mesAberto);
  const canvas = document.getElementById('shareCanvasMes');
  if (!m || !canvas) return;
  const W = 1080, H = 1080, cx = 110;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0B0F14'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1C242E'; ctx.lineWidth = 2; ctx.strokeRect(44, 44, W - 88, H - 88);

  // marca (o mesmo velocímetro do card do dia)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#00E08A'; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(cx + 24, 168, 26, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  ctx.strokeStyle = '#F2F6FA'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(cx + 24, 168); ctx.lineTo(cx + 42, 150); ctx.stroke();
  ctx.fillStyle = '#93A1B0'; ctx.font = '700 32px Sora, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText('C O P I L O T O', cx + 72, 168);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5C6B7A'; ctx.font = '400 30px Inter, sans-serif';
  ctx.fillText('fechamento do mês', W - 110, 168);
  ctx.textAlign = 'left';

  const mesNome = nomeDoMes(m.ym).replace(' de ' + m.ym.slice(0, 4), '');
  ctx.textBaseline = 'top';

  if (mostrarValor) {
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('Meu ' + mesNome.toLowerCase(), cx, 300);
    ctx.fillStyle = m.lucro >= 0 ? '#00E08A' : '#FF5A5F';
    ctx.font = '800 138px Sora, sans-serif';
    ctx.fillText(fmtBRL0(m.lucro), cx, 364);
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText(m.lucro >= 0 ? 'líquido no bolso' : 'no vermelho', cx, 536);
    _legendaMes = 'Meu ' + mesNome.toLowerCase() + ': ' + fmtBRL0(m.lucro) +
                  ' líquidos em ' + m.dias + (m.dias === 1 ? ' dia' : ' dias') + ' — feito no Copiloto';
  } else {
    // ⚠️ sem o valor o card não pode ficar vazio: entra o esforço, que é
    // público e que ele tem orgulho de mostrar
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('Meu ' + mesNome.toLowerCase() + ' na rua', cx, 300);
    ctx.fillStyle = '#00E08A'; ctx.font = '800 138px Sora, sans-serif';
    ctx.fillText(String(m.dias), cx, 364);
    const wv = ctx.measureText(String(m.dias)).width;
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 60px Sora, sans-serif';
    ctx.fillText(m.dias === 1 ? 'dia' : 'dias', cx + wv + 20, 452);
    ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('de trabalho registrado', cx, 536);
    _legendaMes = 'Meu ' + mesNome.toLowerCase() + ': ' + m.dias +
                  (m.dias === 1 ? ' dia' : ' dias') + ' na rua — feito no Copiloto';
  }

  ctx.strokeStyle = '#26313D'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, 690); ctx.lineTo(W - 110, 690); ctx.stroke();

  // ── os três números do mês. Só entra o que o app SABE. ──
  const stats = [];
  if (mostrarValor) stats.push([String(m.dias), m.dias === 1 ? 'dia rodado' : 'dias rodados']);
  if (m.porHora !== null) stats.push([fmtBRL0(m.porHora), 'por hora']);
  if (m.km !== null)      stats.push([fmtKm(m.km), 'km rodados']);
  stats.slice(0, 2).forEach(function (st, i) { _statCard(ctx, cx + i * 300, 738, st[0], st[1]); });

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5C6B7A'; ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText('quanto você ganha por hora, de verdade', cx, H - 150);
  ctx.fillStyle = '#93A1B0'; ctx.font = '600 32px Inter, sans-serif';
  ctx.fillText('Copiloto', cx, H - 100);

  await desenharIsaacComVeiculo(ctx, W - 86, H - 62, 232);
}

async function compartilharMes() {
  if (!fecharMes(_mesAberto)) return;
  document.getElementById('shareToggleMes').checked = true;
  document.getElementById('modalShareMes').style.display = 'flex';
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
  desenharCardMes(true);
}

function enviarCardMes() {
  const canvas = document.getElementById('shareCanvasMes');
  const legenda = _legendaMes || '';
  canvas.toBlob(async function (blob) {
    if (!blob) { toast('Não consegui gerar a imagem', 'erro'); return; }
    const file = new File([blob], 'copiloto-mes.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: legenda });
            document.getElementById('modalShareMes').style.display = 'none'; return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    // sem compartilhamento nativo (navegador de desktop): baixa a imagem
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'copiloto-mes.png'; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('Imagem baixada');
  }, 'image/png');
}

// ── (antigo) compartilhar em texto puro — mantido como reserva ──
// ⚠️ Aqui o texto SAI do app (WhatsApp). Marcador [[v:]] e SVG não existem lá
// fora — por isso passa pelo cadeParaVoz(), que devolve texto limpo.
function compartilharMesTexto() {
  const m = fecharMes(_mesAberto);
  if (!m) return;
  const linhas = [
    'Meu ' + nomeDoMes(_mesAberto) + ' no Copiloto:',
    '',
    'Entrou: ' + fmtBRL0(m.receita),
    'Saiu: '   + fmtBRL0(m.receita - m.lucro),
    'Sobrou: ' + fmtBRL0(m.lucro),
    m.dias + (m.dias === 1 ? ' dia rodado' : ' dias rodados')
  ];
  if (m.porHora !== null) linhas.push('Minha hora valeu ' + fmtBRL(m.porHora));
  if (m.km !== null)      linhas.push(fmtKm(m.km) + ' km rodados');
  const txt = linhas.join('\n');
  if (navigator.share) {
    navigator.share({ text: txt }).catch(function () {});
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(txt).then(function () { toast('Copiado! É só colar.'); })
      .catch(function () { toast('Não consegui copiar', 'erro'); });
  }
}

// ═══════════════════════════════════════════════════════════════
//  TUTORIAL DA PRIMEIRA VEZ — o Isaac mostra ONDE fica cada coisa

// ═══════════════════════════════════════════════════════════════
//  MODO DEMONSTRAÇÃO — 3 meses de dados fictícios
// ═══════════════════════════════════════════════════════════════
// Serve pra ver o app CHEIO sem esperar 3 meses de uso real: a carta do mês,
// o piso, o extrato, os comparativos e o custo por km só existem com histórico.
//
// ⚠️ AS QUATRO TRAVAS (nenhuma delas é opcional):
//   1. NÃO tem botão na interface. Só entra por `?demo=1` na URL — motorista
//      nenhum vai cair aqui sem querer.
//   2. Faz BACKUP do localStorage inteiro antes de tocar em qualquer coisa, e
//      devolve tudo ao sair. Os dados reais do dono voltam intactos.
//   3. NADA sobe pra nuvem enquanto a demo está ligada. Sem isto os R$ 11 mil
//      fictícios entrariam no Supabase de verdade e sujariam o histórico.
//   4. Uma tarja fixa no topo diz que os dados são inventados. Print de tela
//      de demo circulando como se fosse resultado real é mentira — e é o tipo
//      de coisa que a categoria já cansou de ver de influenciador.
const DEMO_FLAG   = 'modoDemo';
const DEMO_BACKUP = '_backupAntesDaDemo';

function emDemo() { try { return localStorage.getItem(DEMO_FLAG) === '1'; } catch (e) { return false; } }

// Números plantados de propósito pra a LUPA ter o que achar:
//   • sexta e sábado rendem bem mais que segunda e terça  → "seu dia campeão"
//   • Ipiranga cobra ~R$ 0,55/L a mais que o Tupi         → "o posto que te custou caro"
//   • o mês mais recente é melhor que o anterior          → comparação com corpo
const DEMO_POSTOS = [
  { nome: 'Posto Tupi',      ppl: 5.89, peso: 4 },
  { nome: 'Ipiranga Centro', ppl: 6.44, peso: 3 },
  { nome: 'Shell Contorno',  ppl: 6.19, peso: 2 },
  { nome: 'Posto do Zé',     ppl: 5.99, peso: 1 }
];
// dom, seg, ter, qua, qui, sex, sáb
const DEMO_PESO_DIA = [0.72, 0.80, 0.84, 0.95, 1.06, 1.28, 1.22];

function _demoRand(semente) {          // aleatório reprodutível: a demo é sempre igual
  let x = Math.sin(semente) * 10000;
  return x - Math.floor(x);
}

function montarDadosDemo() {
  const hoje = new Date();
  const fin = [], abast = [], kmPorDia = {}, horasPorDia = {}, despesasPorDia = {};
  const VID = 'demo-v1';
  // ⚠️ `kmDesdeAbast` acumula o km dos dias. Sem ele o abastecimento levava um
  // km inventado (litros × consumo), e aí o custo/km da tela Início (que divide
  // pelo km entre abastecimentos) não batia com o da carta (que divide pelo km
  // dos dias). Duas telas do mesmo app com números diferentes — justamente o
  // que a demo existe pra deixar você conferir.
  let odo = 92400, litrosNoTanque = 0, seq = 0, kmDesdeAbast = 0, diasRodados = 0;

  // 90 dias pra trás, folgando 1 dia por semana (motorista descansa)
  for (let d = 89; d >= 0; d--) {
    const dt = new Date(hoje); dt.setDate(dt.getDate() - d);
    const iso = isoLocal(dt), dow = dt.getDay();
    if (dow === 0 && _demoRand(d) < 0.7) continue;     // quase todo domingo é folga
    seq++;

    const peso  = DEMO_PESO_DIA[dow];
    const horas = Math.round((7.5 + _demoRand(d * 3) * 4.5) * 10) / 10;
    const km    = Math.round((horas * (21 + _demoRand(d * 7) * 6)));
    // R$/km bruto de praça média brasileira. Puxar isso pra cima faria a demo
    // mostrar um mês que o motorista real não tem — e demo que mente é o que
    // a categoria já detesta no influenciador.
    const bruto = Math.round(km * (1.32 + _demoRand(d * 11) * 0.38) * peso);
    const taxa  = Math.round(bruto * 0.26);
    const receita = bruto;

    // abastece quando o tanque pede (a cada ~380 km)
    let combDoDia = 0;
    kmDesdeAbast += km;
    litrosNoTanque -= km / 11.4;
    if (litrosNoTanque <= 0) {
      const po = DEMO_POSTOS[Math.floor(_demoRand(d * 13) * 4)];
      const litros = Math.round((26 + _demoRand(d * 17) * 12) * 10) / 10;
      const ppl    = Math.round((po.ppl + (_demoRand(d * 19) - 0.5) * 0.14) * 100) / 100;
      const valor  = Math.round(litros * ppl * 100) / 100;
      const kmDesde = kmDesdeAbast > 0 ? kmDesdeAbast : Math.round(litros * 11.4);
      abast.unshift({
        id: 'demo' + seq, dataISO: iso, data: isoParaExibicao(iso),
        tipo: 'Gasolina', valor: valor, litros: litros, km: kmDesde,
        cpm: (valor / kmDesde).toFixed(2), ppl: ppl.toFixed(2),
        posto: po.nome, vid: VID
      });
      combDoDia = valor;
      litrosNoTanque = litros;
      kmDesdeAbast = 0;
    }

    // despesas: nem todo dia, e valores de rua
    const desps = [];
    if (_demoRand(d * 23) < 0.55) desps.push({ id: 'dp' + seq + 'a', cat: 'alimentacao', label: 'Alimentação', valor: 18 + Math.round(_demoRand(d * 29) * 14) });
    if (_demoRand(d * 31) < 0.30) desps.push({ id: 'dp' + seq + 'b', cat: 'pedagio',     label: 'Pedágio',     valor: 7  + Math.round(_demoRand(d * 37) * 8) });
    if (_demoRand(d * 41) < 0.12) desps.push({ id: 'dp' + seq + 'c', cat: 'lavagem',     label: 'Lavagem',     valor: 35 });
    if (desps.length) despesasPorDia[iso] = desps;
    const desp = desps.reduce(function (t, x) { return t + x.valor; }, 0);

    odo += km; diasRodados++;
    kmPorDia[iso]    = { km: km, vid: VID, dias: 1 };
    horasPorDia[iso] = horas;
    fin.unshift({
      data: dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }),
      dataISO: iso, receita: receita, taxa: taxa, comb: combDoDia, desp: desp,
      lucro: receita - taxa - combDoDia - desp, tipo: 'bruto',
      odo: odo, kmDia: km, vid: VID
    });
  }

  return { fin: fin, abast: abast, kmPorDia: kmPorDia, horasPorDia: horasPorDia,
           despesasPorDia: despesasPorDia, odo: odo, VID: VID, diasRodados: diasRodados };
}

function entrarNaDemo() {
  if (emDemo()) return;
  // 2ª trava: backup ANTES de escrever qualquer coisa
  const copia = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k !== DEMO_BACKUP) copia[k] = localStorage.getItem(k);
  }
  const backup = JSON.stringify(copia);
  localStorage.clear();
  localStorage.setItem(DEMO_BACKUP, backup);
  localStorage.setItem(DEMO_FLAG, '1');

  const D = montarDadosDemo();
  const ultimo = D.fin[0], penultimo = D.fin[1];
  salvarLS('perfilUsuario', { nome: 'Carlos Demo', veiculo: 'carro', tipoVeiculo: 'carro',
                              metaDiaria: 260, reservaDia: 18, taxa: 26 });
  // ⚠️ o odômetro é propriedade DO VEÍCULO (`v.odo`) — não uma chave à parte.
  // Sem isto o kmAtual nasce 0, o painel de manutenção acha que nunca foi
  // registrado e a demo abre com tudo zerado.
  salvarLS('veiculos', [{ id: D.VID, nome: 'Onix 1.0', tipo: 'carro', placa: 'DEM0S01',
                          odo: D.odo, reservaManutKm: 0.15 }]);
  localStorage.setItem('veiculoAtivo', D.VID);
  salvarLS('historicoFinancas', D.fin);
  salvarLS('historicoAbastecimentos', D.abast);
  salvarLS('kmPorDia', D.kmPorDia);
  salvarLS('horasPorDia', D.horasPorDia);
  salvarLS('despesasPorDia', D.despesasPorDia);
  salvarLS('registroHoje',      { km: D.odo, data: ultimo.dataISO, vid: D.VID });
  salvarLS('registroAnterior',  { km: D.odo - (ultimo.kmDia || 0), data: penultimo.dataISO, vid: D.VID });
  salvarLS('manutPorVeiculo', (function () {
    const m = {};
    m[D.VID] = {
      oleo:  { kmUltima: D.odo - 2450, intervalo: 3000,  dataUltima: null },
      pneus: { kmUltima: D.odo - 7100, intervalo: 10000, dataUltima: null },
      freio: { kmUltima: D.odo - 9300, intervalo: 30000, dataUltima: null }
    };
    return m;
  })());
  // a reserva de manutenção é acumulada dia a dia; sem semear, o cofrinho
  // aparece zerado num app que "já roda há 3 meses"
  salvarLS('reservaAcumulada', D.diasRodados * 18);
  salvarLS('streak', 12);
  salvarLS('recorde', 19);
  // o tutorial e o presente não entram na frente de quem veio ver a demo
  salvarLS('tutCapsVistos', { inicio: true, manutencao: true, combustivel: true,
                              financas: true, documentos: true, isaac: true });
  salvarLS('presenteVisto', true);
  // ⚠️ `contaCriada` fica FALSO de propósito: sem isso o app pediria login
  // pra lançar, e a demo travaria numa tela de senha.
  location.replace(location.pathname);
}

function sairDaDemo() {
  const backup = localStorage.getItem(DEMO_BACKUP);
  localStorage.clear();
  if (backup) {
    try {
      const copia = JSON.parse(backup);
      Object.keys(copia).forEach(function (k) { localStorage.setItem(k, copia[k]); });
    } catch (e) {}
  }
  location.replace(location.pathname);
}

// 4ª trava: a tarja. Fica por cima de tudo e não sai da tela.
function pintarTarjaDemo() {
  if (!emDemo() || document.getElementById('tarjaDemo')) return;
  const t = document.createElement('div');
  t.id = 'tarjaDemo';
  t.className = 'tarja-demo';
  t.innerHTML = '<span>' + ico('alerta') + ' MODO DEMONSTRAÇÃO · dados inventados</span>' +
                '<button onclick="sairDaDemo()">sair</button>';
  document.body.appendChild(t);
  document.body.classList.add('com-tarja-demo');
}


// ─── SEMEAR NA CONTA DE VERDADE (`?semear=1`) ──────────────────
// Diferente da demo: aqui os lançamentos entram na conta REAL do motorista e
// SOBEM PRA NUVEM. Existe porque a base de teste do dono é toda descartável e
// ele precisa ver a lupa funcionando com o próprio login, não num sandbox.
//
// ⚠️ NÃO É PRA MOTORISTA. Se isso rodar na conta de um usuário de verdade, ele
// mistura dado inventado com o dinheiro dele — e o app inteiro perde o sentido.
//
// ⚠️ TRÊS FECHADURAS, porque "ninguém sabe a URL" não é segurança:
//   1. só por `?semear=1` (ninguém tropeça nisso);
//   2. **só nas contas desta lista** — qualquer outro e-mail é recusado;
//   3. confirmação escrita antes de gravar.
// A nº 2 é a que importa: o código vai no APK e no site de todo mundo, e link
// se compartilha. Sem ela, bastava um motorista curioso colar a URL.
//
// Pra semear em outra conta de teste sua, é só somar o e-mail aqui.
const DONOS_DO_APP = [
  'gustavo.soaresgrs18@gmail.com',
  'app.copilotosup@gmail.com'
];
function souODono() {
  const emails = [];
  if (typeof usuarioLogado === 'function') {
    const u = usuarioLogado();
    if (u && u.email) emails.push(String(u.email).toLowerCase());
  }
  const p = getPerfil();
  if (p && p.email) emails.push(String(p.email).toLowerCase());
  return emails.some(function (e) { return DONOS_DO_APP.indexOf(e) >= 0; });
}
function semearNaConta() {
  if (!souODono()) {
    // Mensagem sem drama: quem chegou aqui por link não precisa saber o que é.
    toast('Isso não está disponível nesta conta', 'erro');
    return;
  }
  pedirConfirmacao(
    ico('alerta') + ' Semear dados de teste',
    'Isto vai criar cerca de 60 dias de lançamentos INVENTADOS na sua conta e mandar tudo '
    + 'pra nuvem, misturado com o que já existe aí. Serve pra testar a lupa e o relatório. '
    + 'Só faça isso numa conta descartável — não tem desfazer.',
    function () {
      const vid = vidAtivo();
      if (!vid) { toast('Cadastre um veículo antes', 'erro'); return; }
      const D = montarDadosDemo();

      // não pisa em cima de dia que já existe: o que é dele continua dele
      const finAtual = lerLS('historicoFinancas', []);
      const jaTem = {};
      finAtual.forEach(function (r) { jaTem[r.dataISO] = true; });

      const novosFin = D.fin.filter(function (r) { return !jaTem[r.dataISO]; })
                            .map(function (r) { r.vid = vid; return r; });
      const novosAb  = D.abast.map(function (a) { a.vid = vid; a.id = 'seed' + a.id; return a; });

      salvarLS('historicoFinancas', novosFin.concat(finAtual));
      salvarLS('historicoAbastecimentos', novosAb.concat(lerLS('historicoAbastecimentos', [])));
      const km = lerLS('kmPorDia', {}), hs = lerLS('horasPorDia', {}), dp = lerLS('despesasPorDia', {});
      Object.keys(D.kmPorDia).forEach(function (k) { if (!km[k]) km[k] = { km: D.kmPorDia[k].km, vid: vid, dias: 1 }; });
      Object.keys(D.horasPorDia).forEach(function (k) { if (!hs[k]) hs[k] = D.horasPorDia[k]; });
      Object.keys(D.despesasPorDia).forEach(function (k) { if (!dp[k]) dp[k] = D.despesasPorDia[k]; });
      salvarLS('kmPorDia', km); salvarLS('horasPorDia', hs); salvarLS('despesasPorDia', dp);

      // sobe pra nuvem — é isso que diferencia do modo demonstração
      if (typeof salvarRegistroHibrido === 'function') {
        novosFin.forEach(function (r) {
          salvarRegistroHibrido('financas', {
            data_iso: r.dataISO, receita: r.receita, liquido: r.lucro,
            taxa_real: r.taxa, km_dia: (km[r.dataISO] || {}).km || null, despesas: r.desp
          }, 'usuario_id,data_iso').catch(function () {});
        });
        novosAb.forEach(function (a) {
          salvarRegistroHibrido('abastecimentos', {
            id: a.id, data_iso: a.dataISO, tipo: a.tipo, valor: a.valor, litros: a.litros,
            km: a.km, cpm: a.cpm, posto: a.posto, veiculo_id: vid, km_ok: false
          }, 'id').catch(function () {});
        });
      }
      toast(novosFin.length + ' dias semeados — subindo pra nuvem');
      setTimeout(function () { location.replace(location.pathname); }, 1200);
    });
}

// ═══════════════════════════════════════════════════════════════
//  TUTORIAL GUIADO — UM CAPÍTULO POR ABA
// ═══════════════════════════════════════════════════════════════
// O guia (os cards do Isaac) explica O QUE o app faz. Isto é outra coisa:
// mostra ONDE fica, com o dedo em cima.
//
// ⚠️ A PRIMEIRA VERSÃO DESPEJAVA TUDO NA TELA INÍCIO e acabava ali. As outras
// cinco abas — que é onde estão metade das rotinas — nunca eram apresentadas.
// Agora é por CAPÍTULO: termina o Início, e quando ele entra numa aba nova
// pela primeira vez, o capítulo daquela aba aparece sozinho. Ele aprende no
// momento em que precisa, e cada capítulo é curto o bastante pra não cansar.
//
// Regras que não se quebram:
//   1. cada capítulo roda UMA vez (marcado por aba, não tudo junto);
//   2. "pular" some com o capítulo atual e não volta;
//   3. pulou 2 capítulos → ele já disse o que queria: desliga o resto;
//   4. alvo que não existe na tela é pulado, nunca trava.
//
// ⚠️ Sobre o texto: gatilho mental aqui é DAR PESO ao que o app faz de verdade —
// nunca prometer o que ele não faz. Cada frase abaixo tem lastro em código.
const TUT_CAPS = [
  {
    id: 'inicio', ic: 'alvo', nome: 'Sua tela de todo dia',
    passos: [
      { alvo: 'tutGauge', tit: 'Você ganhou hoje. Mas sobrou?',
        txt: 'Tem motorista que roda 12 horas, vê R$ 400 na tela e acha que fez R$ 400. Não fez. '
           + 'Este número aqui é <b>o que ficou no seu bolso</b> depois da taxa, da gasolina e do desgaste. '
           + 'É o único que paga conta.' },
      { alvo: 'tutStrip', tit: 'Sua hora vale quanto?',
        txt: 'Ninguém nunca te disse, né? Aqui está. <b>Quanto sua hora pagou hoje</b>, quanto cada km te '
           + 'custou e quanto eu já guardei pra manutenção. Toque em qualquer um: eu abro a conta inteira.' },
      { alvo: 'sliderContainer', tit: 'Dois segundos mudam tudo',
        txt: 'Deslize ao sair. Deslize ao voltar. É só isso. Sem essas duas deslizadas eu não consigo '
           + 'cronometrar seu dia — e você nunca vai saber se <b>aquele dia de 14 horas rendeu mais que um de 8</b>.' },
      { alvo: 'odoCardAlvo', tit: 'O km do painel é ouro',
        txt: 'Digite o km ao fechar o dia. Com ele eu descubro <b>quanto o SEU veículo gasta de verdade</b> — '
           + 'não o que a montadora promete e nunca cumpre. Errou um dígito? Toque aqui. Eu refaço tudo.' },
      { alvo: 'tutLuzes', tit: 'Quebrar na rua custa três vezes',
        txt: 'Conserto, guincho e o dia parado. Registre a última troca <b>uma vez só</b> e eu conto os km '
           + 'por você. <b>Eu grito antes de quebrar</b>, não depois.' },
      { alvo: 'btnAjuda', tit: 'R$ 12 por 5 km parece bom. E não é.',
        txt: 'Some os 4 km até o passageiro: viraram 9 km, e a corrida pagou R$ 1,33 por km. '
           + '<b>É assim que motorista troca dinheiro achando que tá lucrando.</b> Toque aqui e eu te dou o '
           + 'seu piso, com a tabela pronta. Você não divide nada — só bate o olho e decide.' }
    ],
    fecho: 'Essa tela você já domina. <b>Abra qualquer aba aí embaixo que eu te apresento ela também.</b>'
  },
  {
    id: 'manutencao', ic: 'chave', nome: 'Manutenção',
    passos: [
      { alvo: 'manutCard1', tit: 'Sua memória não é obrigada',
        txt: 'Você diz o km da última troca <b>uma vez</b>. A barra enche sozinha enquanto você roda. '
           + 'Chega de papelzinho de oficina no porta-luvas.' },
      { alvo: 'manutCard2', tit: 'Amarelo é o seu dinheiro',
        txt: 'No amarelo <b>você</b> escolhe o dia, a oficina e o preço. No vermelho quem escolhe é o guincho. '
           + 'É a mesma peça — muda só quem manda na hora.' }
    ],
    fecho: ''
  },
  {
    id: 'combustivel', ic: 'bomba', nome: 'Combustível',
    passos: [
      { alvo: 'btnAbrirAbastecer', tit: '10 segundos valem o app inteiro',
        txt: 'Valor, litros e o km rodado, ali na fila do posto. É esse lançamento que faz <b>tudo aqui '
           + 'dentro virar número real</b>. Sem ele, sobra chute — e chute você já tem de graça.' },
      { alvo: 'tutCustoKm', tit: 'Os outros estimam. Eu meço.',
        txt: 'Todo app de motorista <b>calcula seu custo por média de mercado</b>. Eu meço do seu tanque: '
           + 'seu veículo, seu trânsito, seu pé. Por isso esse número serve pra você recusar corrida.' },
      { alvo: 'tutTanque', tit: 'Quanto do seu mês virou gasolina?',
        txt: 'Esse tanque é o seu bolso, não o do carro. E eu comparo o litro de hoje com os <b>4 '
           + 'abastecimentos anteriores</b>: se o posto te sacaneou, você descobre <b>ainda no posto</b>.' }
    ],
    fecho: ''
  },
  {
    id: 'financas', ic: 'dinheiro', nome: 'Finanças',
    passos: [
      { alvo: 'tutFinHero', tit: 'A conta aberta. Pode conferir.',
        txt: 'Receita, taxa da plataforma, combustível, lucro por km. <b>Linha por linha.</b> '
           + 'Você não precisa acreditar em mim. Você confere.' },
      { alvo: 'btnRegistrarReceita', tit: 'Você digita um número. Um.',
        txt: 'Quanto a plataforma te pagou. Só isso. <b>O resto da conta é comigo</b> — eu já sei seu '
           + 'combustível, seu km e a sua reserva do dia.' },
      { alvo: 'btnAbrirDespesas', tit: 'R$ 15 por dia viram R$ 450 no mês',
        txt: 'Pedágio, almoço, lavagem, a água do farol. Ninguém anota — <b>e é por isso que ninguém sabe '
           + 'quanto ganha</b>. Aqui são dois toques e acabou a sangria invisível.' },
      { alvo: 'projCard', tit: 'Saber no dia 30 não muda o dia 30',
        txt: 'No ritmo de hoje, é isso que seu mês fecha. Tá baixo? <b>Você ainda tem dias pra virar o jogo.</b> '
           + 'Essa é a diferença entre olhar pra frente e se lamentar depois.' }
    ],
    fecho: ''
  },
  {
    id: 'documentos', ic: 'doc', nome: 'Documentos',
    passos: [
      { alvo: 'btnNovoDoc', tit: 'Ninguém deixa vencer de propósito',
        txt: 'CNH, IPVA, seguro, vistoria. Cadastre <b>uma vez</b> e eu aviso muito antes. '
           + 'Documento vencido não é azar: é falta de alguém pra lembrar.' },
      { alvo: 'navDocumentos', tit: 'O aviso vai atrás de você',
        txt: 'Quando a data chegar perto, <b>acende um número aqui na aba</b>. '
           + 'Você não precisa lembrar de nada. Lembrar é comigo.' }
    ],
    fecho: ''
  },
  {
    id: 'isaac', ic: 'balao', nome: 'Eu, o Isaac',
    passos: [
      { alvo: 'cadeBalao', tit: 'Eu não passo a mão na sua cabeça',
        txt: 'Todo dia eu leio seus números e te digo como foi <b>de verdade</b>. Dia ruim eu falo que foi ruim. '
           + 'E se faltar dado eu digo que faltou: <b>eu nunca invento número</b> pra te agradar.' },
      { alvo: 'cadeMesBtn', tit: 'No fim do mês, uma carta pra você',
        txt: 'Quanto entrou, quanto saiu, quanto sobrou e qual foi seu melhor dia. Escrito, não em gráfico '
           + 'que ninguém entende. E dá pra <b>mandar no WhatsApp</b> pra quem duvida do seu trabalho.' }
    ],
    fecho: 'Agora você tem o que quase nenhum motorista tem: <b>o seu próprio número</b>. '
         + 'A única pergunta que sobra é por que você não começou isso antes. Bora rodar.'
  }
];

let _tutCap = null;      // capítulo em exibição
let _tutPassos = [];     // só os passos cujo alvo está VISÍVEL agora
let _tutIdx = 0;         // posição dentro de _tutPassos

// ⚠️ Um passo cujo alvo está escondido (botão que só aparece com dado, item de
// lista vazia) precisa sair da conta ANTES de começar — senão o contador diz
// "1/3" e o capítulo acaba no 1, e o fecho do Isaac se perde junto.
function alvoVisivel(id) {
  const e = document.getElementById(id);
  return !!(e && e.getClientRects().length);
}

function tutVistos()   { const v = lerLS('tutCapsVistos', {}); return (v && typeof v === 'object') ? v : {}; }
function tutMarcar(id) { const v = tutVistos(); v[id] = true; salvarLS('tutCapsVistos', v); }
function tutPulos()    { return lerLS('tutPulos', 0) || 0; }
// ⚠️ Compatibilidade: quem já viu o tutorial antigo (v3.80) não pode levar o
// capítulo do Início na cara de novo. A marca velha vale como "Início visto".
function tutorialJaViu() { return tutVistos().inicio === true || lerLS('tutorialVisto', false) === true; }

// Abre o capítulo de uma aba, se ele ainda não foi visto e nada estiver na frente.
function talvezTutorial(id) {
  if (tutVistos()[id]) return;
  if (id !== 'inicio' && !tutorialJaViu()) return;   // o Início vem primeiro, sempre
  if (tutPulos() >= 2) return;                       // ele já disse duas vezes que não quer
  const cap = TUT_CAPS.find(function (c) { return c.id === id; });
  if (!cap) return;
  // ⚠️ Nem por cima de OUTRO capítulo: o motorista pode tocar numa aba no meio
  // da explicação. Sem esta linha o capítulo novo assumia por cima e o antigo
  // ficava sem ser marcado como visto — voltaria do zero na próxima visita.
  const ov = document.getElementById('tutOverlay');
  if (ov && ov.style.display && ov.style.display !== 'none') return;
  // nada de tutorial por cima de modal aberto: o holofote iluminaria o que
  // está atrás do modal e o motorista veria dois avisos brigando
  const algumAberto = [...document.querySelectorAll('.modal-overlay, .modal-streak')]
    .some(function (m) { return m.style.display && m.style.display !== 'none'; });
  if (algumAberto) return;
  setTimeout(function () { abrirTutorialCap(cap); }, 420);
}

function abrirTutorialCap(cap) {
  const ov = document.getElementById('tutOverlay');
  if (!ov) return;
  _tutPassos = cap.passos.filter(function (p) { return alvoVisivel(p.alvo); });
  if (!_tutPassos.length) return;   // nada pra mostrar agora: tenta na próxima visita
  _tutCap = cap;
  _tutIdx = 0;
  const lobo = document.getElementById('tutLobo');
  if (lobo) lobo.innerHTML = svgCaramelo('filhote', 'feliz', 40, false);
  document.getElementById('tutCapIc').innerHTML  = ico(cap.ic);
  document.getElementById('tutCapNome').textContent = cap.nome;
  ov.style.display = 'block';
  pintarPassoTutorial();
}
// mantido pro caminho antigo (presente de boas-vindas chama isto)
function abrirTutorial() { talvezTutorial('inicio'); }

function fecharTutorial() {
  const ov = document.getElementById('tutOverlay');
  if (ov) ov.style.display = 'none';
  if (_tutCap) tutMarcar(_tutCap.id);
  _tutCap = null;
}
function pularTutorial() {
  salvarLS('tutPulos', tutPulos() + 1);
  fecharTutorial();
}
function tutorialProximo() {
  if (!_tutCap) { fecharTutorial(); return; }
  _tutIdx++;
  if (_tutIdx >= _tutPassos.length) { fecharTutorial(); return; }
  pintarPassoTutorial();
}

function pintarPassoTutorial() {
  if (!_tutCap) return;
  const passo = _tutPassos[_tutIdx];
  const alvo   = document.getElementById(passo.alvo);
  const buraco = document.getElementById('tutBuraco');
  const anel   = document.getElementById('tutAnel');
  const balao  = document.getElementById('tutBalao');

  // ⚠️ Alvo sumido não pode travar o capítulo. E "sumido" inclui o que EXISTE
  // mas está escondido: o botão de ajuda mora no cabeçalho da tela Início, e
  // fora dela o getElementById devolve o elemento com tamanho ZERO — o holofote
  // ia parar no canto da tela apontando pro nada. Tamanho zero = pula.
  if (!alvo || !alvo.getClientRects().length) { tutorialProximo(); return; }

  alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(function () {
    const r = alvo.getBoundingClientRect();
    const pad = 8;
    const cx = { top: r.top - pad, left: r.left - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
    buraco.style.top = cx.top + 'px';  buraco.style.left = cx.left + 'px';
    buraco.style.width = cx.w + 'px';  buraco.style.height = cx.h + 'px';

    // ── A TROCA DE ROTINA PRECISA SER VISTA ──────────────────
    // Sem isto o holofote deslizava em silêncio e o motorista continuava lendo
    // achando que ainda era o mesmo assunto. O anel pulsa em cima do alvo novo
    // e o balão entra de baixo: dois sinais de que virou a página.
    anel.style.top = cx.top + 'px';    anel.style.left = cx.left + 'px';
    anel.style.width = cx.w + 'px';    anel.style.height = cx.h + 'px';
    anel.classList.remove('pulsa'); void anel.offsetWidth; anel.classList.add('pulsa');
    balao.classList.remove('troca');  void balao.offsetWidth; balao.classList.add('troca');

    const ultimo = (_tutIdx === _tutPassos.length - 1);
    document.getElementById('tutTit').innerHTML   = passo.tit;
    document.getElementById('tutTexto').innerHTML =
      passo.txt + ((ultimo && _tutCap.fecho) ? '<br><br>' + _tutCap.fecho : '');
    document.getElementById('tutPasso').textContent = (_tutIdx + 1) + '/' + _tutPassos.length;
    document.getElementById('tutOk').textContent = ultimo ? 'Beleza, entendi' : 'Próximo';
    document.getElementById('tutDots').innerHTML = _tutPassos.map(function (x, i) {
      return '<i class="' + (i < _tutIdx ? 'feito' : (i === _tutIdx ? 'agora' : '')) + '"></i>';
    }).join('');

    // o balão vai pro lado com mais espaço: nunca por cima do que está sendo
    // apontado, senão o holofote não serve pra nada
    const alturaBalao = balao.offsetHeight || 170;
    const cabeAbaixo  = (window.innerHeight - r.bottom) > (alturaBalao + 26);
    balao.style.top = cabeAbaixo
      ? (r.bottom + 15) + 'px'
      : Math.max(12, r.top - alturaBalao - 15) + 'px';
    const seta = document.getElementById('tutSeta');
    seta.className = 'tut-seta ' + (cabeAbaixo ? 'acima' : 'abaixo');
    // a seta acompanha o alvo na horizontal, mas sem escapar do balão
    const bx = balao.getBoundingClientRect();
    const meio = Math.min(Math.max(r.left + r.width / 2, bx.left + 22), bx.right - 22);
    seta.style.left = (meio - bx.left) + 'px';
  }, 340);
}

// ═══════════════════════════════════════════════════════════════
//  BOTÃO VOLTAR DO ANDROID (só existe quando vira app nativo)
// ═══════════════════════════════════════════════════════════════
// ⚠️ No navegador o botão voltar não faz nada aqui, porque o app é uma
// página só. No Android ele é FÍSICO e o motorista usa o tempo todo — e
// sem tratamento ele FECHA O APP INTEIRO, mesmo com um modal aberto no
// meio de um lançamento. Perder o registro dele por causa disso é
// exatamente o que a regra sagrada nº 10 proíbe.
//
// A ordem que ele espera: fecha o que está por cima primeiro.
//   1. modal aberto      → fecha o modal
//   2. sub-tela          → volta pra tela mãe
//   3. aba que não Início→ volta pro Início
//   4. Início            → aí sim, sai (com confirmação)
function voltarUmPasso() {
  // 1. algum modal aberto? o de cima fecha primeiro
  const abertos = [...document.querySelectorAll('.modal-overlay')]
    .filter(m => m.style.display && m.style.display !== 'none');
  if (abertos.length) {
    abertos[abertos.length - 1].style.display = 'none';
    return true;
  }
  // 2. sub-telas: cada uma sabe pra onde volta
  const visivel = id => { const e = document.getElementById(id); return e && e.style.display !== 'none'; };
  if (visivel('telaExtrato'))    { atualizarTelaCombustivel(); mostrarTela(telaCombustivel); navCombustivel.classList.add('ativo'); return true; }
  if (visivel('telaExtratoFin')) { atualizarTelaFinancas();    mostrarTela(telaFinancas);    navFinancas.classList.add('ativo');    return true; }
  if (visivel('telaDespesas'))   { atualizarTelaFinancas();    mostrarTela(telaFinancas);    navFinancas.classList.add('ativo');    return true; }
  // 3. qualquer aba que não seja o Início volta pro Início
  if (!visivel('telaInicio') && !visivel('telaCadastro')) {
    mostrarTela(telaInicio); navInicio.classList.add('ativo'); return true;
  }
  return false;   // não havia pra onde voltar
}
// Registra só quando o app está rodando como aplicativo. No navegador o
// Capacitor não existe e este bloco simplesmente não roda.
function ligarBotaoVoltar() {
  const Cap = window.Capacitor;
  if (!Cap || !Cap.Plugins || !Cap.Plugins.App) return;
  Cap.Plugins.App.addListener('backButton', function () {
    if (voltarUmPasso()) return;
    // Estamos no Início e sem nada aberto. Fechar o app é decisão dele,
    // não acidente — mas só confirma se tiver turno em andamento, senão
    // vira pergunta chata toda vez.
    if (lerLS('turnoAtivo', null)) {
      pedirConfirmacao('Sair do Copiloto?',
        'Seu turno está em andamento. Ele continua contando mesmo com o app fechado.',
        function () { Cap.Plugins.App.exitApp(); });
      return;
    }
    Cap.Plugins.App.exitApp();
  });
}
document.addEventListener('deviceready', ligarBotaoVoltar);
if (window.Capacitor) ligarBotaoVoltar();

// ─── EXTRATO COMBUSTÍVEL: botões ──────────────────────────────
document.getElementById('btnVerExtrato').addEventListener('click', abrirExtrato);
document.getElementById('extBack').addEventListener('click', () => { atualizarTelaCombustivel(); mostrarTela(telaCombustivel); navCombustivel.classList.add('ativo'); });
document.getElementById('extMes').addEventListener('click', () => {
  extratoModo = 'mes'; extratoOffset = 0; _extratoTodos = false;
  document.getElementById('extMes').classList.add('ativo'); document.getElementById('extSemana').classList.remove('ativo');
  renderExtrato();
});
document.getElementById('extSemana').addEventListener('click', () => {
  extratoModo = 'semana'; extratoOffset = 0; _extratoTodos = false;
  document.getElementById('extSemana').classList.add('ativo'); document.getElementById('extMes').classList.remove('ativo');
  renderExtrato();
});
document.getElementById('extPrev').addEventListener('click', () => { extratoOffset--; _extratoTodos = false; renderExtrato(); });
document.getElementById('extNext').addEventListener('click', () => { if (extratoOffset < 0) { extratoOffset++; _extratoTodos = false; renderExtrato(); } });
document.getElementById('extCombPDF').addEventListener('click', exportarCombPDF);
document.getElementById('extCombCSV').addEventListener('click', exportarCombCSV);

// ─── EXTRATO FINANÇAS: botões ─────────────────────────────────
function abrirDespesas() {
  despCatSel = null;
  const row = document.getElementById('despInputRow'); if (row) row.style.display = 'none';
  document.querySelectorAll('#despChips .desp-chip').forEach(c => c.classList.remove('ativo'));
  renderDespesas();
  mostrarTela(document.getElementById('telaDespesas'));
}
document.getElementById('btnAbrirDespesas').addEventListener('click', abrirDespesas);
document.querySelectorAll('#desempenhoToggle .seg-btn').forEach(b => b.addEventListener('click', () => mostrarDesempenho(b.dataset.v)));
document.getElementById('despBack').addEventListener('click', () => { atualizarTelaFinancas(); mostrarTela(telaFinancas); navFinancas.classList.add('ativo'); });
document.getElementById('btnVerExtratoFin').addEventListener('click', abrirExtratoFin);
document.getElementById('extFinBack').addEventListener('click', () => { atualizarTelaFinancas(); mostrarTela(telaFinancas); navFinancas.classList.add('ativo'); });
document.getElementById('extFinMes').addEventListener('click', () => {
  extFinModo = 'mes'; extFinOffset = 0;
  document.getElementById('extFinMes').classList.add('ativo'); document.getElementById('extFinSemana').classList.remove('ativo');
  renderExtratoFin();
});
document.getElementById('extFinSemana').addEventListener('click', () => {
  extFinModo = 'semana'; extFinOffset = 0;
  document.getElementById('extFinSemana').classList.add('ativo'); document.getElementById('extFinMes').classList.remove('ativo');
  renderExtratoFin();
});
document.getElementById('extFinPrev').addEventListener('click', () => { extFinOffset--; renderExtratoFin(); });
document.getElementById('extFinNext').addEventListener('click', () => { if (extFinOffset < 0) { extFinOffset++; renderExtratoFin(); } });
document.getElementById('extFinPDF').addEventListener('click', exportarFinPDF);
document.getElementById('extFinCSV').addEventListener('click', exportarFinCSV);

navInicio.addEventListener('click',      () => { initDashboard(); mostrarTela(telaInicio); navInicio.classList.add('ativo'); });
// ⚠️ talvezTutorial() vai em TODA aba: é ele que apresenta as rotinas daquela
// tela na primeira visita. Só roda uma vez por aba e nunca por cima de modal.
navManutencao.addEventListener('click',  () => { mostrarTela(telaManutencao);  navManutencao.classList.add('ativo'); talvezTutorial('manutencao'); });
navCombustivel.addEventListener('click', () => { atualizarTelaCombustivel();   mostrarTela(telaCombustivel); navCombustivel.classList.add('ativo'); talvezTutorial('combustivel'); });
navFinancas.addEventListener('click',    () => { atualizarTelaFinancas();      mostrarTela(telaFinancas);    navFinancas.classList.add('ativo'); talvezTutorial('financas'); });
navDocumentos.addEventListener('click',  () => { atualizarTelaDocumentos();    mostrarTela(telaDocumentos);  navDocumentos.classList.add('ativo'); talvezTutorial('documentos'); });
// desenha o lobo na aba, na fase que ele está hoje (filhote → lenda)
// o Isaac na tela de cadastro — filhote, que é a fase de quem está chegando
function renderCarameloCadastro() {
  const box = document.getElementById('cadIsaac');
  if (box) box.innerHTML = svgCaramelo('filhote', 'feliz', 118, false);
}
function renderCarameloCade() {
  const box = document.getElementById('cadeBicho');
  if (!box) return;
  box.innerHTML = svgCaramelo(faseAtualDoCaramelo(), 'feliz', 156, true);
}
// escreve o nome do consultor onde ele aparece pro motorista
function aplicarNomeAssistente() {
  const t = document.getElementById('cadeNomeBig');   if (t) t.textContent = NOME_ASSISTENTE;
  const n = document.getElementById('navCadeLabel');  if (n) n.textContent = NOME_ASSISTENTE;
}
aplicarNomeAssistente();

navCade.addEventListener('click', () => {
  const texto = gerarTextoCade();
  document.getElementById('cadeBalao').innerHTML = cadeParaHTML(texto);
  renderCarameloCade();
  document.getElementById('cadeShareBtn').style.display = registrosHojeFin().length ? 'inline-flex' : 'none';
  pintarSeloMes();   // o botão do mês e o selo "novo" acendem aqui
  mostrarTela(telaCade);
  navCade.classList.add('ativo');
  talvezTutorial('isaac');
});

// ═══════════════════════════════════════════════════════════════
//  PAINEL DE TURNO AO VIVO
//  tempo rodando + ponto de equilíbrio + anotação rápida de ganhos
// ═══════════════════════════════════════════════════════════════
let tlTimer = null;

function ganhosDoDia() {
  const g = lerLS('ganhosAnotados', {});
  return (g[hojeISO()] || []);
}
function somaGanhosDoDia() { return ganhosDoDia().reduce((s, x) => s + x.v, 0); }

function mostrarTurnoLive() {
  document.getElementById('turnoLive').style.display = 'block';
  atualizarTurnoLive();
  clearInterval(tlTimer);
  tlTimer = setInterval(atualizarTurnoLive, 30000);   // atualiza a cada 30s
}
function esconderTurnoLive() {
  document.getElementById('turnoLive').style.display = 'none';
  clearInterval(tlTimer); tlTimer = null;
}
function atualizarTurnoLive() {
  const ta = lerLS('turnoAtivo', null);
  if (!ta || !ta.inicio) { esconderTurnoLive(); return; }
  const horas = (Date.now() - ta.inicio) / 3600000;
  const h = Math.floor(horas), m = Math.floor((horas - h) * 60);
  document.getElementById('tlTempo').textContent = h + 'h' + String(m).padStart(2, '0');
}


// ═══════════════════════════════════════════════════════════════
//  INTELIGÊNCIA DO "VALE A PENA RODAR?" (por dia da semana)
// ═══════════════════════════════════════════════════════════════
const DIAS_NOME = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const DIA_MASC  = [true,false,false,false,false,false,true];   // domingo e sábado são masculinos
function plDia(dow, nome) { return DIA_MASC[dow] ? 'Seus ' + nome + 's' : 'Suas ' + nome + 's'; }
function inteligenciaDoDia() {
  const hist  = lerLS('historicoFinancas', []);
  const horas = lerLS('horasPorDia', {});
  const porDia = {};
  hist.forEach(r => { if (r.dataISO) porDia[r.dataISO] = (porDia[r.dataISO] || 0) + r.lucro; });
  const amostras = [];
  Object.keys(porDia).forEach(iso => {
    const hrs = horas[iso];
    if (hrs && hrs >= 0.5) {
      const dow = new Date(iso + 'T12:00:00').getDay();
      amostras.push({ dow, ph: porDia[iso] / hrs });
    }
  });
  if (amostras.length < 2) {
    // ⚠️ Antes daqui só saía "faltam dados". A tela então dizia a MESMA frase
    // pra quem nunca registrou nada e pra quem já tinha um dia inteiro feito —
    // esse segundo lia "use o Bora rodar e registre suas receitas" e pensava
    // "mas eu fiz isso ontem". Aviso que ignora o esforço do motorista queima
    // a confiança dele no app. Agora sai QUAL metade está faltando.
    let comReceita = 0, comHoras = 0, curtos = 0;
    Object.keys(porDia).forEach(iso => {
      comReceita++;
      const h = horas[iso];
      if (h != null && h > 0 && h < 0.5) curtos++;
    });
    Object.keys(horas).forEach(iso => { if (horas[iso] >= 0.5) comHoras++; });
    return { suficiente: false, amostras: amostras.length, comReceita, comHoras, curtos };
  }
  const hojeDow  = new Date().getDay();
  const doDia    = amostras.filter(a => a.dow === hojeDow);
  const mediaGeral = amostras.reduce((s, a) => s + a.ph, 0) / amostras.length;
  const mediaDia   = doDia.length ? doDia.reduce((s, a) => s + a.ph, 0) / doDia.length : null;
  return { suficiente: true, hojeDow, mediaGeral, mediaDia, nDia: doDia.length, total: amostras.length };
}
function renderInteligenciaSim() {
  const box = document.getElementById('simIntel');
  const it  = inteligenciaDoDia();
  box.style.display = 'block';
  box.className = 'sim-intel';
  const vd = document.getElementById('simIntelVerdict');
  const tx = document.getElementById('simIntelTexto');
  const nomeHoje = DIAS_NOME[new Date().getDay()];

  if (!it.suficiente) {
    box.classList.add('amarelo');
    // ⚠️ "com uns dias de uso" era vago, e o app SABE o número: são 2 dias
    // completos. Regra do projeto — faltou dado, o app diz quanto falta.
    const artigo = DIA_MASC[new Date().getDay()] ? 'um ' : 'uma ';
    if (it.amostras === 1) {
      vd.innerHTML = dot('amarelo') + ' Falta 1 dia pra eu te responder';
      // ⚠️ o texto antigo prometia "eu te digo se terça vale a pena" só por
      // acumular dias. Não é verdade: pra falar de terça, precisa de uma TERÇA
      // registrada. Prometer o que não entrega é o que o motorista já vê demais.
      tx.innerHTML = 'Você já tem <b>1 dia completo</b>. Com mais um eu começo a comparar — e pra falar ' +
                     'de <b>' + esc(nomeHoje) + '</b> mesmo, preciso de pelo menos ' + artigo + esc(nomeHoje) + ' registrada.';
    } else if (it.curtos > 0) {
      vd.innerHTML = dot('amarelo') + ' Seus dias estão curtos demais';
      tx.innerHTML = 'Dia com menos de <b>30 minutos</b> de "Bora rodar" não entra na conta — ' +
                     'em tão pouco tempo o valor da hora sai distorcido.';
    } else if (it.comHoras > 0 && it.comReceita === 0) {
      vd.innerHTML = dot('amarelo') + ' Falta registrar a receita';
      tx.innerHTML = 'Você está marcando as horas com o "Bora rodar", mas ainda não lançou a receita ' +
                     '(aba Finanças). Sem as duas metades eu não sei quanto vale a sua hora.';
    } else if (it.comReceita > 0 && it.comHoras === 0) {
      vd.innerHTML = dot('amarelo') + ' Falta marcar suas horas';
      tx.innerHTML = 'Você está lançando a receita, mas ainda não usou o <b>"Bora rodar"</b> ' +
                     '— sem saber quantas horas você rodou, eu não tenho como calcular o valor da sua hora.';
    } else {
      vd.innerHTML = dot('amarelo') + ' Ainda não tenho nenhum dia completo';
      tx.innerHTML = 'Um dia conta quando você usa o <b>"Bora rodar"</b> (marca as horas) <b>e</b> ' +
                     'registra a receita no fim. Com <b>2 desses</b> eu já começo a comparar.';
    }
    return;
  }
  if (it.mediaDia === null) {
    box.classList.add('amarelo');
    vd.innerHTML = dot('amarelo') + ' Sem histórico de ' + esc(nomeHoje) + ' ainda';
    tx.innerHTML = 'Sua média geral é <b>' + fmtBRL0(it.mediaGeral) + '/hora</b> (' + it.total + ' dias). Ainda não tenho ' + nomeHoje + 's registradas pra comparar — roda hoje que eu aprendo!';
    return;
  }
  const razao = it.mediaDia / it.mediaGeral;
  const N = nomeHoje.charAt(0).toUpperCase() + nomeHoje.slice(1);
  if (razao >= 1.05) {
    box.classList.add('verde');
    vd.innerHTML = dot('verde') + ' ' + esc(N) + ' costuma ser boa pra você!';
    tx.innerHTML = plDia(it.hojeDow, nomeHoje) + ' rendem <b>' + fmtBRL0(it.mediaDia) + '/hora</b>, acima da sua média geral de ' + fmtBRL0(it.mediaGeral) + '/h. Bora aproveitar!';
  } else if (razao >= 0.85) {
    box.classList.add('amarelo');
    vd.innerHTML = dot('amarelo') + ' ' + esc(N) + ' é mediana pra você';
    tx.innerHTML = plDia(it.hojeDow, nomeHoje) + ' rendem <b>' + fmtBRL0(it.mediaDia) + '/hora</b>, perto da sua média de ' + fmtBRL0(it.mediaGeral) + '/h. Vale rodar, sem esperar milagre.';
  } else {
    box.classList.add('vermelho');
    vd.innerHTML = dot('vermelho') + ' ' + esc(N) + ' costuma render menos';
    tx.innerHTML = plDia(it.hojeDow, nomeHoje) + ' rendem <b>' + fmtBRL0(it.mediaDia) + '/hora</b>, abaixo da sua média de ' + fmtBRL0(it.mediaGeral) + '/h. Se rodar, ajusta a expectativa.';
  }
}

// ─── SIMULADOR ───────────────────────────────────────────────
document.querySelector('#btnAbrirSimulador').addEventListener('click', function() {
  document.getElementById('inputHoras').value = '';
  document.getElementById('inputMeta').value  = '';
  document.getElementById('simResultado').style.display = 'none';
  renderInteligenciaSim();   // veredito por dia da semana, com seu histórico
  document.getElementById('modalSimulador').style.display = 'flex';
});
document.querySelector('#btnFecharSim').addEventListener('click', () => { document.getElementById('modalSimulador').style.display = 'none'; });
function calcSimulador() {
  const horas = numBR(document.getElementById('inputHoras').value);
  const meta  = numBR(document.getElementById('inputMeta').value);
  if (!horas || !meta || horas <= 0 || meta <= 0) { document.getElementById('simResultado').style.display = 'none'; return; }
  const perfil  = getPerfil();
  const taxa    = ((perfil.taxa != null && perfil.taxa > 0) ? perfil.taxa : 0) / 100;   // sem taxa configurada = não inventa
  const veiculo = tipoVeiculoAtivo();
  const consumo = veiculo === 'carro' ? 12 : 35;
  // Preço por litro é do POSTO, não do veículo: gasolina custa o mesmo pra
  // moto e pra carro. Filtrar por veículo aqui fazia o app CHUTAR um preço
  // tendo o preço real dele guardado no histórico. Lê tudo, de propósito.
  const histComb  = lerLS('historicoAbastecimentos', []);
  const comLitros = histComb.filter(r => r.ppl);
  const precoComb = comLitros.length > 0 ? numBR(comLitros[0].ppl) : 6.50;
  const histFin   = lerLS('historicoFinancas', []);
  let kmPorHora = veiculo === 'carro' ? 20 : 25;
  // km/dia REAIS deste veículo (antes isso lia o odômetro achando que era km do dia)
  const mapaKm = lerLS('kmPorDia', {});
  const vidS   = vidAtivo();
  // ⚠️ `(r.dias || 1) === 1`: registro que cobre vários dias (o motorista ficou
  // sem fechar) não entra em média POR DIA — dividir seria inventar como aquele
  // km se reparte entre os dias, e o app não sabe.
  const diasKm = Object.keys(mapaKm).sort().reverse().slice(0, 5)
                   .map(k => mapaKm[k])
                   .filter(r => r && r.km > 0 && (r.dias || 1) === 1 && (!vidS || r.vid === vidS));
  if (diasKm.length > 0) {
    const media = diasKm.reduce((s, r) => s + r.km, 0) / diasKm.length;
    kmPorHora = Math.max(10, Math.min(50, Math.round(media / 8)));
  }
  const kmEst    = kmPorHora * horas;
  const litros   = kmEst / consumo;
  const combEst  = litros * precoComb;
  const receita  = (meta + combEst) / (1 - taxa);
  const phNecessario = meta / horas;   // quanto precisa render por hora pra bater a meta

  // ── R$/h REAL do histórico (lucro ÷ horas dos dias com turno marcado) ──
  const horasReg = lerLS('horasPorDia', {});
  const porDiaSim = {};
  histFin.forEach(r => { if (r.dataISO) porDiaSim[r.dataISO] = (porDiaSim[r.dataISO] || 0) + r.lucro; });
  const phAmostras = [];
  Object.keys(porDiaSim).forEach(iso => {
    const h = horasReg[iso];
    if (h && h >= 0.5) phAmostras.push(porDiaSim[iso] / h);
  });
  const temRitmo = phAmostras.length >= 2;
  const phReal   = temRitmo ? phAmostras.reduce((s, v) => s + v, 0) / phAmostras.length : null;

  let aviso = '';
  if (comLitros.length > 1) {
    const media = comLitros.slice(1,5).reduce((s,x)=>s+numBR(x.ppl),0) / Math.min(comLitros.length-1,4);
    const diff  = precoComb - media;
    if (diff > 0.1) aviso = `${ico('alerta')} Combustível ${fmtBRL(diff)}/L acima da média. Impacto: ${fmtBRL((diff*litros))} no lucro.`;
  }

  // ── VEREDITO: compara a meta com o SEU ritmo real (nada de régua inventada) ──
  const vd = document.getElementById('simVerdict');
  let linhaRitmo = '';
  if (temRitmo) {
    const razao = phNecessario / phReal;
    if (razao <= 1.0)      { vd.innerHTML = dot('verde') + ' Meta tranquila pro seu ritmo';  vd.style.color = 'var(--money)'; }
    else if (razao <= 1.3) { vd.innerHTML = dot('amarelo') + ' Meta puxada, mas possível';     vd.style.color = 'var(--signal)'; }
    else                   { vd.innerHTML = dot('vermelho') + ' Meta pesada pra esse tempo';    vd.style.color = 'var(--danger)'; }
    const rende = phReal * horas;
    linhaRitmo = `
    <div class="sim-linha"><span class="ajuda-clic" onclick="abrirAjudaCard('ritmo')">${ico('grafico')} Seu ritmo real <span class="int">ⓘ</span></span><span>${fmtBRL0(phReal)}/h (${phAmostras.length} dias)</span></div>
    <div class="sim-linha"><span>${ico('alvo')} No seu ritmo, ${horas}h rendem</span><span style="color:${rende >= meta ? 'var(--money)' : 'var(--signal)'}">~${fmtBRL0(rende)}</span></div>`;
  } else {
    // ⚠️ Aqui saía um SEGUNDO aviso amarelo ("Ainda aprendendo seu ritmo") logo
    // abaixo do aviso amarelo do topo, que já explica exatamente isso — e a
    // linha "Seu ritmo real: use o Bora rodar + registre receitas" repetia pela
    // TERCEIRA vez a mesma instrução, espremida em duas linhas quebradas.
    // Falar três vezes não convence mais; só faz o motorista parar de ler.
    // Sem ritmo, este bloco entrega só o que ele veio buscar: quanto precisa
    // render. O porquê da falta fica no aviso de cima, uma vez só.
    vd.style.display = 'none';
    linhaRitmo = '';
  }
  if (temRitmo) vd.style.display = '';

  document.getElementById('simLinhas').innerHTML = `
    <div class="sim-linha sim-linha-forte"><span>${ico('relogio')} Precisa render</span><span>${fmtBRL(phNecessario)}/h</span></div>${linhaRitmo}
    <details class="sim-detalhes">
      <summary>ver a conta completa ›</summary>
      <div class="sim-linha"><span>${ico('dinheiro')} Receita bruta necessária</span><span>${fmtBRL(receita)}</span></div>
      <div class="sim-linha"><span>${ico('bomba')} Combustível estimado</span><span>~${fmtBRL0(combEst)} · ${kmEst} km</span></div>
      <div class="sim-linha"><span>${ico('bomba')} Litro a</span><span>${fmtBRL(precoComb)}${comLitros.length > 0 ? ' · seu último posto' : ' · média (registre um abastecimento)'}</span></div>
    </details>`;
  const avisoEl = document.getElementById('simAviso');
  if (aviso) { avisoEl.textContent = aviso; avisoEl.style.display = 'block'; } else { avisoEl.style.display = 'none'; }
  document.getElementById('simResultado').style.display = 'block';
}

// ═══════════════════════════════════════════════════════════════
// ─── CADÊ — CONSULTORA POR VOZ ───────────────────────────────
// ═══════════════════════════════════════════════════════════════
function valorParaFala(valor) {
  const v = Math.round(numBR(valor) * 100) / 100;
  if (isNaN(v) || v === 0) return 'zero reais';
  const inteiro  = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  const unidades = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove',
                    'dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dezenas  = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos',
                    'seiscentos','setecentos','oitocentos','novecentos'];
  function porExtenso(n) {
    if (n === 0)   return 'zero';
    if (n === 100) return 'cem';
    let partes = [];
    if (n >= 1000) { const mil = Math.floor(n/1000); partes.push(mil===1?'mil':porExtenso(mil)+' mil'); n = n%1000; }
    if (n >= 100)  { partes.push(centenas[Math.floor(n/100)]); n = n%100; }
    if (n >= 20)   { partes.push(dezenas[Math.floor(n/10)]); n = n%10; }
    if (n > 0)     partes.push(unidades[n]);
    return partes.join(' e ');
  }
  let resultado = porExtenso(inteiro) + (inteiro === 1 ? ' real' : ' reais');
  if (centavos > 0) resultado += ' e ' + porExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return resultado;
}
function limparParaVoz(texto) {
  return texto
    .replace(/[🤖🔥👍💪🚀📊🏆⛽🤙👋🏍️🚗💨😄✅⚠️📍💰🎙️⏹️🎯🏁]/gu, '')
    .replace(/R\$\s*/g, '')
    .replace(/\//g, ' por ')
    .replace(/([0-9]),([0-9])/g, '$1 vírgula $2')
    .replace(/\s+/g, ' ').trim();
}
// ── MARCADORES DO TEXTO DO ISAC ──────────────────────────────
//  [[v:x]] verde · [[r:x]] vermelho · [[a:x]] âmbar
//  [[m:cor|curto|falado]] = mesma informação com DUAS caras:
//     na tela lê "R$ 240", no ouvido fala "duzentos e quarenta reais".
const _COR_MARC = { v:'var(--money)', r:'var(--danger)', a:'var(--signal)', n:'var(--text)' };

// versão pra LER na tela
function cadeParaHTML(t) {
  return t
    .replace(/\n/g, '<br>')                                              // parágrafo na tela
    .replace(/\[\[m:([vran])\|(.+?)\|(.+?)\]\]/g,
             (_, c, curto) => `<b style="color:${_COR_MARC[c]}">${curto}</b>`)
    .replace(/\[\[v:(.+?)\]\]/g, '<b style="color:var(--money)">$1</b>')   // verde = bom
    .replace(/\[\[r:(.+?)\]\]/g, '<b style="color:var(--danger)">$1</b>')  // vermelho = alerta
    .replace(/\[\[a:(.+?)\]\]/g, '<b style="color:var(--signal)">$1</b>'); // âmbar = atenção
}
// versão pra FALAR (pega o "falado" do marcador duplo e joga o resto fora)
function cadeParaVoz(t) {
  return t
    .replace(/\[\[m:([vran])\|(.+?)\|(.+?)\]\]/g, '$3')
    .replace(/\[\[[vra]:(.+?)\]\]/g, '$1');
}

// ─── HELPERS DO TEXTO DO ISAC ────────────────────────────────
// R$ 240 na tela · "duzentos e quarenta reais" no ouvido
function _fmtReal(n) {
  const v = Math.abs(numBR(n));
  const centavos = Math.round(v * 100) % 100;
  // com ponto de milhar: R$ 4.598, não R$ 4598
  return 'R$ ' + (centavos === 0
    ? Math.round(v).toLocaleString('pt-BR')
    : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
}
// M(valor, cor) → marcador de dinheiro com as duas caras
function M(valor, cor) {
  return `[[m:${cor || 'n'}|${_fmtReal(valor)}|${valorParaFala(Math.abs(numBR(valor)))}]]`;
}
// D(curto, falado, cor) → mesma ideia, pra km/horas/porcentagem
function D(curto, falado, cor) { return `[[m:${cor || 'n'}|${curto}|${falado}]]`; }

// 2.5 → "2h30" na tela, "2 horas e 30 minutos" no ouvido
function _horasDuplo(h) {
  const H = Math.floor(h), Mi = Math.round((h - H) * 60);
  if (H === 0) return D(Mi + 'min', Mi + ' minutos');
  const curto  = H + 'h' + (Mi ? String(Mi).padStart(2, '0') : '');
  const falado = H + (H === 1 ? ' hora' : ' horas') + (Mi ? ' e ' + Mi + ' minutos' : '');
  return D(curto, falado);
}
// "hoje vs. o normal dele" — mesma régua do card das Finanças (5+ dias, senão cala)
function compHojeVsNormal() {
  const hist = lerLS('historicoFinancas', []);
  const porDia = {};
  hist.forEach(r => { if (r.dataISO) porDia[r.dataISO] = (porDia[r.dataISO] || 0) + r.lucro; });
  const iso = hojeISO();
  const anteriores = Object.keys(porDia).sort().reverse().filter(k => k !== iso).slice(0, 30);
  if (anteriores.length < 5 || porDia[iso] === undefined) return null;
  const media = anteriores.reduce((t, k) => t + porDia[k], 0) / anteriores.length;
  return { hoje: porDia[iso], media, diff: porDia[iso] - media, n: anteriores.length };
}
// preço do último litro contra a média DELE, no mesmo tipo de combustível
function precoContraSuaMedia() {
  const hist = lerLS('historicoAbastecimentos', []).filter(a => a.ppl);
  if (!hist.length) return null;
  const ult = hist[0];
  // ⚠️ Era `hist.slice(1).filter(...)` — o histórico INTEIRO. É exatamente o
  // bug que a v3.41 tirou do selinho e que voltou a existir aqui: gasolina de
  // seis meses atrás puxa a média pra baixo e todo abastecimento de hoje vira
  // "acima da sua média". Pior, as duas coisas apareciam na MESMA tela dizendo
  // o contrário uma da outra. Mesma régua dos outros dois lugares: os 4 anteriores.
  const mesmos = hist.slice(1).filter(a => a.tipo === ult.tipo).slice(0, 4);
  if (mesmos.length < 3) return { ppl: numBR(ult.ppl), tipo: ult.tipo, media: null };
  const media = mesmos.reduce((t, a) => t + numBR(a.ppl), 0) / mesmos.length;
  return { ppl: numBR(ult.ppl), tipo: ult.tipo, media, n: mesmos.length, posto: ult.posto };
}
const _DIA_PLURAL = ['domingos','segundas','terças','quartas','quintas','sextas','sábados'];
const _DIA_ARTIGO = ['Seus','Suas','Suas','Suas','Suas','Suas','Seus'];

// ═══════════════════════════════════════════════════════════════
//  O TEXTO DO ISAC
//  Tom: técnico e do povo ao mesmo tempo. Número exato, palavra
//  simples. Sem gracinha, sem exclamação, sem elogio vazio.
//  Ele NUNCA julga com número inventado — compara com o histórico
//  do motorista. Sem histórico, ele informa e cala a boca.
//  A última frase é sempre o detalhe específico que prova atenção.
// ═══════════════════════════════════════════════════════════════
function gerarTextoCade() {
  const perfil = getPerfil();
  const nome   = esc(perfil.nome ? perfil.nome.split(' ')[0] : 'parceiro');
  const hora   = new Date().getHours();
  const saud   = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const regs        = registrosHojeFin();
  const lucroHoje   = regs.reduce((t, r) => t + r.lucro,   0);
  const receitaHoje = regs.reduce((t, r) => t + r.receita, 0);
  const combHoje    = regs.reduce((t, r) => t + r.comb,    0);
  const taxaHoje    = regs.reduce((t, r) => t + r.taxa,    0);
  const kmHoje      = kmRodadoHoje();
  const horas       = horasHojeVal();

  const V = x => `[[v:${x}]]`, R = x => `[[r:${x}]]`, A = x => `[[a:${x}]]`;

  // domingo → o fechamento abre com o balanço da semana
  const ehDomingo = new Date().getDay() === 0;
  const retro = ehDomingo ? textoRetrospectoSemana() : '';

  // apresentação: nas 3 primeiras aberturas da aba, em parágrafo próprio
  //   quer que apareça mais/menos vezes? troque o 3 aqui embaixo.
  let abertura = '';
  const jaViu = Number(lerLS('isacApresentacoes', 0)) || 0;
  if (jaViu < 3) {
    salvarLS('isacApresentacoes', jaViu + 1);
    abertura = `Prazer, ${nome}. Eu sou ${ARTIGO_ASSISTENTE} ${A(NOME_ASSISTENTE)}, seu analista de números de bolso. Meu trabalho é fechar sua conta todo dia e te mostrar a verdade dela, sem enfeite.\n\n`;
  }

  // ── sem receita registrada: não tem o que analisar, e ele diz isso ──
  if (regs.length === 0) {
    const corpo = `O dia ainda tá zerado aqui. Registra quanto entrou que eu fecho a conta contigo.`;
    if (retro) return abertura + retro + corpo;
    return abertura ? abertura + corpo : `${saud}, ${nome}. ` + corpo;
  }

  const p = [];
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  p.push(`\uD83D\uDCCA FECHAMENTO DE HOJE \u00B7 ${dataHoje}\n`);

  // ── 1. o número que importa, em destaque (recorde toma o lugar quando bate) ──
  const _rec = recordeHoje();
  if (_rec)                p.push(`\uD83C\uDFC6 ${M(lucroHoje, 'v')} \u2014 o seu melhor dia até agora! Superou o recorde anterior de ${M(_rec.melhorAnt)}.\n`);
  else if (lucroHoje >= 0) p.push(`Voc\u00ea fechou com ${M(lucroHoje, 'v')} l\u00edquido no bolso.\n`);
  else                     p.push(`Hoje fechou ${R('no vermelho')}: ${M(lucroHoje, 'r')} a menos do que entrou.\n`);

  // ── 2. a conta aberta, sem mistério ──
  if (taxaHoje > 0 && combHoje > 0)  p.push(`Entrou ${M(receitaHoje)}. Saiu ${M(taxaHoje)} de taxa e ${M(combHoje)} de combustível.`);
  else if (taxaHoje > 0)             p.push(`Entrou ${M(receitaHoje)}, menos ${M(taxaHoje)} de taxa.`);
  else if (combHoje > 0)             p.push(`Entrou ${M(receitaHoje)}, menos ${M(combHoje)} de combustível.`);
  else                               p.push(`Entrou ${M(receitaHoje)}, sem desconto nenhum.`);

  // ── 3. o preço do seu tempo ──
  const intel = inteligenciaDoDia();
  if (horas >= 0.5) {
    const ph = lucroHoje / horas;
    if (ph >= 0) p.push(`${M(ph, 'v')} por hora, em ${_horasDuplo(horas)} rodando.`);
    else         p.push(`Deu ${M(ph, 'r')} de prejuízo por hora, em ${_horasDuplo(horas)} rodando.`);
    // só julga se tiver a média DELE pra comparar
    if (intel.suficiente && intel.mediaGeral > 0 && intel.total >= 3) {
      const dif = ph - intel.mediaGeral;
      const pct = Math.abs(dif / intel.mediaGeral * 100);
      if (pct >= 10) {
        const sinal = dif > 0 ? 'acima' : 'abaixo';
        p.push(`${D(pct.toFixed(0) + '%', pct.toFixed(0) + ' por cento', dif > 0 ? 'v' : 'a')} ${sinal} da sua média de ${M(intel.mediaGeral)} por hora.`);
      } else {
        p.push(`Dentro da sua média, que é ${M(intel.mediaGeral)} por hora.`);
      }
    }
  }

  // ── 4. o carro/moto: quanto custou cada km ──
  if (kmHoje > 0) {
    let f = `${D(kmHoje + ' km', kmHoje + ' quilômetros')} rodados`;
    if (combHoje > 0) f += `, a ${M(combHoje / kmHoje)} de combustível por km`;
    p.push(f + '.');
  }

  // ── 5. o posto: contra o preço que ELE costuma pagar ──
  const pc = precoContraSuaMedia();
  if (pc) {
    p.push(`Último litro de ${String(pc.tipo || '').toLowerCase() || 'combustível'}: ${M(pc.ppl)}.`);
    if (pc.media) {
      const dif = pc.ppl - pc.media;
      const pct = Math.abs(dif / pc.media * 100);
      if (pct >= 4) {
        const sinal = dif > 0 ? 'acima' : 'abaixo';
        p.push(`${D(pct.toFixed(0) + '%', pct.toFixed(0) + ' por cento', dif > 0 ? 'a' : 'v')} ${sinal} da sua média de ${M(pc.media)}${pc.posto ? ' — esse foi no ' + esc(pc.posto) : ''}.`);
      }
    }
  }

  // ── 6. o mês, se der pra dizer sem chutar ──
  const proj = projecaoMensal();
  if (proj && proj.suficiente) p.push(`No ritmo do mês, fecha em ${M(proj.projecao, 'v')}.`);

  // ── 7. a última frase: o detalhe específico que prova atenção ──
  const cmp = compHojeVsNormal();
  if (intel.suficiente && intel.mediaDia !== null && intel.nDia >= 2 && intel.mediaGeral > 0) {
    const d = intel.hojeDow;
    const dif = intel.mediaDia - intel.mediaGeral;
    const rel = Math.abs(dif / intel.mediaGeral) < 0.1
      ? `rendem o mesmo que os outros dias`
      : `rendem ${M(intel.mediaDia, dif > 0 ? 'v' : 'a')} por hora, ${dif > 0 ? 'acima' : 'abaixo'} da sua média de ${M(intel.mediaGeral)}`;
    p.push(`${_DIA_ARTIGO[d]} ${_DIA_PLURAL[d]} ${rel}.`);
  } else if (cmp && Math.abs(cmp.diff) >= cmp.media * 0.08) {
    p.push(`${M(Math.abs(cmp.diff), cmp.diff > 0 ? 'v' : 'a')} ${cmp.diff > 0 ? 'acima' : 'abaixo'} do seu normal, que é ${M(cmp.media)} por dia nos últimos ${D(cmp.n + ' dias', cmp.n + ' dias')} que você rodou.`);
  } else {
    const _histF = lerLS('historicoFinancas', []);
    const _diasReceita = new Set(_histF.filter(r => r.dataISO).map(r => r.dataISO)).size;
    const _horasMap = lerLS('horasPorDia', {});
    const _diasComHora = Object.keys(_horasMap).filter(k => (_horasMap[k] || 0) >= 0.5).length;
    if (cmp) {
      // já tem base, mas hoje ficou perto da média — diz isso, não "ainda tô juntando"
      p.push(`Hoje você ficou dentro do seu normal de ${M(cmp.media)} por dia.`);
    } else {
      const _faltam = Math.max(1, 6 - _diasReceita);
      const _dTxt = _faltam === 1 ? 'Falta 1 dia' : 'Faltam ' + _faltam + ' dias';
      if (_diasComHora < 2) {
        p.push(`${_dTxt} para eu saber o seu normal. Marque o início e o fim do seu dia e eu já mostro quanto vale a sua hora.`);
      } else {
        p.push(`${_dTxt} para eu saber o que é normal para você.`);
      }
    }
  }

  if (intel.suficiente && intel.total >= 3) {
    p.push(`\n\uD83D\uDD0D AN\u00c1LISE COPILOTO \u00B7 a lupa no seu m\u00eas\n` +
           `Cruzei seus \u00faltimos dias e achei ${A('padr\u00f5es')} que o fechamento de hoje n\u00e3o mostra \u2014 tipo qual dia da semana te paga melhor e quanto o posto errado te custa no m\u00eas.\n` +
           `\uD83D\uDD12 ${A('Isso \u00e9 da vers\u00e3o Copiloto.')} Destrava e eu te mostro onde tem dinheiro escondido no seu pr\u00f3prio hist\u00f3rico.`);
  }

  return abertura + retro + p.join(' ');
}


// ═══════════════════════════════════════════════════════════════
//  INTEGRAÇÃO PATENTES: render + celebração + manual + hooks
// ═══════════════════════════════════════════════════════════════
function renderPatCard() {
  const pill = document.getElementById('patPill'); if (!pill) return;
  const at = patenteAtual();
  document.getElementById('patPillPedra').innerHTML = svgPedra(at.corA, at.corB, 16);
  document.getElementById('patPillNome').textContent = at.nome;
}

function abrirModalPatente() {
  const at = patenteAtual();
  const prox = proximaPatente();
  document.getElementById('modPatNivel').textContent = 'NÍVEL ' + at.nivel + ' · PATENTE ' + at.i + ' DE 15';
  document.getElementById('modPatNome').textContent = at.nome;
  document.getElementById('modPatPedraNome').textContent = 'PEDRA: ' + at.pedra.toUpperCase();
  document.getElementById('modPatPedra').innerHTML = svgPedra(at.corA, at.corB, 26);
  // o Caramelo na fase de hoje — é a "casa" dele
  const fase = faseAtualDoCaramelo();
  document.getElementById('modPatCaramelo').innerHTML = svgCaramelo(fase, 'normal', 148);
  document.getElementById('modPatFase').textContent =
    NOME_FASE[fase] + ' · fase ' + (ORDEM_FASES.indexOf(fase) + 1) + ' de 5';
  const pct = Math.round(progressoAtePro() * 100);
  document.getElementById('modPatBarra').style.width = pct + '%';
  document.getElementById('modPatProx').textContent = prox
    ? 'próxima: ' + prox.nome + ' (' + prox.pedra + ') · ' + pct + '%'
    : '🏆 você é lenda máxima!';
  const conq = pedrasConquistadas().map(p => p.i);
  document.getElementById('modPatColecao').innerHTML =
    PATENTES.map(p => conq.includes(p.i) ? svgPedra(p.corA, p.corB, 22) : svgPedraCinza(22)).join('');
  document.getElementById('modalPatente').style.display = 'flex';
}
document.getElementById('btnFecharModPat').addEventListener('click', () => { document.getElementById('modalPatente').style.display = 'none'; });
document.getElementById('btnVerManual').addEventListener('click', () => { document.getElementById('modalPatente').style.display = 'none'; abrirManualPatentes(); });

function celebrarPatente(pat) {
  document.getElementById('celebraPedra').innerHTML = svgPedra(pat.corA, pat.corB, 74);
  document.getElementById('celebraNome').textContent = pat.nome;
  document.getElementById('celebraPedraNome').textContent = 'PEDRA: ' + pat.pedra.toUpperCase();

  // o lobo cresceu? (só acontece a cada 3 patentes: 1→4→7→10→13)
  const faseNova  = faseDaPatente(pat.i);
  const faseVelha = pat.i > 1 ? faseDaPatente(pat.i - 1) : faseNova;
  const cresceu   = faseNova !== faseVelha;

  const palco = document.getElementById('celebraCaramelo');
  const aviso = document.getElementById('celebraCresceu');
  if (palco) {
    palco.innerHTML = svgCaramelo(faseNova, 'feliz', cresceu ? 132 : 104);
    palco.className = 'crm-celebra-palco ' + (cresceu ? 'crm-festa cresceu' : 'crm-vivo');
  }
  if (aviso) {
    if (cresceu) {
      aviso.innerHTML = '🎉 O ' + NOME_ASSISTENTE + ' virou <b>' + NOME_FASE[faseNova] + '</b>' + (GANHOU_NA_FASE[faseNova] ? ' — ganhou ' + GANHOU_NA_FASE[faseNova] : '');
      aviso.style.display = 'block';
    } else {
      aviso.style.display = 'none';
    }
  }
  document.getElementById('celebraTitulo').textContent = cresceu ? '🎉 Seu parceiro cresceu!' : '🎉 Nova patente desbloqueada!';

  const rec = document.getElementById('celebraRecompensa');
  if (pat.recompensa) { rec.innerHTML = '<b>Recompensa desbloqueada</b>' + pat.recompensa; rec.style.display = 'block'; }
  else                { rec.style.display = 'none'; }
  document.getElementById('modalCelebra').style.display = 'flex';
}
document.getElementById('btnCelebraFechar').addEventListener('click', () => {
  document.getElementById('modalCelebra').style.display = 'none';
  renderPatCard();
});

// abre o manual (todas as 15 com o que já foi conquistado)
function abrirManualPatentes() {
  const at = patenteAtual();
  const conq = pedrasConquistadas().map(p => p.i);
  const html = PATENTES.map(p => {
    const feito   = conq.includes(p.i);
    const ehAtual = feito && p.i === at.i;
    const cls     = feito ? (ehAtual ? 'atual' : 'feita') : 'locked';
    return `<div class="manual-item ${cls}">
      ${feito ? svgPedra(p.corA, p.corB, 34) : svgPedraCinza(34)}
      <div class="manual-txt">
        <div class="manual-nome">${p.i}. ${p.nome}</div>
        <div class="manual-pedra">${p.pedra}${p.recompensa ? ' · 🎁 recompensa' : ''}</div>
      </div>
      ${ehAtual ? '<span class="manual-tag-atual">você está aqui</span>' : ''}
    </div>`;
  }).join('');
  document.getElementById('manualLista').innerHTML = html;
  document.getElementById('modalManualPat').style.display = 'flex';
}
document.getElementById('btnFecharManual').addEventListener('click', () => {
  document.getElementById('modalManualPat').style.display = 'none';
});

// ─── HOOK: chama após cada ação útil, celebra se subiu ─────────
function ptsHook(motivo, dedup) {
  const r = ganharPontos(motivo, dedup);
  renderPatCard();
  if (r.subiu) setTimeout(() => celebrarPatente(r.novaPatente), 400);   // dá tempo do toast do salvar
}

// intercepta as funções existentes envolvendo as ações que dão pontos
(function () {
  const origSalvarAb = window.salvarAbastecimento;
  if (origSalvarAb) window.salvarAbastecimento = function () {
    const r = origSalvarAb.apply(this, arguments);
    ptsHook('abastecimento', 'ab:' + hojeISO());   // 1 ponto por dia
    return r;
  };
})();
// ─── Caramelo: pausa a animação quando o app sai da frente ─────
// (as telas já pausam sozinhas via display:none na mostrarTela;
//  isto cobre o caso da tela do celular apagar / trocar de app)
document.addEventListener('visibilitychange', () => {
  const parado = document.hidden;
  document.querySelectorAll('.crm-vivo, .crm-festa').forEach(el => {
    el.style.animationPlayState = parado ? 'paused' : '';
    el.querySelectorAll('*').forEach(f => { f.style.animationPlayState = parado ? 'paused' : ''; });
  });
});
/* ═══════════════════════════════════════════════════════════════
   v2.3 · COMPARTILHAR FECHAMENTO
   Lê do MESMO lugar que o balão do Isaac — nunca recalcula, nunca inventa.
   ═══════════════════════════════════════════════════════════════ */
let _shareLegenda = '';

function dadosFechamentoHoje() {
  const regs = registrosHojeFin();
  if (!regs.length) return null;                 // sem receita = sem fechamento
  const lucro = regs.reduce((t, r) => t + r.lucro, 0);
  const horas = horasHojeVal();
  const km    = kmRodadoHoje();                  // pode vir null (cadeia de km)
  const ph    = horas >= 0.5 ? lucro / horas : null;
  return { lucro, horas, km, ph };
}

function _horasCurto(h) {
  if (!h || h <= 0) return null;
  const H = Math.floor(h), m = Math.round((h - H) * 60);
  if (m === 60) return (H + 1) + 'h';
  return m ? (H + 'h' + String(m).padStart(2, '0')) : (H + 'h');
}

// ═══════════════════════════════════════════════════════════════
//  ISAAC E O VEÍCULO DENTRO DO CARD DE COMPARTILHAR
// ═══════════════════════════════════════════════════════════════
// O card vai pro grupo de WhatsApp — é a única propaganda do app que não
// custa nada. Número sozinho qualquer planilha manda; o que faz o motorista
// perguntar "que app é esse?" é o personagem.
//
// ⚠️ O SVG do Isaac usa var(--coat), var(--nose)... Num data: URL ele sai do
// DOM, as variáveis não resolvem e o lobo sai PRETO. Por isso as cores são
// trocadas pelos valores reais antes de virar imagem — lidas do :root em
// tempo de execução, então se a paleta mudar o card acompanha sozinho.
function _svgCoresResolvidas(svg) {
  const raiz = getComputedStyle(document.documentElement);
  return svg.replace(/var\(--([a-z0-9-]+)\)/gi, function (m, nome) {
    return (raiz.getPropertyValue('--' + nome) || '').trim() || '#888';
  });
}
function _svgParaImagem(svg) {
  // encodeURIComponent e não btoa: o SVG tem acento e emoji, e o btoa quebra neles
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return new Promise(function (res) {
    const img = new Image();
    img.onload  = function () { res(img); };
    img.onerror = function () { res(null); };   // sem imagem o card sai só com os números
    img.src = url;
  });
}
function imagemDoIsaac(tamanho) {
  return _svgParaImagem(_svgCoresResolvidas(
    svgCaramelo(faseAtualDoCaramelo(), 'feliz', tamanho, false)));
}
// ⚠️ O desenho do veículo vem do MESMO sprite que o app inteiro usa. Redesenhar
// aqui criaria um segundo conjunto de ícones — que é exatamente o erro que a
// v3.62 encontrou (galão de óleo no Início, gota na Manutenção).
function imagemDoVeiculo(tamanho, cor) {
  const sym = document.getElementById(tipoVeiculoAtivo() === 'carro' ? 'i-carro' : 'i-moto');
  if (!sym) return Promise.resolve(null);
  return _svgParaImagem(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + tamanho +
    '" height="' + tamanho + '" fill="none" stroke="' + cor +
    '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + sym.innerHTML + '</svg>');
}
// O par completo: o veículo dele grande e apagado no fundo, o Isaac na frente.
// Motorista de moto vê uma moto; de carro, um carro.
async function desenharIsaacComVeiculo(ctx, xDir, yBase, alturaIsaac) {
  const veic = await imagemDoVeiculo(alturaIsaac * 1.35, '#26313D');
  if (veic) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(veic, xDir - veic.width * 0.9, yBase - veic.height * 0.88);
    ctx.globalAlpha = 1;
  }
  const isaac = await imagemDoIsaac(alturaIsaac);
  if (isaac) {
    const w = isaac.width || alturaIsaac, h = isaac.height || alturaIsaac;
    ctx.drawImage(isaac, xDir - w, yBase - h);
  }
}

function _statCard(ctx, x, y, valor, rotulo) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#F2F6FA'; ctx.font = '700 66px Sora, sans-serif';
  ctx.fillText(valor, x, y);
  ctx.fillStyle = '#93A1B0'; ctx.font = '400 34px Inter, sans-serif';
  ctx.fillText(rotulo, x, y + 82);
}

async function desenharCardFechamento(mostrarValor) {
  const d = dadosFechamentoHoje();
  const canvas = document.getElementById('shareCanvas');
  if (!d || !canvas) return;
  const W = 1080, H = 1080, cx = 110;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0B0F14'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1C242E'; ctx.lineWidth = 2; ctx.strokeRect(44, 44, W - 88, H - 88);

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#00E08A'; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(cx + 24, 168, 26, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  ctx.strokeStyle = '#F2F6FA'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(cx + 24, 168); ctx.lineTo(cx + 42, 150); ctx.stroke();
  ctx.fillStyle = '#93A1B0'; ctx.font = '700 32px Sora, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText('C O P I L O T O', cx + 72, 168);

  // data do dia (canto superior direito) — dá credibilidade: "foi hoje"
  ctx.textAlign = 'right';
  ctx.fillStyle = '#5C6B7A'; ctx.font = '400 30px Inter, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }), W - 110, 168);
  ctx.textAlign = 'left';

  // fitinha do recorde — só quando bate o melhor dia
  if (recordeHoje()) {
    ctx.font = '800 30px Inter, sans-serif';
    const txt = '🏆 MEU MELHOR DIA';
    const pw = ctx.measureText(txt).width + 56, ph = 56, px = cx, py = 232;
    ctx.fillStyle = '#00E08A';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, 28); else ctx.rect(px, py, pw, ph);
    ctx.fill();
    ctx.fillStyle = '#04120c'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(txt, px + 28, py + ph / 2 + 1);
  }

  const hstr = _horasCurto(d.horas);
  let legenda;

  if (mostrarValor) {
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('Fechei o dia de hoje', cx, 320);
    ctx.fillStyle = d.lucro >= 0 ? '#00E08A' : '#FF5A5F';
    ctx.font = '800 150px Sora, sans-serif';
    ctx.fillText(fmtBRL0(d.lucro), cx, 384);
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText(d.lucro >= 0 ? 'líquido no bolso' : 'no vermelho hoje', cx, 566);

    ctx.strokeStyle = '#26313D'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 712); ctx.lineTo(W - 110, 712); ctx.stroke();

    if (d.ph != null)      _statCard(ctx, cx, 760, fmtBRL0(d.ph), 'por hora');
    else if (d.km != null) _statCard(ctx, cx, 760, d.km.toLocaleString('pt-BR'), 'km rodados');
    if (hstr)                              _statCard(ctx, cx + 470, 760, hstr, 'rodando');
    else if (d.km != null && d.ph != null) _statCard(ctx, cx + 470, 760, d.km.toLocaleString('pt-BR') + ' km', 'na rua');

    legenda = '📊 Fechei o dia · ' + fmtBRL0(d.lucro) + ' líquido'
            + (d.ph != null ? ' · ' + fmtBRL0(d.ph) + '/h' : '')
            + (hstr ? ' em ' + hstr : '') + ' — feito no Copiloto';
  } else {
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('Meu ritmo de hoje', cx, 320);
    const val = fmtBRL0(d.ph);
    ctx.fillStyle = '#00E08A'; ctx.font = '800 150px Sora, sans-serif';
    ctx.fillText(val, cx, 384);
    const wv = ctx.measureText(val).width;
    ctx.fillStyle = '#93A1B0'; ctx.font = '400 64px Sora, sans-serif';
    ctx.fillText('/h', cx + wv + 14, 470);
    ctx.font = '400 42px Inter, sans-serif';
    ctx.fillText('o que meu tempo rendeu', cx, 566);

    ctx.strokeStyle = '#26313D'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 712); ctx.lineTo(W - 110, 712); ctx.stroke();

    if (hstr)         _statCard(ctx, cx, 760, hstr, 'rodando');
    if (d.km != null) _statCard(ctx, cx + 470, 760, d.km.toLocaleString('pt-BR') + ' km', 'na rua');

    legenda = '📊 Meu ritmo de hoje · ' + val + '/h'
            + (hstr ? ' em ' + hstr : '')
            + (d.km != null ? ' · ' + d.km.toLocaleString('pt-BR') + ' km' : '')
            + ' — feito no Copiloto';
  }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5C6B7A'; ctx.font = '400 32px Inter, sans-serif';
  ctx.fillText('quanto você ganha por hora, de verdade', cx, H - 150);
  ctx.fillStyle = '#93A1B0'; ctx.font = '600 32px Inter, sans-serif';
  ctx.fillText('Copiloto', cx, H - 100);

  _shareLegenda = legenda;
  // o Isaac por último: fica por cima de tudo, no canto de baixo à direita
  await desenharIsaacComVeiculo(ctx, W - 86, H - 62, 232);
}

async function abrirShareFechamento() {
  const d = dadosFechamentoHoje();
  if (!d) { toast('Registre sua receita primeiro'); return; }
  const wrap = document.getElementById('shareToggleWrap');
  const tog  = document.getElementById('shareToggle');
  if (wrap) wrap.style.display = (d.ph != null) ? 'flex' : 'none';
  if (tog)  tog.checked = true;
  document.getElementById('modalShare').style.display = 'flex';
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
  desenharCardFechamento(true);
}

function fecharShare()     { document.getElementById('modalShare').style.display = 'none'; }
function onShareToggle(el) { desenharCardFechamento(el.checked); }

async function compartilharFechamento() {
  const canvas  = document.getElementById('shareCanvas');
  const legenda = _shareLegenda || '';
  canvas.toBlob(async (blob) => {
    if (!blob) { toast('Não consegui gerar a imagem', 'erro'); return; }
    const file = new File([blob], 'copiloto-fechamento.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: legenda }); fecharShare(); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'copiloto-fechamento.png';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    try { await navigator.clipboard.writeText(legenda); toast('Card baixado e legenda copiada!'); }
    catch (e) { toast('Card baixado!'); }
    fecharShare();
  }, 'image/png');
}

/* ═══════════════════════════════════════════════════════════════
   v2.4 · RECORDE PESSOAL 🏆
   Sai 100% do histórico: melhor dia anterior vs hoje. Nunca inventa.
   Só vale recorde se hoje PASSOU o melhor dia e há base pra comparar.
   ═══════════════════════════════════════════════════════════════ */
function _lucroPorDia() {
  const hist = lerLS('historicoFinancas', []);
  const porDia = {};
  hist.forEach(r => { if (r.dataISO) porDia[r.dataISO] = (porDia[r.dataISO] || 0) + r.lucro; });
  return porDia;
}

function recordeHoje() {
  const porDia = _lucroPorDia();
  const hoje = hojeISO();
  const lucroHoje = porDia[hoje];
  if (lucroHoje == null || lucroHoje <= 0) return null;       // dia zerado/negativo não é recorde
  const anteriores = Object.keys(porDia).filter(k => k !== hoje).map(k => porDia[k]);
  if (anteriores.length < 3) return null;                      // sem base honesta pra dizer "recorde"
  const melhorAnt = Math.max.apply(null, anteriores);
  if (lucroHoje > melhorAnt) return { lucroHoje, melhorAnt };  // passou o recorde
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   v2.5 · RETROSPECTO DE DOMINGO 📅
   Aos domingos o fechamento abre com o balanço da semana.
   Sai do histórico (mesmo _lucroPorDia do recorde) — nunca inventa.
   ═══════════════════════════════════════════════════════════════ */
function _nomeDiaSemana(iso) {
  const [y, m, dd] = String(iso).split('-').map(Number);
  const d = new Date(y, m - 1, dd);
  return d.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function retrospectoSemana() {
  const porDia = _lucroPorDia();
  const base = new Date(); base.setHours(12, 0, 0, 0);
  const diaISO = (off) => { const d = new Date(base); d.setDate(d.getDate() - off); return isoLocal(d); };

  let totalEsta = 0, diasComDado = 0, melhorVal = -Infinity, melhorISO = null;
  for (let i = 0; i < 7; i++) {
    const k = diaISO(i);
    if (porDia[k] != null) {
      totalEsta += porDia[k]; diasComDado++;
      if (porDia[k] > melhorVal) { melhorVal = porDia[k]; melhorISO = k; }
    }
  }
  let totalPassada = 0, diasPassada = 0;
  for (let i = 7; i < 14; i++) {
    const k = diaISO(i);
    if (porDia[k] != null) { totalPassada += porDia[k]; diasPassada++; }
  }
  if (diasComDado === 0) return null;                 // semana vazia: nada a balancear
  return { totalEsta, totalPassada, temPassada: diasPassada > 0, melhorVal, melhorISO };
}

function textoRetrospectoSemana() {
  const r = retrospectoSemana();
  if (!r) return '';
  const body = [];
  body.push(`Somando seus últimos 7 dias, deu ${M(r.totalEsta, 'v')} líquido.`);
  if (r.melhorISO) body.push(`Melhor dia foi ${_nomeDiaSemana(r.melhorISO)}, com ${M(r.melhorVal, 'v')}.`);
  if (r.temPassada) {
    const dif = r.totalEsta - r.totalPassada, absd = Math.abs(dif);
    if (absd < 1)     body.push(`Na mesma toada da semana passada (${M(r.totalPassada)}).`);
    else if (dif > 0) body.push(`${M(absd, 'v')} a mais que a semana passada (${M(r.totalPassada)}).`);
    else              body.push(`${M(absd, 'a')} abaixo da semana passada (${M(r.totalPassada)}) — semana mais devagar.`);
  }
  return '\uD83D\uDCC5 BALANÇO DA SEMANA\n' + body.join(' ') + '\n\n';
}
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
function lerLS(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : JSON.parse(v);
  } catch (e) { return padrao; }   // dado corrompido? ignora, não mata o app
}
function salvarLS(chave, valor) {
  try {
    localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor));
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
  document.getElementById('confirmTitulo').textContent = titulo;
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
function iconeDoTipo(t)     { return t === 'carro' ? '🚗' : '🏍️'; }
function fmtKm(n)           { return Number(n || 0).toLocaleString('pt-BR'); }
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
let iconeVeiculo    = '🏍️';
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
  document.getElementById('platsSel').textContent = platsSel.length === 1
    ? '✅ ' + platsSel[0] + ' selecionado'
    : '✅ ' + platsSel.join(' + ') + ' selecionados';
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
  document.getElementById('modalLogin').style.display = 'flex';
}
document.getElementById('btnFecharLogin').addEventListener('click', function () {
  document.getElementById('modalLogin').style.display = 'none';
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
      sliderTexto.textContent = '⏹  Encerrar o dia →';
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
  const perfil = lerLS('perfilUsuario', null);
  if (perfil && perfil.nome) iniciarApp(perfil);
  else document.getElementById('telaCadastro').style.display = 'block';

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
    if (frac >= 0.9)        { elPill.className = 'tanque-pill verm';  elPill.textContent = '🔴 quase no seu limite'; }
    else if (frac >= 0.75)  { elPill.className = 'tanque-pill amar';  elPill.textContent = '🟠 chegando perto · ' + pct + '%'; }
    else                    { elPill.className = 'tanque-pill verde'; elPill.textContent = '🟢 dentro do normal · ' + pct + '%'; }
  } else {
    // sem mês anterior: nível decorativo neutro, SEM inventar porcentagem
    wave.setAttribute('fill', 'var(--faint)');
    liq.setAttribute('transform', 'translate(0,' + (H * 0.62).toFixed(1) + ')');   // ~38% só de enfeite
    elVal.style.color = 'var(--signal)';
    elNor.textContent = 'aprendendo seu normal — sem mês anterior pra comparar ainda';
    elPill.className = 'tanque-pill neutro';
    elPill.textContent = '🟡 aprendendo';
  }
  // moto ou carro do perfil (mesmo padrão do ícone do slider)
  const veic = perfil.veiculo === 'carro' ? 'do seu carro' : 'da sua moto';
  elAviso.innerHTML = '⚠️ não é o tanque ' + veic + ' — é o seu <b>bolso</b>: soma do que você pagou nos postos este mês';
}
// ícones das luzes de manutenção (SVG de linha, currentColor)
const LUZ_SVG = {
  oleo:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13h9l3-3 4 2"/><path d="M7 13v3h8v-3"/><circle cx="9" cy="19" r="1.4"/><circle cx="14" cy="19" r="1.4"/><path d="M9 10V7h4"/></svg>',
  pneus:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg>',
  corrente: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="12" r="3.2"/><circle cx="17" cy="12" r="3.2"/><path d="M7 8.8h10M7 15.2h10"/></svg>',
  freio:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 2.5a9.5 9.5 0 0 1 6.7 2.8M12 21.5a9.5 9.5 0 0 1-6.7-2.8M2.5 12a9.5 9.5 0 0 1 2.8-6.7M21.5 12a9.5 9.5 0 0 1-2.8 6.7"/></svg>',
};

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
  { ic: '🎯', cor: 'var(--signal)', tit: 'Lucro de hoje', hero: '300 → 190',
    isaac: 'Entrar dinheiro não é ganhar dinheiro. A plataforma tira a parte dela e a gasolina come o resto. Eu te mostro quanto sobrou mesmo no seu bolso.',
    fonte: 'eu monto sozinho — você só diz quanto entrou' },
  { ic: '⛽', cor: 'var(--signal)', tit: 'Custo real por km', hero: 'além da gasolina',
    isaac: 'A gasolina é só parte da conta. O desgaste do carro é o custo que ninguém soma. Eu junto tudo e te mostro seu gasto real.',
    fonte: 'o app calcula do seu combustível, sem digitação' },
  { ic: '🐷', cor: 'var(--money)', tit: 'Cofrinho', hero: 'a conta sempre volta',
    isaac: 'O carro quebra quando você menos espera. Sem reserva, vira dívida. Eu separo um pouco a cada dia pra você estar preparado.',
    fonte: 'o app guarda o tanto que você escolher, por dia' },
  { ic: '🔧', cor: 'var(--signal)', tit: 'Manutenção', hero: 'dia perdido',
    isaac: 'Corrente arrebentada no meio da corrida é dia perdido, guincho e conta dobrada. Trocar na hora é barato; quebrar na rua é caro e humilhante. Eu grito ANTES do prejuízo, não depois.',
    fonte: 'eu conto os km e te aviso na hora certa' },
  { ic: '📄', cor: 'var(--info)', tit: 'Documentos', hero: 'a pé',
    isaac: 'CNH vencida não é multazinha: é gravíssima, 7 pontos, e o risco de ficar a pé — sem seu ganha-pão. A blitz não avisa. Eu aviso, com folga pra resolver sem correria.',
    fonte: 'guarda as datas — eu cutuco antes de vencer' },
  { ic: '🧮', cor: 'var(--info)', tit: 'Vale a pena rodar?', hero: 'antes de ligar',
    isaac: 'Sair sem saber quanto PRECISA fazer é rodar no escuro e rezar. Me diz suas horas e sua meta — eu te falo na lata quanto o dia exige por hora, e se dá ou não dá. Sem falso otimismo.',
    fonte: 'eu calculo com o SEU custo de combustível real' },
  { ic: '📈', cor: 'var(--money)', tit: 'Projeção do mês', hero: 'onde você vai parar',
    isaac: 'No dia 10 você não sabe como o mês fecha — e no dia 30 leva susto. Eu pego o SEU ritmo e projeto o fechamento antes. Não é chute: quanto mais roda, mais certeira fica.',
    fonte: 'estimo do seu próprio histórico — nunca invento' },
  { ic: '🕳️', cor: 'var(--danger)', tit: 'Onde seu dinheiro some', hero: 'o buraco invisível',
    isaac: 'A maioria dos motoristas gasta bem mais do que imagina — e nem percebe pra onde vai. Não é azar, é conta que ninguém faz. Eu faço a SUA: te mostro quanto o dia realmente custou, sem susto no fim do mês.',
    fonte: 'eu somo o que você nem vê — do seu próprio dado' },
  { ic: '⏳', cor: 'var(--signal)', tit: 'Trabalha de graça?', hero: 'a parte que não pagam',
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
    '</div></div>';
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
  const total = GUIA_ROTINAS.length;
  const bolinhas = GUIA_ROTINAS.map(function (_, i) {
    return '<span class="guia-dot' + (i === _guiaIdx ? ' on' : '') + '"></span>';
  }).join('');
  document.getElementById('guiaLista').innerHTML =
    _cardRotina(GUIA_ROTINAS[_guiaIdx]) +
    '<div class="guia-nav">' +
      '<button class="guia-seta" onclick="_guiaVai(-1)" aria-label="Anterior"' + (_guiaIdx === 0 ? ' disabled' : '') + '>&#8249;</button>' +
      '<div class="guia-dots">' + bolinhas + '</div>' +
      '<button class="guia-seta" onclick="_guiaVai(1)" aria-label="Pr\u00f3ximo"' + (_guiaIdx === total - 1 ? ' disabled' : '') + '>&#8250;</button>' +
    '</div>';
}
function _guiaVai(d) {
  const n = _guiaIdx + d;
  if (n < 0 || n >= GUIA_ROTINAS.length) return;
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
  odometroTotal.textContent = '🛣️ ' + kmAtual + ' km no total';
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
function combustivelKmMes() {
  const base  = baseCombustivel().base;
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
// texto curto explicando, na linguagem dele, POR QUE aquele número não fecha
// e QUAL seria o normal — número sozinho não ajuda quem não conhece a conta.
function textoSuspeito(s) {
  if (!s) return '';
  const quando  = s.reg.data ? s.reg.data + ': ' : '';
  const ehCarro = tipoVeiculoAtivo() === 'carro';
  const fx      = faixaConsumo();
  const faixa   = fx.min + ' a ' + fx.max + ' km/L';
  if (s.kmPorLitro !== null && s.kmPorLitro < 2) {
    return '⚠️ ' + quando + s.reg.litros + 'L para ' + fmtKm(s.reg.km) + ' km dá ' +
           s.kmPorLitro.toFixed(1) + ' km/L — o normal é ' + faixa +
           '. O km está baixo demais.';
  }
  return '⚠️ ' + quando + fmtBRL(s.reg.valor) + ' em ' + fmtKm(s.reg.km) + ' km dá ' +
         fmtBRL(s.cpk) + '/km — o normal fica entre R$ 0,20 e R$ 0,80.';
}

function atualizarCustoRealKm() {
  const reservaKm = reservaKmAtual();
  // fonte única: mesma média da aba Combustível (não o último abastecimento isolado, que é ruído)
  const combKm = combustivelKmMes();
  const real = combKm + reservaKm;
  // Usa a MESMA regra do detector (custo absurdo OU consumo impossível).
  // Antes aqui só olhava o custo > 3: um registro de 11L para 20 km (1,8 km/L,
  // impossível) passava batido porque o custo dava R$ 2,50.
  const suspeito = combKm > 3 || !!abastecimentoSuspeito();

  // ⚠️ Número que o app SABE estar errado não vai pra tela. Antes ele aparecia
  // em destaque com um aviso do lado — e o motorista pode decidir uma corrida
  // olhando esse número. Regra do projeto: faltou dado confiável, avisa e cala.
  const mostra = suspeito ? null : (combKm > 0 ? real : reservaKm);
  custoPorKmValor.textContent = mostra === null ? '—' : fmtBRL(mostra);
  custoKmStrip.textContent    = mostra === null ? '—' : fmtBRL(mostra);

  if (suspeito) {
    const _s = abastecimentoSuspeito();
    custoRealSub.innerHTML = (_s ? esc(textoSuspeito(_s)) : '⚠️ Um abastecimento está com o km errado.') +
      '<br><button onclick="event.stopPropagation();irCorrigirAbastecimento()" ' +
      'style="margin-top:7px;background:rgba(255,176,32,.14);border:1px solid rgba(255,176,32,.45);' +
      'color:var(--signal);font-family:inherit;font-size:11.5px;font-weight:700;padding:6px 14px;' +
      'border-radius:16px;cursor:pointer;">Corrigir agora →</button>';
    custoRealSub.style.color = 'var(--signal)';
  } else {
    custoRealSub.style.color = '';
    if (combKm > 0) {
      custoRealSub.textContent = 'comb ' + fmtBRL(combKm) + ' + reserva ' + fmtBRL(reservaKm);
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
    titulo = '💡 Ganho por hora real';
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
  else if (qual === 'km') {
    // ── LINGUAGEM: pra ler de capacete, entre uma corrida e outra.
    // A palavra "guardada" saiu: ela fazia o cara achar que o desgaste ia
    // pro cofrinho 🐷 — e não vai. O balão agora diz onde o dinheiro NÃO está.
    titulo = '💡 Custo real por km';
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
    titulo = '💡 Progresso da meta';
    texto  = 'Mostra o quanto falta para você atingir a meta do dia — como uma barra de progresso que vai enchendo. '
           + 'Exemplo: meta de R$ 250, você já fez R$ 200, faltam R$ 50. '
           + 'Ter um alvo claro dá foco e ajuda a fechar o dia no positivo, '
           + 'em vez de rodar sem saber se já foi suficiente ou se precisa de um pouco mais.';
    if (temReceita)
      conta = `Hoje: <b>${fmtBRL0(lucro)}</b> de <b>R$ ${meta}</b>` + (lucro >= meta ? ' — <b>atingida! 🎯</b>' : ` (faltam <b>${fmtBRL0((meta-lucro))}</b>)`) + '. Toque na barra para mudar a meta.';
    else
      conta = `Sua meta é R$ ${meta}/dia. Registre sua receita para ver o progresso.`;
  }

  document.getElementById('ajudaTitulo').textContent = titulo;
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
    t: '📈 Projeção do mês',
    x: 'É a minha estimativa de quanto você deve fechar o mês, com base no seu ritmo até agora. Quanto mais dias registrados, mais precisa ela fica.',
    e: 'Exemplo: em 10 dias rodados você lucrou <b>R$ 1.000</b> — média de R$ 100 por dia. Mantido esse ritmo, o mês fecha perto de <b>R$ 3.000</b>.'
  },
  gastomes: {
    t: '⛽ Gasto no mês',
    x: 'É a soma de tudo que você registrou de combustível neste mês.',
    e: 'Exemplo: abasteceu 4 vezes de R$ 50 → gasto do mês = <b>R$ 200</b>.'
  },
  mediakm: {
    t: '⛽ Custo médio por km',
    x: 'Quanto de combustível você gasta a cada quilômetro rodado. Serve para saber se o trajeto está consumindo o seu ganho.',
    e: 'Exemplo: abasteceu <b>R$ 50</b> e rodou <b>100 km</b> → custo de <b>R$ 0,50 por km</b>. Numa entrega de 10 km, são R$ 5 apenas de combustível.'
  },
  valepena: {
    t: '🧮 Vale a pena rodar?',
    x: 'Antes de começar o dia, me informe quantas horas você tem e a sua meta de lucro. Eu calculo quanto o dia exige por hora e comparo com o que você realmente rende — sem otimismo irreal.',
    e: 'Exemplo: meta de <b>R$ 200</b> em <b>8h</b> pede <b>R$ 25/h</b>. Se o seu ritmo real é R$ 18/h, eu aviso que essa meta está pesada para o tempo que você tem.'
  },
  ritmo: {
    t: '📊 Seu ritmo real',
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
    if (luzIc) luzIc.innerHTML = LUZ_SVG[cfg.key] || LUZ_SVG.oleo;
  });
}
// NOVO: salva as trocas no localStorage (antes elas sumiam ao recarregar!)
function salvarManutencao() {
  if (bloquearSemLogin()) return;   // sem entrar na conta, nao lanca
  const salvos = lerManutVeic();
  [1, 2, 3].forEach(n => {
    const it = manutencoes['item' + n];
    if (it.key) salvos[it.key] = { kmUltima: it.kmUltima, intervalo: it.intervalo };
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
      salvarRegistroHibrido('manutencao', {
        veiculo_id:  vid,
        tipo:        it.key,
        data_ultima: hojeISO(),
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
    if (ic) ic.textContent = MNT_ICONES[it.key] || '🔧';
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
const MNT_ICONES = { oleo:'🛢️', pneus:'🛞', corrente:'⛓️', freio:'🛑' };
function abrirManutencao(n) {
  manutAlvo = n;
  const it = manutencoes['item' + n];
  const usado    = kmAtual - it.kmUltima;
  const restante = it.intervalo - usado;
  const pctUsado = it.kmUltima ? Math.max(0, Math.min(100, (usado / it.intervalo) * 100)) : 0;
  const restPct  = restante / it.intervalo;

  document.getElementById('mntIcone').textContent = MNT_ICONES[it.key] || '🔧';
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
      sliderTexto.textContent = '⏹  Encerrar o dia →';
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
      sliderTexto.textContent = iconeVeiculo + '  Bora rodar →';
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
    kmGps.innerHTML = '📍 GPS indisponível — digite o km do painel';
  } else if (gpsDist <= 0) {
    // linha reta zero: ele voltou ao ponto de partida. Não diz nada sobre
    // distância, então o app não finge que diz.
    kmGps.classList.add('neutro');
    kmGps.innerHTML = '📍 Você terminou onde começou';
  } else {
    kmGps.innerHTML = '📍 Você terminou a <b class="num">~' + gpsDist + ' km</b> de onde começou — rodou pelo menos isso';
  }
  // Faz dias que ele não fecha? Diz isso ANTES de confirmar, porque o número que
  // ele vai digitar não é "o km de hoje" — é o de todos esses dias juntos.
  const nDias = diasDesdeUltimoRegistro();
  const avisoD = document.getElementById('kmVaoDias');
  if (avisoD) {
    if (nDias > 1 && ultimo !== null) {
      avisoD.innerHTML = '📅 Faz <b>' + nDias + ' dias</b> desde seu último registro — ' +
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
    '<span class="veic-op-ic">➕</span>' +
    '<span class="veic-op-txt"><b>Troquei de veículo</b><small>é um veículo que o app ainda não conhece</small></span></button>');
  if (motivo === 'menor') {
    // ⚠️ Sem esta saída o motorista fica preso: se o número GUARDADO é que
    // está errado, ele digita o valor certo, é recusado, volta pro campo,
    // digita certo de novo... em loop. A única fuga seria cadastrar um
    // veículo falso — sujando os dados pra sempre.
    opts.push('<button type="button" class="veic-op" onclick="veicCorrigirGuardado()">' +
      '<span class="veic-op-ic">✏️</span>' +
      '<span class="veic-op-txt"><b>O km guardado está errado</b>' +
      '<small>o certo é o que estou digitando agora — corrigir o registro anterior</small></span></button>');
  }
  if (motivo === 'maior') {
    opts.push('<button type="button" class="veic-op" onclick="veicRodeiIsso()">' +
      '<span class="veic-op-ic">✅</span>' +
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
  if (typeof sliderThumb !== 'undefined' && sliderThumb) sliderThumb.textContent = iconeVeiculo;
  if (typeof sliderTexto !== 'undefined' && sliderTexto && !turnoIniciado) sliderTexto.textContent = iconeVeiculo + '  Bora rodar →';
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
  odometroTotal.textContent = '🛣️ ' + kmAtual + ' km no total';
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
  if (rh && ra && (rh.vid || null) === (ra.vid || null)) {
    const kmD = valor - ra.km;
    if (kmD > 0) mapa[diaAlvo] = { km: kmD, vid: vidUsar };
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
      return '\u26a0\ufe0f ' + l + 'L para ' + fmtKm(k) + ' km daria so ' + kpl.toFixed(1) +
             ' km por litro. ' + (ehCarro ? 'Um carro faz ' : 'Uma moto faz ') + faixa +
             ' \u2014 esse km parece baixo demais. Confira no painel.';
    }
    if (kpl !== null && kpl > fx.max * 2) {
      return '\u26a0\ufe0f ' + l + 'L para ' + fmtKm(k) + ' km daria ' + kpl.toFixed(1) +
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
  document.querySelector('#btnSalvarTela').textContent = '✅ Salvar alteração';
  document.getElementById('modalAbastecer').style.display = 'flex';
}
function excluirAbastecimento(id) {
  pedirConfirmacao('🗑️ Apagar abastecimento', 'Quer apagar este lançamento? Isso não dá pra desfazer.', function() {
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
      r.tipo = tipoSelecionadoTela; r.valor = valor; r.litros = litros; r.km = km; r.posto = posto;
      r.ppl = (valor && litros) ? (valor / litros).toFixed(2) : null;
      r.cpm = (valor && km)     ? (valor / km).toFixed(2)     : null;
      salvarLS('historicoAbastecimentos', h);
      if (typeof salvarRegistroHibrido === 'function') {
        salvarRegistroHibrido('abastecimentos', {
          id: r.id, data_iso: r.dataISO, tipo: r.tipo, valor: r.valor,
          litros: r.litros, km: r.km, cpm: r.cpm, posto: r.posto,
          veiculo_id: r.vid || null
        }, 'id').catch(function () {});
      }
      refreshAposAbast();
    }
    editandoAbastId = null;
    document.querySelector('#btnSalvarTela').textContent = '✅ Registrar';
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
  document.querySelector('#btnSalvarTela').textContent = '✅ Registrar';
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
  document.querySelector('#btnSalvarTela').textContent = '✅ Registrar';
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
      veiculo_id: registro.vid || null   // sem isto a nuvem nao sabe de qual veiculo e
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
  const cmSuspeito = cKmMes > 3 || !!abastecimentoSuspeito();   // mesma regra da tela Início
  document.querySelector('#custoMedioVal').textContent = (cKmMes > 0 && !cmSuspeito) ? fmtBRL(cKmMes) : '—';
  let subCm;
  if (cmSuspeito) { const _s2 = abastecimentoSuspeito(); subCm = _s2 ? textoSuspeito(_s2) : '⚠️ Um abastecimento está com o km errado.'; }
  else if (cKmMes > 0) subCm = (bc.escopo === 'mes' ? 'média do mês' : 'média de todos os registros') + ' · ' + nomeVeiculo(veiculoAtivo());
  else {
    const n = abastDoVeiculoAtivo().length;
    subCm = n > 0 ? 'aprendendo ' + nomeVeiculo(veiculoAtivo()) + ' · registre o km ao abastecer'
                  : 'registre valor + km ao abastecer';
  }
  const _elSub = document.querySelector('#custoMedioSub');
  if (cmSuspeito) {
    _elSub.innerHTML = esc(subCm) + '<br><button onclick="event.stopPropagation();irCorrigirAbastecimento()" ' +
      'style="margin-top:7px;background:rgba(255,176,32,.14);border:1px solid rgba(255,176,32,.45);' +
      'color:var(--signal);font-family:inherit;font-size:11.5px;font-weight:700;padding:6px 14px;' +
      'border-radius:16px;cursor:pointer;">Corrigir agora →</button>';
  } else { _elSub.textContent = subCm; }
}

// helper reutilizado na tela de combustível e no extrato
function renderItensAbastecimento(elLista, registros, baseParaPadrao) {
  if (registros.length === 0) { elLista.innerHTML = '<div class="comb-vazio">Nenhum abastecimento neste período.</div>'; return; }
  elLista.innerHTML = registros.map(r => {
    let badge = '';
    if (r.ppl) {
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
        if (diff > 0.1)       badge = `<div class="comb-badge comb-badge-caro">⚠️ +${fmtBRL(diff)}/L que ${qtd}</div>`;
        else if (diff < -0.1) badge = `<div class="comb-badge comb-badge-barato">✅ −${fmtBRL(Math.abs(diff))}/L que ${qtd}</div>`;
        else                  badge = `<div class="comb-badge comb-badge-neutro">👌 No mesmo preço de ${qtd}</div>`;
      }
    }
    return `<div class="comb-item">
      <div class="comb-item-left">
        <div class="comb-item-dia">${r.data || ''}</div>
        <div class="comb-item-detalhe">${r.posto ? '📍 ' + esc(r.posto) + ' · ' : ''}${r.tipo}${r.litros ? ' · ' + r.litros + 'L' : ''}${r.ppl ? ' · ' + fmtBRL(numBR(r.ppl)) + '/L' : ''}</div>
        ${badge}
      </div>
      <div class="comb-item-right">
        <div class="comb-item-val">${fmtBRL(r.valor)}</div>
        <div class="comb-item-cpm">${r.cpm ? fmtBRL(numBR(r.cpm)) + '/km' : '—'}</div>
      </div>
      <div class="comb-item-acoes">
        <button class="comb-acao" onclick="editarAbastecimento('${r.id}')" title="Editar">✏️</button>
        <button class="comb-acao" onclick="excluirAbastecimento('${r.id}')" title="Apagar">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  EXTRATOS (combustível e finanças) — por mês ou por semana
// ═══════════════════════════════════════════════════════════════
let extratoModo   = 'mes';   let extratoOffset = 0;    // combustível
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
  extratoModo = 'mes'; extratoOffset = 0;
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
    avisoCpk.textContent = nFurados > 0
      ? (nFurados === 1 ? 'Deixei 1 abastecimento de fora desta conta: o km está errado.'
                        : 'Deixei ' + nFurados + ' abastecimentos de fora desta conta: o km está errado.')
      : '';
    avisoCpk.style.display = nFurados > 0 ? 'block' : 'none';
  }
  renderItensAbastecimento(document.getElementById('extLista'), doPeriodo, hist);
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
      ? '<br><span style="font-size:11px;color:var(--faint)">Deixei de fora um abastecimento com o km errado — corrija pra conta ficar completa.</span>'
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
      let txt = `🟢 Neste período, <b>${melhor.tipo}</b> saiu <b>${fmtBRL(difKm)} mais barato por km</b> que ${pior.tipo} (${diff}%).`;
      if (noPeriodo >= 5) txt += ` Nos ${fmtKm(kmTotal)} km que você rodou, daria <b>${fmtBRL0(noPeriodo)}</b> de diferença.`;
      verBox.innerHTML = txt + nota;
    } else {
      verBox.style.display = 'block';
      verBox.innerHTML = `⚖️ Os tipos custaram quase igual por km (${fmtBRL(difKm)} de diferença). Vai no que for mais fácil de achar no posto.` + nota;
    }
  } else if (temFurado) {
    // nao da pra comparar porque o unico dado do outro tipo esta furado — diz isso
    verBox.style.display = 'block';
    verBox.innerHTML = '⚠️ Não consigo comparar os tipos: um abastecimento está com o km errado. Corrija que eu faço a conta.';
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
      h1{font-size:20px;margin:0} .sub{color:#666;font-size:13px;margin:2px 0 18px}
      .who{font-size:12px;color:#888;margin-bottom:18px}
      .resumo{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
      .rz{display:flex;justify-content:space-between;border:1px solid #ddd;border-radius:8px;padding:9px 12px;font-size:13px}
      .rz b{color:#000}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee}
      th{background:#f5f5f5;font-size:11px;text-transform:uppercase;color:#555}
      .foot{margin-top:24px;font-size:10px;color:#aaa;text-align:center}
    </style></head><body>
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
          <button class="doc-btn-edit" onclick="abrirModalDoc('${tipo.id}')">✏️</button>
          <button class="doc-btn-edit" onclick="excluirDoc('${tipo.id}')">🗑️</button>
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
    btnSug.textContent = '📅 Renovou? Adiantar ' + (meses === 12 ? '1 ano' : (meses / 12) + ' anos');
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
  pedirConfirmacao('🗑️ Remover documento', msg, function() {
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
  document.getElementById('modalReceitaTitulo').textContent = hoje ? '💰 Ajustar receita de hoje' : '💰 Receita do dia';
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
}

// Devolve o app depois que ele entra de novo.
function destravarDaTelaDeLogin() {
  // ⚠️ mostrarTela() espera o ELEMENTO, não o id em texto — passar string
  // quebra na hora de aplicar o display e o app não voltaria após o login.
  const nav = document.getElementById('navInferior');
  if (nav) nav.style.display = 'flex';
  document.getElementById('btnFecharLogin').style.display = '';
  document.getElementById('btnCancelarLogin').style.display = '';
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
  pedagio:        { icon:'🛣️', label:'Pedágio' },
  alimentacao:    { icon:'🍔', label:'Alimentação' },
  lavagem:        { icon:'🧼', label:'Lavagem' },
  estacionamento: { icon:'🅿️', label:'Estacionamento' },
  internet:       { icon:'📱', label:'Internet/chip' },
  outro:          { icon:'➕', label:'Outro' },
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
       <div class="desp-item-esq">${d.icon} ${esc(d.label)}</div>
       <div class="desp-item-dir">
         <span class="desp-item-val">− ${fmtBRL(d.valor)}</span>
         <button class="desp-item-x" onclick="removerDespesa('${d.id}')" aria-label="Remover">✕</button>
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
    cat: despCatSel, icon: CATS_DESPESA[despCatSel].icon, label: CATS_DESPESA[despCatSel].label, valor
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
      var _promessa = {
        hoje:   '\u26A1 Registra hoje e eu te mostro se voc\u00ea foi ACIMA ou abaixo do seu normal \u2014 com o SEU n\u00famero, sem achismo.',
        semana: '\uD83D\uDCC5 Roda uns dias e aqui vira o comparativo da sua semana contra a passada \u2014 subindo ou caindo.',
        mes:    '\uD83D\uDCC8 Registra alguns dias que eu projeto onde seu m\u00eas fecha \u2014 pra n\u00e3o levar susto no dia 30.'
      };
      ph.textContent = _promessa[desempenhoView] || _promessa.mes;
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
  const ultimo = historico[0];
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
    v.textContent = '⚖️ Dia dentro do seu normal';
  } else if (diff > 0) {
    v.classList.add('acima');
    v.textContent = '🟢 ' + fmtBRL0(diff) + ' acima do seu normal';
  } else {
    v.classList.add('abaixo');
    v.textContent = '🔴 ' + fmtBRL0(Math.abs(diff)) + ' abaixo do seu normal';
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

// ─── EXTRATO COMBUSTÍVEL: botões ──────────────────────────────
document.getElementById('btnVerExtrato').addEventListener('click', abrirExtrato);
document.getElementById('extBack').addEventListener('click', () => { atualizarTelaCombustivel(); mostrarTela(telaCombustivel); navCombustivel.classList.add('ativo'); });
document.getElementById('extMes').addEventListener('click', () => {
  extratoModo = 'mes'; extratoOffset = 0;
  document.getElementById('extMes').classList.add('ativo'); document.getElementById('extSemana').classList.remove('ativo');
  renderExtrato();
});
document.getElementById('extSemana').addEventListener('click', () => {
  extratoModo = 'semana'; extratoOffset = 0;
  document.getElementById('extSemana').classList.add('ativo'); document.getElementById('extMes').classList.remove('ativo');
  renderExtrato();
});
document.getElementById('extPrev').addEventListener('click', () => { extratoOffset--; renderExtrato(); });
document.getElementById('extNext').addEventListener('click', () => { if (extratoOffset < 0) { extratoOffset++; renderExtrato(); } });
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
navManutencao.addEventListener('click',  () => { mostrarTela(telaManutencao);  navManutencao.classList.add('ativo'); });
navCombustivel.addEventListener('click', () => { atualizarTelaCombustivel();   mostrarTela(telaCombustivel); navCombustivel.classList.add('ativo'); });
navFinancas.addEventListener('click',    () => { atualizarTelaFinancas();      mostrarTela(telaFinancas);    navFinancas.classList.add('ativo'); });
navDocumentos.addEventListener('click',  () => { atualizarTelaDocumentos();    mostrarTela(telaDocumentos);  navDocumentos.classList.add('ativo'); });
// desenha o lobo na aba, na fase que ele está hoje (filhote → lenda)
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
  mostrarTela(telaCade);
  navCade.classList.add('ativo');
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
  if (amostras.length < 2) return { suficiente: false, amostras: amostras.length };
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
    vd.textContent = '🟡 Ainda aprendendo com você';
    tx.innerHTML = 'Use o "Bora rodar" e registre suas receitas — com uns dias de uso eu te digo se <b>' + nomeHoje + '</b> costuma valer a pena pra você.';
    return;
  }
  if (it.mediaDia === null) {
    box.classList.add('amarelo');
    vd.textContent = '🟡 Sem histórico de ' + nomeHoje + ' ainda';
    tx.innerHTML = 'Sua média geral é <b>' + fmtBRL0(it.mediaGeral) + '/hora</b> (' + it.total + ' dias). Ainda não tenho ' + nomeHoje + 's registradas pra comparar — roda hoje que eu aprendo!';
    return;
  }
  const razao = it.mediaDia / it.mediaGeral;
  const N = nomeHoje.charAt(0).toUpperCase() + nomeHoje.slice(1);
  if (razao >= 1.05) {
    box.classList.add('verde');
    vd.textContent = '🟢 ' + N + ' costuma ser boa pra você!';
    tx.innerHTML = plDia(it.hojeDow, nomeHoje) + ' rendem <b>' + fmtBRL0(it.mediaDia) + '/hora</b>, acima da sua média geral de ' + fmtBRL0(it.mediaGeral) + '/h. Bora aproveitar!';
  } else if (razao >= 0.85) {
    box.classList.add('amarelo');
    vd.textContent = '🟡 ' + N + ' é mediana pra você';
    tx.innerHTML = plDia(it.hojeDow, nomeHoje) + ' rendem <b>' + fmtBRL0(it.mediaDia) + '/hora</b>, perto da sua média de ' + fmtBRL0(it.mediaGeral) + '/h. Vale rodar, sem esperar milagre.';
  } else {
    box.classList.add('vermelho');
    vd.textContent = '🔴 ' + N + ' costuma render menos';
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
    if (diff > 0.1) aviso = `⚠️ Combustível ${fmtBRL(diff)}/L acima da média. Impacto: ${fmtBRL((diff*litros))} no lucro.`;
  }

  // ── VEREDITO: compara a meta com o SEU ritmo real (nada de régua inventada) ──
  const vd = document.getElementById('simVerdict');
  let linhaRitmo = '';
  if (temRitmo) {
    const razao = phNecessario / phReal;
    if (razao <= 1.0)      { vd.textContent = '🟢 Meta tranquila pro seu ritmo';  vd.style.color = 'var(--money)'; }
    else if (razao <= 1.3) { vd.textContent = '🟡 Meta puxada, mas possível';     vd.style.color = 'var(--signal)'; }
    else                   { vd.textContent = '🔴 Meta pesada pra esse tempo';    vd.style.color = 'var(--danger)'; }
    const rende = phReal * horas;
    linhaRitmo = `
    <div class="sim-linha"><span class="ajuda-clic" onclick="abrirAjudaCard('ritmo')">📊 Seu ritmo real <span class="int">ⓘ</span></span><span>${fmtBRL0(phReal)}/h (${phAmostras.length} dias)</span></div>
    <div class="sim-linha"><span>🎯 No seu ritmo, ${horas}h rendem</span><span style="color:${rende >= meta ? 'var(--money)' : 'var(--signal)'}">~${fmtBRL0(rende)}</span></div>`;
  } else {
    vd.textContent = '🟡 Ainda aprendendo seu ritmo';
    vd.style.color = 'var(--signal)';
    linhaRitmo = `
    <div class="sim-linha"><span class="ajuda-clic" onclick="abrirAjudaCard('ritmo')">📊 Seu ritmo real <span class="int">ⓘ</span></span><span>use o "Bora rodar" + registre receitas</span></div>`;
  }

  document.getElementById('simLinhas').innerHTML = `
    <div class="sim-linha sim-linha-forte"><span>🕐 Precisa render</span><span>${fmtBRL(phNecessario)}/h</span></div>${linhaRitmo}
    <details class="sim-detalhes">
      <summary>ver a conta completa ›</summary>
      <div class="sim-linha"><span>💰 Receita bruta necessária</span><span>${fmtBRL(receita)}</span></div>
      <div class="sim-linha"><span>⛽ Deve gastar de combustível</span><span>~${fmtBRL0(combEst)} (uns ${kmEst} km)</span></div>
      <div class="sim-linha"><span>⛽ Conta feita com o litro a</span><span>${fmtBRL(precoComb)}${comLitros.length > 0 ? ' (seu último posto)' : ' (média — registre um abastecimento!)'}</span></div>
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
  const mesmos = hist.slice(1).filter(a => a.tipo === ult.tipo);
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

function _statCard(ctx, x, y, valor, rotulo) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#F2F6FA'; ctx.font = '700 66px Sora, sans-serif';
  ctx.fillText(valor, x, y);
  ctx.fillStyle = '#93A1B0'; ctx.font = '400 34px Inter, sans-serif';
  ctx.fillText(rotulo, x, y + 82);
}

function desenharCardFechamento(mostrarValor) {
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
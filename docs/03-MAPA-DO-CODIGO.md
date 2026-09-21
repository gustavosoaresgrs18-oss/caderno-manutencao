# 03 — Mapa do Código

**Classificação deste documento:** PÚBLICO.
**Objetivo:** mapa técnico de navegação — onde fica cada parte do código — para localizar
rapidamente uma seção antes de editar. Não entra aqui: regra de negócio explicada em prosa,
cálculo financeiro, schema de dados, ou avaliação de risco/qualidade — isso tem documentação
própria, privada. Taxonomia conforme `docs/00-CONSTITUICAO.md`.

## 1. Arquivos e seus papéis

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

| Arquivo | Papel |
|---|---|
| `index.html` | Markup de todas as telas e modais, sprite de ícones SVG. Carrega Supabase (CDN) + `supabase-service.js` + `script.js`. |
| `script.js` | Toda a lógica do app (~11.700 linhas), organizada em seções demarcadas por comentários "═══". |
| `supabase-service.js` | Cliente Supabase, autenticação, e a camada híbrida de gravação (local → nuvem). |
| `style.css` | Estilos, variáveis CSS, sem preprocessador. |
| `sw.js` | Service worker — só ativo na versão web (fora do app nativo). |
| `copiar-para-www.js` | Único "build step" do projeto: monta a pasta consumida pelo empacotamento nativo. |
| `capacitor.config.json`, `manifest.json`, `package.json` | Configuração do empacotamento nativo / metadados de instalação / scripts npm. |
| `android/` | Projeto nativo utilizado pelo empacotamento Android. |
| `fontes/` | Fontes locais do app; copiada para o pacote nativo pelo `copiar-para-www.js` (lista `PASTAS`). |
| `privacidade.html`, `excluir-conta.html` | Páginas públicas independentes. |

O avaliador de corrida (v4.31) também usa, em `index.html`, o botão `btnAbrirAvaliador`, o modal
`modalAvaliador`, o contêiner `cadePendentes` e o selo `navCadeBadge`, e, em `style.css`, as classes
`av-*` (mais `.nav-badge.neutro` e `.dot-neutro`). Não usa `supabase-service.js`. A unificação de
lucro/custo-km/R$-hora e a composição `avaliarCorridaCompleta()` (v4.33) não acrescentaram nada
em `index.html` nem em `style.css` — é só `script.js`.

## 2. Mapa de seções do `script.js`

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

O arquivo é dividido em blocos, cada um iniciado por um comentário de seção (`═══`).

As referências de linha são aproximadas e servem apenas como ponto inicial de localização.
Elas podem mudar conforme o código evolui. **Atualizadas após o refactor de unificação de
lucro/custo-km/R$-hora e a integração do avaliador completo (v4.33, commits `e8f04d5`..`9797097`,
"Fases 1 a 6")**, que deslocou tudo a partir da linha ~2289 da v4.31.

| Linha | Seção |
|---|---|
| 1 | Configuração do nome do assistente do app |
| 10 | Helpers de robustez (leitura/gravação segura de armazenamento local, formatação de número e data) |
| 141 | Sistema de níveis/gamificação |
| 276 | Mascote visual |
| 441 | Marco de reorganização do arquivo (v2) |
| 536 | Veículos |
| 558–663 | Identificação de dono de registro, de aparelho, e limite de veículos |
| 711 | Ícones SVG |
| 1027 | Login |
| 1205 | Presente de boas-vindas (onboarding) |
| 1465 | Instrumentos do painel principal |
| 1630 | Guia do app |
| 2006 | Cálculo de piso por km |
| 2292 | **(v4.33)** Função oficial de custo por km — `calcularCustoKmReal()` + constante `CUSTO_KM_TETO_SUSPEITO`. Fonte única do teto de R$/km suspeito; usada por `atualizarCustoRealKm()` (logo abaixo, mesma seção) e por `fecharMes()` |
| 2427 | Avaliador de corrida (MVP-0, v4.31; estendido em v4.33): cálculo, modal, aviso de pendências e cartão de confirmação na tela Cadê — 100% local. Inclui `avCtxSessao()` (cache de sessão do modal, em memória) e `avaliarCorridaCompleta()`/`avConcordanciaTexto()`/`avTextoCompleto()` (v4.33: combina piso, custo real e histórico num veredito só, sem decidir nada) |
| 3120 | Modal de reserva financeira |
| 3201 | Modal de meta do dia |
| 3239 | Balão de ajuda contextual |
| 3612 | Modal de manutenção |
| 4173 | Correção manual de odômetro |
| 4767 | **(v4.33)** Função oficial de lucro — `calcularLucroReal()`. Fonte única de `receita − taxa − comb − desp`; usada por 6 pontos (preview/confirmação de receita, resync do dia, reconciliação do histórico, dados de demo, auditoria da Sentinela) |
| 5060 | Tratamento de gasto que não é do dia corrente |
| 5346 | Extratos (combustível e finanças) |
| 5496 | Comparador por tipo de combustível |
| 5656 | Exportação (PDF/CSV) |
| 6150 | Balões progressivos de orientação |
| 6227 | Tela de ajustes |
| 6276 | Ferramenta de diagnóstico de rolagem (uso interno) |
| 6367 | Leitura por foto (OCR) |
| 6611 | Importação de extrato de plataforma |
| 7401 | Fluxo de conferência de dono de dados ao logar |
| 7875 | Projeção do mês |
| 8340 | Fechamento do mês (cálculo) — `fecharMes()`; desde v4.33 usa `calcularCustoKmReal()` e `porHoraPonderado()` em vez de reimplementar as contas |
| 8470 | Texto do fechamento do mês |
| 8705 | Tela de relatório do mês |
| 8737 | Comparador analítico ("Lupa") — `lupaDiaDaSemana()`, desde v4.33 também usa `porHoraPonderado()` |
| 8765 | O portão do Premium (controle de acesso ao que é pago) |
| 9139 | Cortesia do primeiro mês |
| 9380 | Tutorial de primeira abertura / modo demonstração |
| 9659 | Detector interno de inconsistência ("Sentinela") — `auditarInvariantes()`, desde v4.33 usa `calcularLucroReal()` pra gerar o "esperado" da comparação |
| 9764 | Lembrete local de fechar o dia |
| 10202 | Tutorial guiado por aba |
| 10451 | Tratamento do botão físico de voltar (Android) |
| 10600 | Painel de turno ao vivo |
| 10631 | Inteligência por dia da semana |
| 10637 | Cálculo de valor por hora — `porHoraPonderado()` (fonte oficial desde v4.29; em v4.33 `fecharMes()` e `lupaDiaDaSemana()` passaram a chamá-la em vez de reimplementar a soma/divisão) |
| 10851 | Tela "Cadê" (fechamento diário em cartões) |
| 11074 | Geração de texto da tela "Cadê" — inclui `textoEsforcoDoDia()` (v4.32, seção "SEM RECEITA": reconhece turno/horas/km já registrados em vez de dizer "dia zerado" quando não é verdade) |
| 11308 | Integração visual do sistema de níveis |
| 11429 | Compartilhar fechamento (v2.3) |
| 11452 | Isaac e o veículo dentro do cartão de compartilhar |
| 11652 | Recorde pessoal (v2.4) |
| 11676 | Retrospecto de domingo (v2.5) |

**Nota (`HISTÓRICO`):** o comentário-título da seção em 10851 ainda diz "Cadê — consultora
por voz". O recurso de voz foi removido; hoje a tela é em cartões, sem voz. Nomes e comentários
que mencionam "voz" no código são resquício, não comportamento atual.

**Pontos de ligação fora das seções próprias** (uma linha cada, salvo indicação):
- Avaliador de corrida: `iniciarApp` (~1319, limpeza de avaliações pendentes vencidas),
  `atualizarResumoDia` (~1808, contador de pendências) e o clique da aba Cadê (~10594, cartão
  de confirmação).
- Funções oficiais v4.33 (`calcularLucroReal`, `calcularCustoKmReal`, `porHoraPonderado`,
  `avaliarCorridaCompleta`): não têm pontos de ligação além das seções listadas acima — os
  call sites já estão descritos nas próprias linhas da tabela, para não duplicar aqui o que é
  navegação, não regra de negócio.

## 3. `supabase-service.js` — visão geral

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

Inicialização do cliente Supabase, controle de sessão/usuário logado, e a camada híbrida de
gravação (grava local, tenta sincronizar, enfileira se falhar) ficam concentradas neste arquivo
(~1.100 linhas), dividido em seções demarcadas por comentários "═══":

| Linha | Seção |
|---|---|
| 85 | Camada híbrida de gravação |
| 202 | Exclusão híbrida |
| 263 | Sincronizador de segundo plano (fila offline) |
| 325 | Autenticação (helpers básicos) |
| 415 | O plano (quem decide se é Premium é o servidor) |
| 481 | Migração do 1º login |
| 677 | Excluir a conta |
| 705 | Restaurar do Supabase |
| 1060 | Inicialização geral |

Este arquivo não foi tocado pelo refactor de unificação (v4.33) — ver seção 1. As mesmas
ressalvas de precisão de linha da seção 4 valem aqui.

## 4. Como usar este mapa — limitações

**Classificação: `INFERÊNCIA` / `NÃO CONFIRMADO`.**

- Os números de linha refletem o estado do código no momento desta auditoria (atualizada após
  o refactor v4.33, commit `9797097`) — qualquer edição subsequente pode deslocá-los. Trate
  como ponto de partida para busca, não como referência permanentemente exata.
- Esta lista foi construída a partir dos comentários de seção existentes (`═══`); **não é
  confirmado** que ela cubra toda função relevante do arquivo — funções menores sem comentário
  de seção próprio podem existir dentro de cada bloco sem estarem listadas aqui individualmente.
- Os números de linha da tabela 2 foram recalculados a partir do `git diff` real entre a v4.31
  (commit `1319348`) e o estado atual (hunk a hunk), não estimados — mas, como o próprio
  comentário de uma das funções novas (`calcularCustoKmReal()`, linha ~2306) ainda diz "AINDA
  NÃO CHAMADA POR NINGUÉM", vale lembrar que comentários no código podem ficar desatualizados
  mais rápido que este mapa é revisado — na dúvida, o código é a fonte de verdade, não o mapa.

## 5. Fora do escopo deste documento

O que cada função faz em termos de regra de negócio, por que ela existe, e qualquer avaliação
de risco ou qualidade sobre o código — isso tem documentação própria, privada, fora deste
repositório público.

---

**Fontes:** `docs/00-CONSTITUICAO.md` (taxonomia); código atual (`script.js`,
`supabase-service.js`, e demais arquivos listados na seção 1) como prova principal; `git diff
1319348 HEAD -- script.js` para o recálculo de linhas da seção 2.

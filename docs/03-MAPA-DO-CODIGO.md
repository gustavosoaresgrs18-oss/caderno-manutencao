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
| `script.js` | Toda a lógica do app (~10.900 linhas), organizada em seções demarcadas por comentários "═══". |
| `supabase-service.js` | Cliente Supabase, autenticação, e a camada híbrida de gravação (local → nuvem). |
| `style.css` | Estilos, variáveis CSS, sem preprocessador. |
| `sw.js` | Service worker — só ativo na versão web (fora do app nativo). |
| `copiar-para-www.js` | Único "build step" do projeto: monta a pasta consumida pelo empacotamento nativo. |
| `capacitor.config.json`, `manifest.json`, `package.json` | Configuração do empacotamento nativo / metadados de instalação / scripts npm. |
| `android/` | Projeto nativo utilizado pelo empacotamento Android. |
| `fontes/` | Fontes locais do app; copiada para o pacote nativo pelo `copiar-para-www.js` (lista `PASTAS`). |
| `privacidade.html`, `excluir-conta.html` | Páginas públicas independentes. |

## 2. Mapa de seções do `script.js`

**Classificação: `ESTADO ATUAL DO CÓDIGO`.**

O arquivo é dividido em blocos, cada um iniciado por um comentário de seção (`═══`).

As referências de linha são aproximadas e servem apenas como ponto inicial de localização.
Elas podem mudar conforme o código evolui.

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
| 1463 | Instrumentos do painel principal |
| 1628 | Guia do app |
| 2003 | Cálculo de piso por km |
| 2385 | Modal de reserva financeira |
| 2466 | Modal de meta do dia |
| 2504 | Balão de ajuda contextual |
| 2877 | Modal de manutenção |
| 3438 | Correção manual de odômetro |
| 4310 | Tratamento de gasto que não é do dia corrente |
| 4596 | Extratos (combustível e finanças) |
| 4746 | Comparador por tipo de combustível |
| 4906 | Exportação (PDF/CSV) |
| 5400 | Balões progressivos de orientação |
| 5477 | Tela de ajustes |
| 5526 | Ferramenta de diagnóstico de rolagem (uso interno) |
| 5617 | Leitura por foto (OCR) |
| 5861 | Importação de extrato de plataforma |
| 6651 | Fluxo de conferência de dono de dados ao logar |
| 7125 | Projeção do mês |
| 7590 | Fechamento do mês (cálculo) |
| 7713 | Texto do fechamento do mês |
| 7948 | Tela de relatório do mês |
| 7980 | Comparador analítico ("Lupa") |
| 8008 | O portão do Premium (controle de acesso ao que é pago) |
| 8380 | Cortesia do primeiro mês |
| 8621 | Tutorial de primeira abertura / modo demonstração |
| 8900 | Detector interno de inconsistência ("Sentinela") |
| 9005 | Lembrete local de fechar o dia |
| 9443 | Tutorial guiado por aba |
| 9692 | Tratamento do botão físico de voltar (Android) |
| 9840 | Painel de turno ao vivo |
| 9871 | Inteligência por dia da semana |
| 9877 | Cálculo de valor por hora |
| 10091 | Tela "Cadê" (fechamento diário em cartões) |
| 10314 | Geração de texto da tela "Cadê" |
| 10517 | Integração visual do sistema de níveis |
| 10638 | Compartilhar fechamento (v2.3) |
| 10661 | Isaac e o veículo dentro do cartão de compartilhar |
| 10861 | Recorde pessoal (v2.4) |
| 10885 | Retrospecto de domingo (v2.5) |

**Nota (`HISTÓRICO`):** o comentário-título da seção em 10091 ainda diz "Cadê — consultora
por voz". O recurso de voz foi removido; hoje a tela é em cartões, sem voz. Nomes e comentários
que mencionam "voz" no código são resquício, não comportamento atual.

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

As mesmas ressalvas de precisão de linha da seção 4 valem aqui.

## 4. Como usar este mapa — limitações

**Classificação: `INFERÊNCIA` / `NÃO CONFIRMADO`.**

- Os números de linha refletem o estado do código no momento desta auditoria — qualquer edição
  subsequente pode deslocá-los. Trate como ponto de partida para busca, não como referência
  permanentemente exata.
- Esta lista foi construída a partir dos comentários de seção existentes (`═══`); **não é
  confirmado** que ela cubra toda função relevante do arquivo — funções menores sem comentário
  de seção próprio podem existir dentro de cada bloco sem estarem listadas aqui individualmente.

## 5. Fora do escopo deste documento

O que cada função faz em termos de regra de negócio, por que ela existe, e qualquer avaliação
de risco ou qualidade sobre o código — isso tem documentação própria, privada, fora deste
repositório público.

---

**Fontes:** `docs/00-CONSTITUICAO.md` (taxonomia); código atual (`script.js`,
`supabase-service.js`, e demais arquivos listados na seção 1) como prova principal.

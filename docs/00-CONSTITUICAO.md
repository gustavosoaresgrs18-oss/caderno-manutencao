# 00 — Constituição da Base de Conhecimento do Copiloto

**Classificação deste documento:** PÚBLICO.
**Objetivo:** definir como esta base de conhecimento é organizada e classificada — é um
documento de metodologia, não de conteúdo de produto ou negócio.

## 1. As 8 classificações

Toda afirmação relevante nos documentos desta base carrega uma destas tags. Nenhuma tag se
transforma automaticamente em outra — a promoção de uma categoria para outra exige o gatilho
descrito abaixo, nunca inferência.

| Tag | Significa | Como vira isso |
|---|---|---|
| **ESTADO ATUAL DO CÓDIGO** | O que o código faz hoje, verificado por leitura direta. | Leitura de código com referência arquivo:linha. |
| **DECISÃO APROVADA** | Diretriz de produto/negócio que o dono do projeto confirmou explicitamente como válida. | Só por confirmação humana explícita — nunca por comportamento de código, nem por comentário antigo, nem por pesquisa. |
| **IDEIA** | Possibilidade levantada, ainda não decidida nem implementada. | Fica assim até uma decisão humana explícita a promover (para `DECISÃO APROVADA`) ou a arquivar. |
| **HISTÓRICO** | Fato do passado do projeto (ex.: um bug já corrigido, uma feature já removida), registrado para contexto, não como comportamento vigente. | Evidência em `git log`, comentário de código sobre correção passada, ou documento antigo. |
| **HISTÓRICO OPERACIONAL FORA DO REPOSITÓRIO** | Fato ocorrido na operação real do produto (ex.: no banco de dados), sem rastro no `git`. | Relato direto e confirmado por quem operou o sistema. |
| **PESQUISA** | Levantamento (mercado, técnico, financeiro) — informação, não estratégia. | Documento de pesquisa, sempre datado. |
| **INFERÊNCIA** | Conclusão deduzida de evidência indireta, sem prova direta. | Raciocínio explícito, sempre nomeado como inferência. |
| **NÃO CONFIRMADO** | Não há evidência suficiente em nenhuma das categorias acima. | Usada sempre que a prova disponível não sustenta nenhuma das tags acima. |

**Regra de ouro:** `ESTADO ATUAL DO CÓDIGO` não vira `DECISÃO APROVADA` sozinho; `PESQUISA` não
vira estratégia sozinha; `IDEIA` não vira roadmap sozinha; `HISTÓRICO` não é lido como
comportamento atual. A promoção entre categorias é sempre um evento explícito, registrada no
**registro privado de decisões** do projeto.

## 2. Um dono por tópico

Cada assunto tem **um** documento dono, onde o conteúdo completo mora. Os demais documentos
apenas referenciam pelo tema — nunca copiam o conteúdo de novo. Isso evita que uma correção
precise ser replicada em vários lugares e que duas versões do mesmo fato divirjam.

## 3. "Regras Sagradas" do código — como classificar

O código (`script.js`, `index.html`, `style.css`) cita repetidamente invariantes numerados nos
próprios comentários como "Regra Sagrada nº X" (ex.: nº 2 — o app nunca inventa um número que
falta, ele diz o que falta; nº 4 — vermelho/laranja na interface é sempre alerta real, nunca
decoração; nº 6 — a versão grátis nunca tranca o registro do dia; nº 10 — o registro local do
motorista nunca pode ser bloqueado por estado de conta/sincronização). Como esses comentários já
são código público (tracked no repositório), documentá-los aqui não expõe nada novo — mas **eles
não são automaticamente "constituição aprovada"**. Classificação correta:

- **Regras citadas como comportamento hoje presente no código** → `ESTADO ATUAL DO CÓDIGO`
  combinado com `INFERÊNCIA` (a intenção de produto por trás do comentário é deduzida, não
  confirmada por decisão humana registrada).
- **Regras citadas como justificativa de correção de um bug já resolvido** → `HISTÓRICO`.
- **Não existe, em nenhum arquivo do repositório, uma lista canônica única e completa** de todas
  as "Regras Sagradas" — apenas citações espalhadas pelos comentários. A enumeração exata
  (quantas existem, qual o texto oficial de cada uma) é **`NÃO CONFIRMADO`**.
- Nenhuma Regra Sagrada entra automaticamente como `DECISÃO APROVADA`. As diretrizes de produto
  que **de fato** foram confirmadas explicitamente pelo dono do projeto vivem na documentação
  privada do projeto (informação estratégica, fora deste documento público) — algumas delas
  coincidem em espírito com Regras Sagradas do código (ex.: "quando não sabemos um dado, não
  inventamos" ecoa a nº 2), mas são registradas como decisão por terem sido confirmadas
  diretamente pelo usuário, não por dedução do comentário.

## 4. Protocolo de atualização

- Qualquer agente pode propor uma atualização de `ESTADO ATUAL DO CÓDIGO`, `HISTÓRICO`,
  `INFERÊNCIA` ou `NÃO CONFIRMADO` com base em leitura direta de código/git.
- Só o dono do produto (usuário) pode gerar uma entrada `DECISÃO APROVADA` — e ela deve ser
  registrada com data no registro privado de decisões do projeto.
- `IDEIA` e `PESQUISA` podem ser adicionadas livremente por qualquer agente, desde que
  claramente rotuladas como tal e nunca apresentadas como decisão ou estado implementado.
- Antes de editar qualquer documento desta base, o agente deve conferir se o fato já tem um
  dono (seção 2) — se tiver, editar lá, não duplicar.

## 5. Índice da base

**Documentos públicos** (neste repositório, pasta `docs/`):
- `docs/00-CONSTITUICAO.md` (este documento)
- `docs/02-ARQUITETURA.md`
- `docs/03-MAPA-DO-CODIGO.md`

Existe também uma base privada de conhecimento, não versionada no repositório público.

**Fonte deste documento:** `CLAUDE.md` (regras já estabelecidas) + leitura direta do código
atual (grep de "Regra Sagrada").

# 💰 COPILOTO — Monetização: o que a pesquisa disse (set/2026)

Levantamento em 3 frentes: política das lojas, padrão de mercado no vencimento
de assinatura, e cobrança recorrente no Brasil. Tudo com fonte; o que não deu
pra confirmar está marcado.

---

## 1. O QUE MUDA UMA DECISÃO JÁ TOMADA

### 🔴 MEI NÃO SERVE PRA SOFTWARE — e isso estava no caminho crítico

Conferido na **fonte primária**: o Anexo XI da Resolução CGSN nº 140/2018 é a
lista fechada de ocupações do MEI, e **não existe programador, desenvolvedor de
software nem CNAE 62xx nela**. As únicas de informática são comerciante de
suprimentos, instrutor, técnico de manutenção e instalador de rede.

Abrir MEI com ocupação errada expõe a **cancelamento retroativo do CNPJ**.

O caminho certo é **ME no Simples Nacional**, CNAE **6203-1/00** (licenciamento
de programas não customizáveis) pra um app de prateleira. Limite R$ 360 mil/ano.
⚠️ A escolha do anexo (III vs V, Fator R) precisa de contador.

**Sem CNPJ:** dá pra receber (Stripe aceita PF, Asaas e Mercado Pago também),
mas o imposto vai pro **carnê-leão**, alíquota até 27,5% — pior que os 6% do
Simples assim que sair do zero.

### 🔴 A TAXA FIXA DESTRÓI MENSALIDADE DE R$ 7

A decisão guardada era "mensal baratíssimo, preço de 1 litro de gás/mês".
A conta com as tarifas reais:

| Cobrando R$ 7 POR MÊS | Custo | Sobra | Perde |
|---|---|---|---|
| Mercado Pago Pix (0,49%) | R$ 0,03 | R$ 6,97 | 0,5% |
| **Asaas — Pix Automático** | R$ 1,99 | **R$ 5,01** | **28%** |
| Hotmart (regra ≤ R$10) | R$ 1,40 | R$ 5,60 | 20% |
| Kirvano | R$ 2,52 | R$ 4,48 | 36% |
| Kiwify | R$ 3,12 | R$ 3,88 | 45% |
| **Efí — Pix Automático** | R$ 3,50 | **R$ 3,50** | **50%** |

| Cobrando R$ 70 POR ANO (= R$ 5,83/mês) | Custo | Sobra | Perde |
|---|---|---|---|
| **Asaas — Pix** | R$ 1,99 | **R$ 68,01** | **2,8%** |
| Stripe cartão + Billing | R$ 3,18 | R$ 66,82 | 4,5% |
| Kiwify | R$ 8,78 | R$ 61,22 | 12,5% |

**O inimigo é a taxa FIXA, não o percentual.** Em R$ 7, R$ 2,49 fixos custam
mais que 35% de comissão. **Anual derruba a taxa efetiva do Asaas de 28% pra
2,8% — dez vezes** — e ainda mata 11 momentos no ano em que ele pode cancelar.

⚠️ Contrapeso real: motorista de app tem fluxo de caixa apertado. R$ 70 de uma
vez é pedido muito maior que R$ 7. **Meio-termo: trimestral** (R$ 21 → Asaas
cobra 9,5%).

### 🟡 PIX AUTOMÁTICO EXIGE CNPJ, E NÃO DECOLOU

Em operação desde 16/06/2025 (IN BCB 511/2024). O FAQ do Banco Central é
explícito: só **pessoa jurídica com CNPJ ativo** pode ser recebedora — "não se
aplica a pessoas físicas". Não tem contorno.

O Asaas ainda exige **CNPJ ativo há ≥ 6 meses**.

E a adoção é baixa: melhor mês foi dez/2025 com **599 mil transações**, contra
2,7 bilhões via chave Pix — mil vezes menos. Conversão da autorização estimada
em 70–80%, ou seja **20–30% dos motoristas recusam na porta do banco**.

---

## 2. PLAY STORE — A REGRA, E A SAÍDA LEGÍTIMA

### O que vale HOJE no Brasil
- **Play Billing obrigatório** pra assinatura digital. "Veículo extra mensal"
  é bem digital, cai na mesma regra.
- **Link/botão pra pagamento externo é PROIBIDO.** A política cobre
  explicitamente botões, links, webviews, promoções e **até o fluxo de cadastro**.
- Link externo já vale em EUA e Europa. Cronograma oficial do Google põe o
  **resto do mundo (Brasil) em 30/09/2027**.
  ⚠️ O Brasil não é citado nominalmente — cai em "Rest of World" por exclusão.
- **Taxa: 15%** em assinatura (não 30% — isso só acima de US$ 1M/ano).
- **User choice billing** já inclui o Brasil: derruba pra 11%, mas **exige
  CNPJ** e é integrar um segundo processador DENTRO do app. Pra dev solo, os 4%
  economizados provavelmente não pagam a integração.

### ⭐ A SAÍDA: "consumption-only" (o modelo Netflix/Kindle)

Exceção **documentada pelo Google**: *"Google Play allows any app to be
consumption-only, even if it is part of a paid service"* — desde que nada seja
comprável dentro do app.

E o Google dá os exemplos de texto permitido: *"Go to our website to upgrade
your subscription to Premium"* — **sem link clicável**.

| Pode | Não pode |
|---|---|
| App na Play sem nenhuma compra dentro | Botão "Assinar" que abre navegador |
| Texto: "O Premium é ativado no site copiloto.com.br" | O mesmo texto como link clicável |
| Vender no site por Pix — **0% de taxa** | **Misturar**: Premium no Play + veículo por fora |
| WhatsApp, e-mail, Instagram — fora do app é livre | |

🚨 **REGRA DE OURO:** ou **tudo** no Play Billing, ou **nada** comprável dentro
do app. O híbrido é o que derruba conta.

⚠️ **NÃO CONFIRMADO — o campo de resgatar código.** A política não trata
explicitamente de um campo onde o motorista digita um código comprado fora. É
interpretação, não regra escrita. **Mitigação:** chamar de "ativar conta" ou
"entrar com sua licença", nunca "resgatar código de compra", e não citar preço
na mesma tela.

### Ironia útil: o iPhone no Brasil está À FRENTE
Acordo Apple × **CADE** anunciado em 23/12/2025 (105 dias pra implementar,
vigência 3 anos, multa de até R$ 150 milhões). No Brasil:
- texto estático sem link → **0% de taxa**
- botão clicável levando ao site → 15%

⚠️ Fonte secundária (MacRumors); não confirmado na doc oficial da Apple.

---

## 3. VENCIMENTO DA ASSINATURA — O PADRÃO DE MERCADO

Pesquisados: Dropbox, Google One, Evernote, Notion, Airtable, Trello, Figma,
Canva, Mailchimp, Slack, **Fleetio**.

### O padrão (7 de 10)
> **Nada é apagado. Nada vira invisível. O que trava é CRIAR COISA NOVA.**

### ⭐ FLEETIO — validação direta do nosso desenho
App de **frota que cobra POR VEÍCULO**. O que ele faz:
- *"Archiving a Vehicle retains all its historical data"*
- veículo arquivado é **somente leitura** e **restaurável a qualquer momento**
- *"Archived Vehicles are **not counted against your plan vehicle allotment or
  per-vehicle subscription fees**"*

É exatamente a v4.19. O concorrente mais próximo do nosso problema chegou na
mesma solução — isso é o sinal mais forte da pesquisa inteira.

### O que é prática RUIM (com reação real)
- **Apagar por excesso de cota.** Só o Dropbox faz. Usuário perdeu o prazo,
  voltou, e os arquivos não estavam nem na lixeira. Existe post de blog chamado
  *"Dropbox keeps threatening to delete my files"*.
- **Sequestrar o que já é do usuário.** A Evernote **não apagou nada** e mesmo
  assim virou tópico *"Evernote taking the notes hostage for free users"*.
  ⚠️ **Lição dura: downgrade correto com comunicação ruim gera raiva igual.**
- **Tirar o que já funcionava** = "bait-and-switch" (Evernote 2016 e 2023,
  LastPass 2021 — a Forbes escreveu matéria recomendando concorrentes).
- **Travar sem dizer o que fazer.** Figma trava a edição e o usuário abre
  chamado sem entender; a saída existia, o app só não disse.
- **Deixar o sistema escolher em silêncio.**

### Boas práticas destiladas
1. Nunca apagar, nunca esconder. O limite morde na **criação**.
2. Somente-leitura é o freio certo (modelo Fleetio).
3. Entregar **até o fim do ciclo pago**, sempre.
4. **O usuário escolhe quem fica ativo — ANTES do vencimento.** Se ele ignorar,
   aplicar critério **anunciado na tela** e **reversível**.
5. Escada de aviso longa e com data. (Google avisa 3 meses antes.)
6. **Sempre poder exportar** — no Brasil isso é **LGPD art. 18, V** (portabilidade),
   não cortesia.
7. Voltar a pagar devolve tudo **na hora**.
8. Dizer **o que fazer**, não só o que travou.

---

## 4. O QUE FICOU EM ABERTO
- Duolingo Super e LinkedIn Premium: não achei fonte primária do comportamento
  dentro do app. **Teste de 10 minutos: instalar e olhar a tela.**
- Drivvo: FAQ carrega por JS, wiki bloqueia robô. Limite de veículos do grátis
  **não confirmado**.
- Mercado Pago: doc se contradiz sobre Pix recorrente (visão geral diz que
  aceita; plano associado exige `card_token_id`).
- Pagar.me e PagBank não publicam taxa de assinatura.
- Status processual do Epic × Google: fontes conflitantes — **mas não muda nada**,
  porque o Google já publicou e executou o cronograma no blog oficial.

# 🚦 COPILOTO — Status pro lançamento (07/set/2026 · v4.19)

Levantado NO CÓDIGO, não de memória. Cada item foi conferido.

---

## PARTE 1 — RESPOSTAS ÀS 3 PERGUNTAS

### 1.1 Relatório de 3 meses — **não existe, mas está a uma função de distância**

**O que existe hoje:**
- `calcPeriodo(modo, offset)` aceita só **`'mes'` e `'semana'`**
- O Extrato de Finanças já soma receita, taxa, combustível, despesas e lucro
  do período, dia a dia
- **`exportarFinPDF()` e `exportarFinCSV()` JÁ EXISTEM e funcionam** — geram
  PDF com cabeçalho, totais e tabela diária
- O relatório do mês (carta do Isaac) é **um mês por vez**, com setas

**O que falta:** um terceiro modo em `calcPeriodo` — `'trimestre'`, que volta
3 meses a partir do mês atual. **Uma função, um botão.** O PDF e o CSV saem de
graça, porque já leem `per.iniISO`/`per.fimISO`.

#### ⚠️ MAS: cuidado com a palavra "comprovante de renda"

O motivo que você deu (financiar carro) tem uma armadilha. **Banco não aceita
PDF que o próprio app do cliente gerou.** O que tem peso é extrato BANCÁRIO e
o extrato da PLATAFORMA — documento de terceiro. Um PDF do Copiloto dizendo
"ele ganha R$ 3.000" é declaração dele sobre ele mesmo.

Prometer "comprovante de renda" e o gerente recusar no balcão queima a
confiança de um jeito que não se recupera.

**As duas coisas que o app PODE fazer, e que são honestas:**

**a) Dizer a ele quanto de parcela cabe** — e isso é ouro, é lupa, e é pago:
> *"Nos últimos 3 meses sobrou em média R$ 594/mês. Uma parcela de R$ 800 não
> cabe — em nenhum dos 3 meses sobrou isso."*
> Ninguém faz essa conta pra ele. Nem o banco, que só quer saber se aprova.

**b) Juntar os extratos das plataformas** que ele mandou (que **são** documento
de terceiro) com os custos medidos. Isso dá ao PDF a credibilidade que o app
sozinho não tem: *"a Uber pagou R$ X conforme os extratos anexos; os custos
foram R$ Y; sobrou R$ Z."*

#### ⚠️ E o sequenciamento importa
Ninguém tem 3 meses no dia do lançamento. **Nem você** (tem ~2). O valor disso
aparece no mês 4. **Não é bloqueador de lançamento** — é a primeira coisa boa
pra entregar DEPOIS, quando os testadores já tiverem histórico.

---

### 1.2 O print do extrato da plataforma — **está PRONTO, só não foi testado**

Conferido: as 8 funções existem, o botão e o modal estão no HTML.

**O caminho:** Finanças → *"Mandar extrato da plataforma"* → abre a **galeria**
(não a câmera: o print está no celular dele) → lê os três números → confere se
a conta fecha (`bruto − taxa = líquido`, folga de R$ 0,05) → mostra pra ele
conferir → ele diz de qual plataforma é → salva.

**Onde aparece hoje:**

| Onde | Grátis? | O que mostra |
|---|---|---|
| Lista na tela Finanças | ✅ sim | `Uber · 24-31 ago · R$ 35,79 · 2,8%` |
| Carta do mês | ❌ pago | *"Do que os passageiros pagaram, R$ 35 ficaram com a Uber (3%). Isso é o que estava no extrato que você mandou (24 a 31 de ago) — não o mês fechado."* |

**⚠️ O QUE FALTA, E É O MELHOR PEDAÇO: a lupa NÃO usa o extrato.**
Conferido: nenhum achado da lupa olha `extratosDoMes`. Ou seja, hoje o Isaac
só **repete** o número. Ele ainda não **compara**. As análises que o dado já
permite e ninguém entrega:
- *"A Uber ficou com 3% e a 99 com 16,7%. Rodando o mesmo na Uber, teria
  sobrado R$ X a mais."*
- *"Sua taxa subiu de 3% pra 8% em dois meses."*

Isso é diferencial que **nenhum concorrente tem**, porque nenhum deles vê o
extrato dele.

**Nunca testado:** o fluxo inteiro num aparelho de verdade.

---

### 1.3 O que é pago e o que é grátis — **proposta**

Regra que decide: **o que ele já registrou é dele (espelho, grátis). O que eu
descobri cruzando os registros é meu (lupa, pago).**

#### GRÁTIS — pra sempre, sem trancar
- Fechamento do dia, velocímetro, R$/hora, custo/km, reserva
- **Lançar tudo**: receita, abastecimento, despesa, manutenção, documento
- Alertas de manutenção e de vencimento de documento
- Isaac diário + balanço da semana
- Streak, patente
- **Foto do odômetro e do cupom (OCR)** ← nunca trancar: é o que faz ele
  registrar, e sem registro o pago não tem o que analisar
- **Lista dos extratos da plataforma** (o fato cru do bolso dele)
- Conta, nuvem, backup, exportar os próprios dados (**LGPD art. 18**)
- **2 veículos**

#### PAGO — R$ 12/mês
- **A carta do mês** (fechamento mensal narrado)
- **A lupa**: dia da semana campeão, posto mais caro, faturar ≠ ganhar
- **Meses anteriores** (o corrente já mostra que existe)
- **Resumo de 3 meses + a conta da parcela** (quando existir)
- **Comparação entre plataformas** (quando a lupa ler o extrato)
- **Comparação entre veículos**: carro × moto, R$/km de cada

#### ⭐ Sugestão: o PRIMEIRO mês fechado vem de graça
Hoje ele vê só o teaser trancado. Ler **uma** carta inteira converte muito mais
que ler a descrição dela — e o custo é zero, porque quem não pagaria também não
pagaria depois do teaser. Depois do primeiro, tranca.

---

## PARTE 2 — O QUE JÁ ESTÁ PRONTO ✅

### Produto
- 6 telas: Início, Manutenção, Combustível, Finanças, Documentos, Isaac
- Fechamento do dia com turno, km, reserva, streak e patente
- Cadeia de km com correção, veículo trocado e recusa de número furado
- Combustível: consumo, R$/L, custo/km, comparação de tipo, aviso de preço
- Manutenção por veículo, com alerta por km
- Documentos com vencimento
- Isaac: texto diário, balanço da semana, carta do mês, lupa
- Simulador, extrato de finanças e de combustível **com PDF e CSV**
- Compartilhar o mês como **imagem** e como texto

### Técnico
- App Android nativo (Capacitor 8) · `targetSdk 36` ✅ (Play exige recente)
- `applicationId br.app.copiloto` · só a permissão **INTERNET**
- **OCR por foto** (ML Kit embarcado — offline, sem servidor, sem conta de API)
- Notificação local (lembrete de fechar o dia)
- Supabase: 9 tabelas, RLS, fila offline, restauração ao trocar de aparelho
- **Premium no banco com cofre de colunas** (v4.15)
- **Veículo ativo atravessa aparelhos** (v4.17)
- **Limite de 2 veículos + dar baixa** (v4.19)
- Sentinela (log de erro do dono)
- Página de privacidade e **exclusão de conta** (exigência da Play)
- Ícone e splash

---

## PARTE 3 — O QUE FALTA

### 🔴 BLOQUEIA A PUBLICAÇÃO
| # | O quê | Por quê |
|---|---|---|
| 1 | **Conta Play Console — US$ 25** | sem isso não existe publicação. Travado por dinheiro |
| 2 | **12 testadores × 14 dias CONSECUTIVOS** | exigência do Google pra conta pessoal. É o item de RELÓGIO: começa cedo |
| 3 | **Keystore de release + assinar o AAB** | hoje só existe build debug. `versionCode 1`, sem `signingConfig`. ⚠️ **perder o keystore = nunca mais atualizar o app** |
| 4 | **Ficha "Segurança dos dados"** | declarar o que coleta (e-mail, dados do veículo). Errar aqui derruba a publicação |
| 5 | **Decidir Play Billing × consumption-only** | ver PESQUISA_MONETIZACAO. O híbrido derruba conta |
| 6 | **SMTP com domínio próprio** | hoje o remetente `onboarding@resend.dev` só entrega pro e-mail da conta Resend. **Recuperação de senha não chega em ninguém** |

### 🟡 NÃO BLOQUEIA, MAS DEVERIA ENTRAR ANTES
| # | O quê |
|---|---|
| 7 | **Subir a v4.19** — SQL + git + build (ainda não rodou) |
| 8 | **Testar o veículo ativo nos 2 aparelhos** (v4.17 nunca validada de ponta a ponta) |
| 9 | **Testar o print do extrato** num aparelho real |
| 10 | **Autocompletar o nome do posto** — "Posto Tupi"/"posto tupi"/"TUPI" são 3 postos, e a lupa de posto (que é o pitch de venda) nasce quebrada |
| 11 | **Abastecimento por foto salva o posto VAZIO** — alimenta o mesmo buraco do item 10 |
| 12 | **Marca no INPI**: 2 pedidos vivos de "Copiloto" (classes 9 e 42). Resolver antes de investir em nome |

### ⚪ DEPOIS DO LANÇAMENTO
- Relatório de 3 meses + conta da parcela
- Lupa lendo o extrato (comparação entre plataformas)
- Comparação carro × moto
- Senha de resgate (desenho pronto no RETOMADA_7)
- Fatia 2 — métricas do dono

---

## PARTE 4 — PONTOS DE ATENÇÃO

**🔴 Nada disso foi testado com um motorista que não é você.** Todo teste até
hoje foi seu, no seu aparelho, com seus dados. O 1º testador vai achar coisa
que a gente não imagina.

**🔴 Bugs conhecidos e abertos:**
- Turno que atravessa a meia-noite quebra o streak
- Vírgula no odômetro: "105,387" vira 105 vírgula 387
- `data_ultima` da manutenção vai como hoje/null
- Sentinela não reporta erro antes do login
- APK engordado por 4 modelos de idioma do ML Kit que não usamos

**🟡 O Supabase grátis pausa após 7 dias sem uso.** Com testador de verdade
some sozinho — mas até lá, cuidado.

**🟡 Espaço NÃO é problema** (medido: 11 MB, dos quais ~10 MB é esqueleto do
projeto). A única tabela que merece faxina é `erros`.

**🟢 A tela inicial está boa** — validada no A55.

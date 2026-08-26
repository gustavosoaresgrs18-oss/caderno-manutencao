# 🚦 COPILOTO — Ponto de retomada (v3.82)

Cole este arquivo na primeira mensagem da conversa nova, junto dos arquivos ATUAIS (baixados DO GITHUB).
**Versão atual: v3.82** · `?v=390` · Hospedagem: GitHub Pages · **Supabase: Fatia 1 COMPLETA ✅**

---

## 🎯 ONDE PARAMOS — LEIA ISTO PRIMEIRO

**Meta: app na Play Store antes do Natal de 2026.**

A sessão v3.61 → v3.81 fechou quatro frentes (ver o bloco novo mais abaixo)
As duas primeiras: **os avisos passaram a apontar o culpado** e o
**passe visual inteiro** (tipografia, contraste, botões, cabeçalho, rodapé).

O app está pronto pra ser visto por motorista. O que trava agora **não é código**.

### ✅ O QUE JÁ ESTÁ FEITO

| Frente | Estado |
|---|---|
| Integridade de dados (3 bugs silenciosos) | ✅ v3.48→v3.60 |
| Recuperação de senha (SMTP Gmail) | ✅ v3.56, testada ponta a ponta |
| Política de privacidade + exclusão de conta | ✅ v3.56 |
| Categoria da despesa na nuvem | ✅ v3.60 |
| Service worker offline confiável | ✅ v3.60 |
| Aviso de km errado aponta o registro | ✅ v3.61→v3.62 |
| Emojis → SVG (54 ícones) | ✅ v3.62 |
| Extrato mostra 5 + "ver mais" | ✅ v3.63 |
| Avisos dizem quantos dias faltam | ✅ v3.64, v3.67 |
| Simulador para de se repetir | ✅ v3.65 |
| Ajustes encolheu 40% | ✅ v3.66 |
| Escala tipográfica + contraste | ✅ v3.68 |
| Velocímetro + botão principal único | ✅ v3.69 |
| Cabeçalho e rodapé | ✅ v3.70 |

### 🔴 O QUE FALTA — em ordem, e nada disso é código

1. 🔴 **Abrir conta no Google Play Console** — US$ 25, conta PESSOAL
2. 🔴 **Recrutar 12 motoristas** — item com prazo mais imprevisível, depende de gente
3. 🟡 **Tirar os prints da Play Store** — é agora que ficam bons (o visual acabou de ser refeito)
4. 🟡 **Lembrete de manutenção por DATA**, não só por km (vai junto com `data_ultima`)
5. ⬛ **Outubro: Capacitor** — decisão fechada

---

## ⚙️ INFRAESTRUTURA

- **Site:** https://gustavosoaresgrs18-oss.github.io/caderno-manutencao/ (⚠️ barra `/` no final)
- **Repositório:** `caderno-manutencao` (GitHub, Public). User: `gustavosoaresgrs18-oss`
- **Pasta local:** `C:\dev\caderno-manutencao`
- **Email suporte:** app.copilotosup@gmail.com
- **Páginas públicas (vão pro Play Console):**
  - `/privacidade.html` — política de privacidade
  - `/excluir-conta.html` — pedido de exclusão de conta

### Supabase — COPILOTO - BR
- **URL:** https://mrnvapqxomyecbjyjobw.supabase.co
- **Publishable key:** `sb_publishable_VO10AiANSgnMfNFS9e-KWA_K8ZhFnQW`
- ⚠️ NUNCA usar a secret key no front-end (RLS protege tudo)
- **7 tabelas:** veiculos, financas, abastecimentos, manutencao, documentos, despesas, perfil
- **Confirmação de e-mail:** DESLIGADA · **Região:** São Paulo (sa-east-1)

### ✅ SMTP — resolvido sem domínio próprio

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `app.copilotosup@gmail.com` |
| Sender email | igual ao username |
| Password | senha de app do Google (16 letras, exige 2FA) |

Limites: 30/hora (Supabase) e ~500/dia (Gmail). O aviso amarelo do Supabase sobre Gmail ser
provedor "pessoal" é esperado.

### SQLs rodados (repetíveis)
1. `supabase-permissoes.sql` — GRANT + chaves únicas
2. `supabase-manutencao.sql` — chave única (usuario_id, veiculo_id, tipo)
3. `supabase-limpar-testes.sql` — esvazia as tabelas (só enquanto for teste!)
4. `supabase-excluir-conta.sql` — função `excluir_minha_conta()` (v3.56)
5. `supabase-despesa-categoria.sql` — coluna `cat` + backfill (v3.60)

### Como subir
```
git add .
git commit -m "vX.X - descricao"
git push
```
Uma linha de cada vez (as 3 coladas dão `unknown switch 'm'`).

⚠️ **REGRA:** ao mexer em script.js / style.css / supabase-service.js, **subir o `?v=NNN`** no index.html.

**Tamanho (v3.82):** script.js 6.922 · index.html 1.295 · style.css 1.430 · supabase-service.js 836 · sw.js 100

---

## 🆕 O QUE MUDOU DA v3.61 À v3.70

### 1. Os avisos passaram a apontar o culpado (v3.61 → v3.62)

O detector de km furado funcionava, mas dizia *"1 abastecimento com o km errado ficou de
fora"* **sem dizer qual** — e na lista o registro ruim era idêntico aos outros. Aviso que não
aponta o culpado não é aviso, é ruído.

- Aviso do extrato **nomeia cada um**: dia · posto · valor, e o motivo com os números
- O registro fica com **borda vermelha**, o selinho de preço some e entra o motivo
- Onde apareceria o R$/km dele, aparece **"não conta"**
- **O km passou a aparecer na lista** — o app pedia "corrija o km" num registro onde o
  motorista não conseguia nem VER o km atual
- Início e aba Combustível dizem *"sem o de qui, 20/08 · Posto Tupi · R$ 60,00"*
- **A aba Combustível ainda apagava o número inteiro** por causa de um registro ruim — a
  v3.61 corrigiu na Início e esqueceu essa tela (o padrão "regra copiada que diverge" de novo)

### 2. Emojis → SVG (v3.62)

**54 ícones** num sprite dentro do index.html, com `currentColor`. Régua respeitada: *SVG
onde é informação, emoji onde é emoção*. Ficaram emoji: Caramelo/Isaac, 🔥 streak, 🏆
recorde, 🐷 cofrinho, 🎉 celebração, 👋 👍.

Os 🟢🟡🔴 viraram **bolinha CSS** (`.dot`).

**Motivo prático:** cada Android desenha emoji com a fonte dele — e o print da loja sai de um
aparelho só.

⚠️ **Continuam emoji de propósito:** toasts (são `textContent`), compartilhar no WhatsApp e
PDF/CSV. Lá o texto SAI do app e SVG viraria tag escrita.

**Descoberta:** existiam **dois conjuntos de ícones**. O painel de manutenção do Início usava
`LUZ_SVG` (galão de óleo) e a tela Manutenção usava `MNT_ICONES` (gota). Mesmo item, desenho
diferente. Unificados.

### 3. O app parou de mandar fazer o que já foi feito (v3.64, v3.67)

O padrão era o mesmo em dois lugares: o aviso era texto fixo, e dava a **mesma frase** pra
quem nunca registrou nada e pra quem já tinha feito metade do trabalho.

**Simulador (v3.64)** — dizia *"Use o Bora rodar e registre suas receitas"* pra quem rodou
ontem certinho. Agora diz qual metade falta:

| Situação | O que diz |
|---|---|
| Nada registrado | "Ainda não tenho nenhum dia completo" |
| Só receita, sem slider | **"Falta marcar suas horas"** |
| Só slider, sem receita | **"Falta registrar a receita"** |
| 1 dia completo | "Falta 1 dia pra eu te responder" |
| Turno < 30 min | "Seus dias estão curtos demais" |

**Abas Hoje/Semana/Mês (v3.67)** — mesma coisa. Agora dizem a contagem real:
*"Hoje já está registrado — o que falta é o resto. Com 3 dias eu ainda não sei qual é o seu
normal, e com menos de 5 a média é chute. Faltam 2 dias."*

Réguas de cada aba: **Hoje** = 5 dias anteriores · **Semana** = 3 dias · **Mês** = 1 dia.

### 4. Extrato: 5 abastecimentos + "ver mais" (v3.63)

Despejava tudo do período. Com 7 já vira parede; num mês real são 15 a 20.

⚠️ **Exceção deliberada:** o registro com km errado aparece **sempre**, mesmo fora dos 5 — o
aviso manda "ache o registro marcado de vermelho na lista", e se ele estiver escondido o
aviso vira caça ao tesouro.

O corte é **só visual**. PDF, CSV e todos os cartões do topo usam `doPeriodo` (a lista
completa).

### 5. Ajustes encolheu de 778px pra 483px (v3.66)

Critério: **frequência manda no tamanho**. Trocar de veículo é toda semana; excluir a conta é
uma vez na vida.

- Aberto: Perfil, Meus veículos
- Dobrado: **"Conta e cópia de segurança"** e **"Apagar dados e excluir conta"**
- "Salvar nome" só aparece quando o nome muda

⚠️ O título diz "excluir conta" com todas as letras **de propósito** — a Play Store exige que
o caminho de exclusão seja fácil de achar. "Avançado" não cumpriria.

### 6. Passe visual (v3.68 → v3.70)

| | Antes | Depois |
|---|---|---|
| Tipografia | **32 tamanhos**, texto de 8px | **6 degraus** (`--f1`…`--f6`), piso 11px |
| Contraste `--faint` | 2,86:1 (reprovado) | **4,6:1** (`#7C8DA0`) |
| Botão principal | 3 formas, 3 pesos, brilho colorido | 1 forma, cor pelo assunto |
| Verde | usado até em "adicionar documento" | só onde é dinheiro |
| Velocímetro | 185px, número transbordando | 240px, cabe até −R$ 1.250 |
| Cabeçalho | 2 círculos brigando, vazio em L | ícones sem caixa, alinhados |
| Rodapé | oceano de preto | assinatura no pé |

**A escala mora no `:root`** e está documentada — quem mexer depois usa um dos seis. Acima de
24px ficam soltos (velocímetro, cofrinho, streak): são números de espetáculo, não texto.

**Por que o número do velocímetro transbordava:** não era o tamanho, era o **lugar**. Ficava
em `top:50%`, no meio do arco — e no meio o semicírculo já estreitou (vão de ~149px, e
"R$ 87,50" em 34px ocupa 150). Descendo pra parte larga, o vão vai a ~177px.

**Por que tirei o brilho dos botões:** sombra colorida atrás de botão é o recurso que mais
data uma interface — faz o botão parecer adesivo colado, não parte do app.

**Por que "+ Adicionar documento" deixou de ser verde:** verde no app significa "dinheiro que
fica no seu bolso". Gastar o verde numa ação que não tem a ver com dinheiro enfraquece o
significado em todas as outras telas.

### Erros de português corrigidos no caminho
- "1 abastecimento ... **ficaram** de fora" → ficou
- "No mesmo preço **de os** 4 anteriores" → que os
- "**Faltam** 1 dia" → Falta 1 dia
- `1.8 km/L` → `1,8 km/L` (vírgula, em 3 lugares)

---

## 🆕 O QUE MUDOU DA v3.71 À v3.81

### 7. Carta do Isaac — o relatório mensal (v3.72)

Saiu da Fatia 3 e entrou agora. **Não é painel: é carta.** O Isaac narra o mês em 1ª pessoa
com os números dele (dias rodados, receita, taxa, combustível, despesas, lucro, R$/hora,
custo/km, melhor dia, comparação com o mês anterior). Compartilhável no WhatsApp e em card
de imagem.

A divisão grátis/pago cai naturalmente: **narrar é espelho** (grátis), **apontar é lupa**
(pago). *"Você gastou R$ 38 a mais no Ipiranga que no Tupi"* é lupa e fica pra Fatia 3.

⚠️ Duas frases foram reescritas por serem tecnicamente certas e humanamente erradas:
*"a bomba levou 104%"* (lê-se como erro de conta) e um comentário cínico sobre o motorista
do lado, num mês em que ele descobriu que trabalhou de graça.

### 8. BUG SILENCIOSO: `salvarLS`/`lerLS` (v3.72)

`salvarLS` gravava string crua e `lerLS` fazia `JSON.parse` — que engasgava. Efeito real:
**`ultimoTipoComb` nunca era lembrado.** Todo motorista de GNV, Etanol ou Diesel reescolhia
o tipo de combustível a cada abastecimento, pra sempre. Nada avisava.

### 9. Isaac com o veículo do motorista nos cards (v3.73)

Nos dois cards (dia e mês), o Isaac aparece com **o veículo que ele usa** — carro ou moto,
lido do veículo ativo. As cores dos SVG precisaram ser **resolvidas em tempo de execução**
(`var(--coat)` não existe dentro de um `data:` URL: o Isaac saía preto).

### 10. O PISO POR KM ⭐ (v3.76 → v3.79)

**O maior recurso desta sessão.** O motorista tem ~7 segundos pra aceitar. Vê "R$ 12" e
"5 km" e pensa R$ 2,40/km — mas com 4 km até o passageiro foram 9 km, e o real é R$ 1,33.
É aí que mora o *"troca dinheiro e acha que tá no lucro"*.

**Piso = custo real por km + (meta ÷ horas típicas) ÷ km/h real.** Tudo medido do histórico
dele, nada de média de mercado.

⚠️ **O piso sozinho não bastava** — ele ainda teria que DIVIDIR. Por isso existe a **tabela
de multiplicação pronta** (5/10/15/20 km), que sempre **arredonda pra cima**: arredondar pra
baixo faria o app autorizar corrida abaixo do próprio piso que ele mandou decorar.

**Onde mora:** dentro do guia (aba do Isaac), não na Início. Foi tentado na Início e virou o
segundo maior bloco da tela, disputando espaço com o velocímetro. Régua se consulta, não se
acompanha. O Isaac chama pra ver em 2 momentos só: quando o piso **nasce** e quando ele
**mexe mais de 15%** (`avisarPisoSeMudou`).

### 11. Tutorial guiado — refeito em capítulos por aba (v3.80 → v3.82)

**v3.80** nasceu com 6 passos, todos na tela Início, e acabava ali — **as outras cinco abas,
onde está metade das rotinas, nunca eram apresentadas.**

**v3.82** virou **um capítulo por aba** (19 passos no total):

| Capítulo | Passos | O que apresenta |
|---|---|---|
| Sua tela de todo dia | 5 | velocímetro · hora/km/reserva · Bora rodar · odômetro · luzes |
| Manutenção | 2 | registrar uma vez · o que a cor significa |
| Combustível | 3 | lançar o tanque · custo medido vs. estimado · comparação de preço |
| Finanças | 4 | conta aberta · receita · despesas · projeção |
| Documentos | 2 | avisar antes de vencer · o badge na aba |
| Eu, o Isaac | 3 | leitura do dia · carta do mês · **o piso por km** |

Regras: cada capítulo roda **uma vez** (marcado por aba em `tutCapsVistos`); o Início vem
sempre primeiro; **pulou 2 capítulos → desliga o resto** (ele já disse o que queria); alvo
que não existe na tela é pulado, nunca trava.

**Design (v3.82):**
- ⚠️ O balão usava `left:14px; right:14px` e **esticava a tela inteira** — num monitor virava
  uma faixa de 1900px com uma frase no meio. Agora respeita a caixa do app (358px)
- **Cada passo tem título.** Sem ele o motorista lia um parágrafo solto sem saber sobre o quê
- **A troca de rotina ficou visível:** anel que pulsa sobre o alvo novo + balão que entra de
  baixo. Antes o holofote deslizava em silêncio e parecia o mesmo assunto
- Faixa de capítulo no topo (ícone + nome da aba + `2/5`), barra de progresso e seta apontando
  pro elemento em foco

**Texto:** gatilho mental é dar **peso** ao que o app faz de verdade, nunca prometer o que ele
não faz. Cada frase tem lastro em código — *"outros apps estimam, eu meço"*, *"R$ 15 por dia
é R$ 450 no mês"*, *"você registra uma vez, eu conto pra sempre"*.

### 12. Botão voltar do Android (v3.71)

No navegador não faz nada; no Android fecharia o app inteiro no meio de um lançamento.
Ordem: fecha modal → volta da sub-tela → volta pro Início → só então sai.

### 13. A saída do beco do km errado (v3.81) ⚠️ IMPORTANTE

**Buraco encontrado pelo dono do produto:** um abastecimento marcado como "km errado" ficava
fora da conta **pra sempre**, com alerta vermelho **pra sempre**, e não havia como dizer
*"eu conferi, foi isso mesmo"*. E acontece de verdade: quem põe R$ 50 (7 L) e roda 9 km até
o próximo abastecimento tem 1,3 km/L reais naquele registro. O app cobrava uma correção
impossível — não havia o que corrigir. **Mesmo beco que a v3.32 fechou no km do turno.**

Agora existe **"Está certo, pode contar"** em dois lugares: no selinho do registro (extrato
e lista) e dentro do modal de edição — que é onde o *"Corrigir agora →"* larga o motorista.
Marca `kmOk: true` no registro, ele volta pra conta e o selinho vira *"Km conferido por
você · desfazer"*. Dá pra voltar atrás — senão seria outro beco.

⚠️ **`kmOk` NÃO sobe pra nuvem** (a tabela `abastecimentos` não tem essa coluna). Trocando de
aparelho, o registro volta a ser marcado como furado. Corrigir com um `ALTER TABLE` quando
for mexer no Supabase de novo.

### 14. "Alguns dias" virou número (v3.81)

O card do piso dizia *"marque o Bora rodar e o km por alguns dias"*. O dono do produto
perguntou **quantos** — e o app sabia: são **2**. Agora conta o que ele já tem:
*"São 2 dias com o Bora rodar marcado e o km fechado. Você já tem 1, falta 1."*
Espera vira progresso.

Junto: **meta zerada** caía no ramo errado e mandava marcar turno — ele marcaria a semana
inteira e o piso não nasceria nunca. Agora diz *"toque na meta, ali no velocímetro"*.

### 15. Sair da conta era um beco (v3.81)

A tela de login pós-logout não tinha X, não tinha cancelar e **não tinha cadastro**. Quem
emprestou o aparelho, digitou o e-mail errado ou quis recomeçar só tinha uma saída:
desinstalar. Agora tem **"Criar uma conta nova"** — com aviso claro de que a conta antiga
continua na nuvem e que este aparelho será limpo.

Junto: `#modalConfirm` estava em `z-index:50` e o login em 150 — a confirmação nascia
**atrás** do login e a tela parecia travada. Agora o confirm é 160 (acima de tudo).

---

## 🏪 GOOGLE PLAY — o que já foi descoberto

### 1. Conta pessoal exige 12 testadores por 14 dias
Contas **pessoais** criadas depois de 13/11/2023 precisam de **12 testadores inscritos sem
interrupção por 14 dias** antes de pedir acesso à produção.

⚠️ **Não é obstáculo, é o plano.** Você já queria 12 motoristas testando.

### 2. ❌ MEI NÃO SERVE — nem o próprio, nem de terceiro
Software não está na lista do MEI (CNAEs 6201–6209 excluídos). Usar o MEI de alguém exporia
essa pessoa a **cancelamento retroativo, recálculo de impostos e multas**.

**Caminho certo:** conta pessoal agora (app nasce grátis). Quando o Premium existir, abrir
**ME/SLU no Simples Nacional**. Confirmar com contador.

### 3. GPS em segundo plano tem revisão própria — e reprova
Exige formulário de declaração, **vídeo de até 30s**, aviso dentro do app, política de
privacidade com link ativo (✅ existe) e **um** recurso de localização por submissão.

Reprovação mais comum: *"isso poderia funcionar em primeiro plano"*.

⚠️ **Submeter em OUTUBRO.** E o app nativo precisa **nascer funcionando sem GPS de fundo**.

### 4. Exclusão de conta obrigatória — ✅ resolvido (v3.56)
Dois caminhos: dentro do app (Ajustes → "Apagar dados e excluir conta") e endereço na web
(`/excluir-conta.html`).

---

## 🔮 APP NATIVO — decisão fechada: CAPACITOR

| Caminho | Veredito |
|---|---|
| **Capacitor** | ✅ **ESCOLHIDO** — embrulha o app atual |
| React Native / Flutter | ❌ reescreve 5.669 linhas de JS + 1.243 de CSS que funcionam |
| Kotlin nativo | ❌ pior ainda, e só Android |

### O que só existe fora do PWA
- GPS medindo o trajeto de verdade (o PWA só consegue linha reta — ver v3.54)
- Notificação confiável (Fatia 4 depende disso)
- Rodar em segundo plano

### Leitura de tela (Accessibility)
Continua a coisa mais cara e arriscada de construir, pra chegar em 3º onde StopClub e GigU
têm anos de vantagem. **Não entra antes do lançamento.**

---

## 📅 CRONOGRAMA ATÉ O NATAL

**Setembro** — ✅ base fechada
- ✅ Integridade de dados · ✅ Recuperação de senha · ✅ Privacidade + exclusão
- ✅ Avisos que apontam o culpado · ✅ Passe visual completo
- 🔴 Abrir Play Console
- 🔴 Começar a recrutar os 12 motoristas
- 🟡 Tirar os prints da loja

**Outubro** — virar app
- Capacitor embrulhando o app atual
- Build funcionando **sem** GPS de fundo
- Subir no canal de teste fechado (já dá pra testar com motorista aqui)
- Em paralelo: vídeo + aviso e submeter a declaração de localização

**Novembro** — os 14 dias
- 12 motoristas rodando de verdade
- Corrigir o que aparecer
- Pedir acesso à produção
- GPS de fundo entra quando for aprovado (é melhoria, não bloqueio)

**Dezembro** — produção

---

## 🔜 PENDÊNCIAS

### 🟡 Melhoram o teste com motoristas
- [ ] **Lembrete de manutenção por DATA**, não só por km (junto com `data_ultima`)
- [ ] **Testar no celular de verdade** o passe visual — foi todo validado em navegador de
      desktop simulando 390px. O ponto da mudança é o que se lê com o telefone no suporte
- [ ] **Registrar abastecimento pela aba Combustível** — falta confirmar que NÃO mostra
      streak (pelo turno já foi testado nos dois caminhos)

### 🟡 Ficaram apertados no passe visual (olhar no celular)
- [ ] **Detalhe do abastecimento no extrato** quebra em 2 linhas com a fonte maior
      (*"POSTO TUPI · Gasolina · 7L · R$ 7,14/L · 28 km"*). Se incomodar, tirar o R$/L de lá
      — ele já aparece no selinho
- [ ] **Rótulos da barra de navegação** a 11px em 6 colunas: cabe, mas está justo

### 🔴 Novas (v3.81)
- [ ] **`kmOk` não sobe pra nuvem** — falta a coluna em `abastecimentos`. Trocando de
      aparelho, o registro conferido volta a ser marcado como errado
- [ ] **Testar o tutorial num aparelho de verdade** — os 6 capítulos foram validados só em
      390px de navegador. Olhar principalmente o balão quando o alvo está no rodapé
- [ ] **Testar "Criar uma conta nova"** no fluxo real (sair → criar → o app volta ao
      onboarding limpo)

### Decisões de produto em aberto
- [ ] **Combustível de dia sem receita some do lucro.** Abastecimento em dia sem receita
      registrada não entra em nenhuma conta. É de nascença, não é bug — mas quem abastece na
      segunda e registra receita na terça perde aquele custo
- [ ] **Postos com grafia antiga continuam separados** (o autocompletar só evita novas)
- [ ] **`pontoA` do GPS não persiste** — se o app fechar durante o turno, o ponto de partida
      some. Morre sozinho quando virar nativo

### ⚫ Fatia 3 — depois do lançamento
- ~~**Relatório mensal do Isaac**~~ ✅ **FEITO na v3.72** (carta, não painel). O que sobra
  pra Fatia 3 é a **lupa**: *"você gastou R$ 38 a mais no Ipiranga que no Tupi"*
- ~~**O piso por km (a régua)**~~ ✅ **FEITO na v3.76–v3.79** (mora no guia, com tabela pronta)
- **Análise separada por veículo** (moto vs carro rendendo diferente) — o campo `vid` já é
  salvo em tudo; falta a lupa que compara. A receita continua **junta** de propósito: é isso
  que separa o Copiloto do Drivvo (app de motorista, não de veículo)
- **Comparação de postos** (versão pessoal)
- **Checklist do veículo** e **transferir histórico ao vender o carro** (ideias do Drivvo)
- **Indique e ganhe**

---

## ⚠️ ARMADILHAS QUE CUSTARAM TEMPO

**1. Cache do GitHub Pages.** Resolvido na v3.30 com `?v=NNN`. Antes de investigar qualquer
bug, confirmar que o código novo carregou:
```js
typeof ico                    // "function"  (v3.62)
typeof alternarListaExtrato   // "function"  (v3.63)
typeof textoFaltaDesempenho   // "function"  (v3.67)
```

**2. Supabase pausa sozinho** após 7 dias sem uso (plano grátis). Painel → "Restore project".

**3. Extensão "PIN Company Discounts"** polui o console e atropela cliques. Janela anônima.

**4. `git commit` com as 3 linhas coladas juntas** dá `unknown switch 'm'`.

**5. O Supabase avisa "Potential issue detected"** ao rodar SQL com `delete`/`revoke`. Nos
nossos scripts é falso alarme: os `delete` estão DENTRO do corpo da função (entre `$$`).

**6. Service worker novo só assume no SEGUNDO carregamento.** Normal.

**7. NOVO — `ico()` devolve HTML.** Só serve em `innerHTML` ou template. Em `.textContent` o
motorista vê a tag escrita na tela. Foi por isso que os toasts continuaram emoji.

**8. NOVO — encoding.** script.js, index.html e sw.js são **CRLF**; supabase-service.js é
**LF**. Edição por script tem que casar com os bytes do arquivo.

---

## 🎯 POSICIONAMENTO (validado em campo — Instagram, ago/2026)

Li ~200 comentários de motoristas. O padrão é forte:

**O grupo de WhatsApp é visto como veneno pela própria categoria.** Dezenas de "saí dos
grupos", "não me baseio nos outros". Motivos: só reclamação, gente mentindo sobre quanto fez,
influenciador postando ganho irreal.

**Quatro comentários que são o Copiloto escrito por eles:**
- *"Tem gente que troca dinheiro e acha que tá no lucro"*
- *"Coloque tudo na ponta do lápis, até multa e almoço, aí vamos ver quanto sobra"*
- *"Tira gasolina e custo do carro, o líquido é 30% disso"*
- *"O serviço é simples: SOMAR e SUBTRAIR. Mas nem isso os motoristas querem fazer"*

**O diagnóstico da gamificação:** *"caiu na gamificação, jura que é o mais esperto fazendo
corrida por 0,80/km"*. Não é falta de união — é não saber o próprio custo por km.

### O que isso define
- O Copiloto **não** é um grupo melhor. É a **alternativa ao grupo**: o lugar onde o número
  não mente, contra a rodinha onde todo mundo mente
- O conselho que mais ecoa (@eder_metas) é *"faça o SEU número, ignore os outros"* — mas
  ninguém diz COMO. É esse buraco que o app preenche

### Ideias DESCARTADAS por causa disso
- **Alerta de assalto em rede** — depende de motorista ajudando motorista, e a categoria diz
  que isso não existe. WhatsApp já resolve, e alerta falso vira risco jurídico
- **Diretório de despachante/oficina** — quebra o pitch, é hiperlocal, e o grupo responde em
  2min com contexto

---

## 🥊 CONCORRÊNCIA

### O mais perigoso é o DRIVVO, não o GigU
**+2 milhões de usuários.** Grátis. Android, iPhone e web. Faz controle de abastecimento,
manutenção e **relatório com custo por quilômetro real**. Posicionado explicitamente "para
profissionais que usam o veículo para trabalho".

**A fraqueza dele:** o Drivvo é app de **VEÍCULO**, não de **MOTORISTA**. Diz quanto o carro
custa, não se ele ganhou dinheiro hoje. Não conhece meta, não fecha o dia, não sabe quanto
vale a hora dele. É planilha bonita — sem voz, sem hábito, sem lado emocional.

**O Copiloto é o único que junta as duas metades.**

### StopClub e GigU — vivem no instante do aceite
Leem a tarifa direto da tela do Uber/99 (Accessibility Service) e mostram semáforo antes de
aceitar. O TJ/SP validou o uso pelo StopClub.

⚠️ **O GigU se comunica como "seu copiloto inteligente" no Brasil.** O nome e o posicionamento
estão ocupados — **decidir isso ANTES de investir em marca ou comprar domínio.**

### A vantagem que eles não copiam fácil
Eles **estimam** o custo (média). O Copiloto **mede** o real.
- Eles: *"estimo que você lucrou R$12 nessa corrida"*
- Copiloto: *"você roda a R$1,27/km — esse é o SEU número, medido do seu tanque"*

### Os 3 movimentos guardados
1. **Virar a fonte da régua deles** ⭐ — o semáforo deles precisa de um número; esse número
   quem dá é o Copiloto
2. **Mostrar o erro da estimativa** — *"o app calcula seu custo em R$0,42/km. O seu real é R$0,61"*
3. **Oferta ≠ recebido** — o histórico deles é de ofertas; o do Copiloto é do que caiu na conta

### ⚠️ A Uber também é concorrente da Fatia 3
Já tem "Tendências de Ganhos": mapa de onde outros ganharam mais + gráficos por dia e horário.
Metade da Fatia 3, de graça, dentro do app que ele já usa.
→ O diferencial tem que ser o dado DELE (não a média da cidade) e o líquido (não o bruto).

---

## 🎯 O VERDADEIRO CAMPO DE BATALHA: O ATRITO DO REGISTRO

> *Como anotar cada gasto com as mãos no volante? A maioria tenta memorizar pra anotar
> depois, mas após 10-12h no trânsito a exaustão vence — esquece o pedágio, a água no farol,
> e a conta de lucro nunca bate.* (blog Radar Dinheiro)

**Não ganha quem calcula melhor. Ganha quem faz o motorista registrar sem atrito.**

Foi esse raciocínio que produziu a v3.54 (digitar só o final) e que mata o problema do km
quando virar nativo.

⚠️ **Descartado por ser trabalho jogado fora:** perguntar o km no início do turno, botão "não
estou no carro", botão "usar meu normal". Todos existem só pra contornar limitação do PWA.

---

## ⚠️ REGRAS SAGRADAS

1. Simplicidade radical > mais recurso
2. **O app NUNCA inventa número.** Faltou dado → avisa. Estimativa avisada é ok
3. **Cadeia de km = parte mais frágil.** Mexeu → teste nos extremos
4. Laranja/vermelho = alerta REAL, nunca convite (vazio é neutro)
5. Isaac = TEXTO, sem TTS. Personagem vivo, 1ª pessoa, formal equilibrado
6. Grátis = espelho (NUNCA trancar). Pago = lupa
7. Pitch: "A IA genérica te dá conselho. O Copiloto te dá o SEU número."
8. Entrega = SUBSTITUIR na pasta. Cada arquivo = o projeto inteiro naquele momento
9. Testar em janela anônima
10. **Nunca sacrificar o registro do motorista por causa de login/nuvem.** Salva primeiro,
    resolve a conta depois
11. **Regra copiada é regra que vai divergir.** Já aconteceu 4 vezes: duas telas de
    abastecimento (v3.46), km furado em 3 lugares (v3.53/59), dois conjuntos de ícones
    (v3.62), custo/km apagando a tela toda (v3.61 na Início, v3.62 na Combustível). Se a
    mesma decisão aparece duas vezes, **vira função**
12. **NOVO — aviso que não aponta o culpado é ruído.** "1 abastecimento está errado" sem
    dizer qual cobra uma correção impossível de fazer. Todo aviso tem que carregar o dia, o
    valor e o motivo — e o registro tem que estar marcado na lista
13. **NOVO — o app não pode mandar fazer o que já foi feito.** Texto fixo de estado vazio dá
    a mesma frase pra quem não fez nada e pra quem fez metade. O app SABE a contagem: ele
    tem que DIZER a contagem
14. **NOVO — frequência manda no tamanho.** O que ele faz toda semana fica aberto e grande;
    o que ele faz uma vez na vida fica dobrado. Peso igual pra importância diferente é o que
    faz uma tela parecer amadora sem a pessoa saber explicar por quê
15. **NOVO — a escala tipográfica tem 6 degraus** (`--f1`…`--f6`) e um piso de 11px. Precisa
    de um tamanho novo? Use um dos seis. Nada abaixo de 11px: o motorista lê na rua, com sol,
    de relance, com o celular no suporte

---

## 💡 DECISÕES ESTRATÉGICAS (não reabrir sem motivo)

- **App nativo: Capacitor.** Decisão fechada pelo prazo
- **Play Store: conta PESSOAL**, US$25. MEI não serve pra software
- **Empresa própria (ME/SLU) só quando houver receita** — confirmar com contador
- **Domínio próprio: não é urgente.** Depende da decisão do nome, em aberto por causa do GigU
- **Idiomas:** Brasil → Portugal → Espanha/França. Não agora
- **Aprovação manual de cadastro:** NÃO. Freemium
- **Grátis não trava:** o espelho (fechamento, custo/km, reserva, Isaac) é SEMPRE grátis
- **Monetização:** mensal baratíssimo ("preço de 1 litro de gás/mês")
- **Velocímetro:** modelo A mantido — só cresceu (185→240px) e o número desceu pra parte
  larga do arco
- **WhatsApp/SMS pra recuperar senha:** descartado. E-mail resolve (e funciona)
- **Backup manual:** mantido, discreto, dentro da dobra "Conta e cópia de segurança"
- **Toasts continuam emoji.** São `textContent` — SVG viraria tag escrita na tela

---

## 🩹 COMO RECOMEÇAR

1. Conversa nova: cola este RETOMADA + arquivos ATUAIS (baixados DO GITHUB)
2. Confirma no código:
   - `grep -c "kmSuspeito" script.js` → 13
   - `grep -c "porqueSuspeito" script.js` → 4
   - `grep -c "textoFaltaDesempenho" script.js` → 2
   - `grep -c "<symbol id=\"i-" index.html` → 54
   - `grep -o "font-size:var(--f[0-9])" style.css | wc -l` → ~246
3. 1ª frase sugerida: *"Estamos na v3.70. Código e visual estão prontos pro teste com
   motorista. O que falta não é código: abrir o Play Console, recrutar os 12 motoristas e
   tirar os prints da loja. Em outubro, Capacitor."*

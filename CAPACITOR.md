# 📱 COPILOTO — virar aplicativo (Capacitor)

Guia de instalação e build. **Leia as duas caixas de aviso antes de começar** — elas mudam
como você trabalha daqui pra frente.

---

## ⚠️ AVISO 1 — o `git push` deixa de chegar no motorista

Hoje você dá `git push` e em 1 minuto **todo mundo** tem a correção. É o que permitiu
corrigir 20 versões numa tarde.

No aplicativo isso **acaba**. Os arquivos vão dentro do APK. Cada correção vira:

```
npm run sync  →  build no Android Studio  →  upload  →  revisão do Google  →  o motorista atualiza
```

Isso leva de horas a dias. **Durante os 14 dias com os 12 motoristas, você vai precisar
corrigir rápido** — e é justamente quando não vai poder.

**A saída existe e é permitida pelas duas lojas.** Chama-se *Live Update*: o app baixa os
arquivos web novos em segundo plano e usa na próxima abertura. O Google isenta explicitamente
JavaScript rodando em WebView da regra que proíbe app se auto-atualizar.

⚠️ **Não confundir com `server.url`** (apontar o app pro GitHub Pages). Aquilo carrega tudo
pela rede a cada abertura — **mata o offline**, que é o que dá valor nativo ao app e o que a
regra sagrada nº 10 protege.

👉 **Decisão pra tomar depois do primeiro build funcionar**, não agora. Anotada na pendência.

---

## ⚠️ AVISO 2 — duas coisas que não podem mudar depois

**1. O `appId`.** Está em `capacitor.config.json` como `br.app.copiloto`. Depois de publicar,
**ele é permanente** — mudar significa um app novo, do zero, sem os usuários. Se você ainda
tem dúvida sobre o nome (por causa do GigU), essa dúvida precisa morrer **antes** do primeiro
envio à loja.

**2. A chave de assinatura** (`.jks`). É ela que prova pro Google que a atualização é sua.
- **Perdeu a chave → nunca mais atualiza o app.** Só resta publicar outro, do zero.
- **Vazou a chave → qualquer um publica atualização no seu lugar.**

Guarde em pelo menos dois lugares fora do computador. O `.gitignore` já bloqueia `.jks`,
`.keystore` e `key.properties` — **não tire de lá.**

---

## 1. O que instalar

| O quê | Versão mínima | Onde |
|---|---|---|
| **Node.js** | **22** ou maior (LTS) | nodejs.org |
| **Android Studio** | **Otter · 2025.2.1** ou maior | developer.android.com/studio |
| JDK | — | vem junto com o Android Studio, não instale separado |

Depois de instalar o Android Studio, abra **Tools → SDK Manager → SDK Platforms** e marque
**Android 16 (API 36)**.

Confira no terminal:
```
node -v      → tem que mostrar v22 ou maior
```

---

## 2. Instalar o Capacitor no projeto

Na pasta `C:\dev\caderno-manutencao`, **uma linha de cada vez**:

```
npm install
```
```
npx cap add android
```

Isso cria a pasta `android/`. Ela é gerada — está no `.gitignore` de propósito.

---

## 3. Build

```
npm run android
```

Esse comando faz três coisas: monta a pasta `www/`, sincroniza com o Android e abre o
Android Studio.

No Android Studio, espere o Gradle terminar (a primeira vez demora — ele baixa muita coisa) e
aperte **Run ▶** com o celular conectado por USB (com *Depuração USB* ligada) ou com um
emulador.

### Toda vez que mexer no app depois disso
```
npm run sync
```
E no Android Studio, **Run ▶** de novo.

---

## 4. O que já foi preparado no código

| Arquivo | O que faz |
|---|---|
| `package.json` | dependências e os comandos `build` / `sync` / `android` |
| `capacitor.config.json` | appId, nome, cor de fundo, splash |
| `copiar-para-www.js` | monta a `www/` limpa — a raiz continua servindo o GitHub Pages |
| `.gitignore` | mantém `node_modules/`, `www/`, `android/` e **as chaves** fora do git |

E duas correções no app que só importam no celular:

**Botão voltar do Android.** No navegador ele não faz nada. No Android é físico e o motorista
usa o tempo todo — e **sem tratamento ele fecharia o app inteiro**, mesmo com um modal aberto
no meio de um lançamento. Agora a ordem é: fecha o modal → volta da sub-tela → volta pro
Início → só então sai. E se tiver turno em andamento, pergunta antes.

**Service worker desligado dentro do app.** Lá os arquivos já são locais. Um SW só criaria
uma segunda cópia e poderia servir a versão velha depois de uma atualização — fazendo parecer
que a correção não subiu. No GitHub Pages ele continua ligado.

---

## 5. ⚠️ O e-mail de recuperação de senha VAI QUEBRAR

Hoje o link do e-mail abre o GitHub Pages e a tela de senha nova aparece. **Dentro do app
isso não funciona:** o link abre o navegador, o motorista troca a senha lá fora, e não volta
pro app.

A correção é **deep link** (App Links): o Android passa a reconhecer que aquele endereço
pertence ao seu app e abre nele.

Envolve mexer no `AndroidManifest.xml`, publicar um arquivo `assetlinks.json` no GitHub Pages
e adicionar a URL nas *Redirect URLs* do Supabase.

👉 **Não é bloqueio pro primeiro build.** Faça depois que o app abrir no celular — mas
**antes** de entregar pros 12 motoristas, senão o primeiro que esquecer a senha trava.

---

## 6. Sobre a Play Store — o prazo que apareceu

**A partir de 31 de agosto de 2026, apps novos precisam mirar Android 16 (API 36).** Hoje
ainda aceita API 35.

✅ **Você está coberto:** o Capacitor 8 já entrega target 36 de fábrica. Só não use uma versão
antiga do Capacitor.

Se precisar de mais tempo, dá pra pedir extensão até 1º de novembro de 2026 — mas com o seu
cronograma isso não deve ser necessário.

---

## 7. Ordem sugerida

1. ✅ Instalar Node 22 e Android Studio
2. ✅ `npm install` → `npx cap add android` → `npm run android`
3. ✅ **Ver o app abrindo no seu celular** — é o marco que destrava tudo
4. Testar o botão voltar nos extremos (modal aberto, sub-tela, turno em andamento)
5. Ícone e splash de verdade
6. Deep link do e-mail de senha
7. Chave de assinatura + backup em dois lugares
8. Subir no canal de teste fechado
9. Decidir sobre Live Updates

---

## Armadilhas conhecidas

**O primeiro Gradle demora muito.** Dez, quinze minutos é normal. Não é travamento.

**`npm run sync` depois de QUALQUER mudança.** Mexer em `script.js` e apertar Run direto não
adianta — o Android Studio usa a cópia que está em `www/`, e ela só se atualiza no sync. É a
mesma armadilha do `?v=NNN`, com outra roupa.

**Arquivo novo do app precisa entrar na lista.** Se criar um arquivo novo, adicione o nome em
`copiar-para-www.js`. Se esquecer, ele não vai pro APK e o app quebra só no celular — o
script avisa e para o build quando um arquivo da lista some.

**Emulador não serve pra testar GPS de verdade.** Nem consumo de bateria. Essas duas coisas
só no celular físico.

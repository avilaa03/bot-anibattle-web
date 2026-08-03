# AniBattle — Site

Site oficial do [AniBattle](../bot_animefight), o bot de cartas de anime para Discord.

Landing page, catálogo de cartas navegável e páginas legais. Lê o **mesmo MongoDB** que o bot, em modo somente leitura.

## Rodando

```bash
npm install
cp .env.local.example .env.local   # preencha o MONGODB_URI
npm run dev
```

Abra http://localhost:3000

### Se o `npm run typecheck` acusar erro em `.next/types/... 2.ts`

Esta cópia do projeto tem arquivos duplicados dentro do `.next` (o padrão `nome 2.ts`, que o macOS cria ao copiar uma pasta). São artefatos de build, não código seu. Apague e deixe o Next recriar:

```bash
rm -rf .next
```

Enquanto isso não acontece, `npx tsc -p tsconfig.check.json` verifica só o código-fonte.

## Stack e por quê

| Escolha | Motivo |
|---|---|
| **Next.js (App Router)** | A landing e o catálogo precisam ser indexados pelo Google. Next renderiza no servidor por padrão. |
| **TypeScript** | O bot é JavaScript puro; aqui a tipagem pega erro de campo do banco em tempo de escrita. |
| **Tailwind** | Rápido para um site pequeno, sem arquivo de CSS crescendo sem controle. |
| **Driver `mongodb` (não Mongoose)** | O site só lê. O driver puro evita o conflito de registrar models duas vezes no hot reload do Next. |

### Por que não Angular

Angular brilha em aplicação grande com equipe de vários desenvolvedores — injeção de dependência, RxJS e estrutura opinativa existem para manter muita gente alinhada por anos. Para uma pessoa construindo landing + catálogo + checkout, vira cerimônia sem retorno. Além disso, o SSR exige configuração extra e seria preciso um servidor Node separado para OAuth e webhook, que aqui são apenas API routes.

## Estrutura

```
app/
  page.tsx              landing (números reais do banco + notícias)
  cartas/page.tsx       catálogo com filtros
  cartas/[numero]/      página individual da carta
  privacidade, termos   páginas legais
  sitemap.ts, robots.ts SEO
  admin/                painel (protegido no layout)
  api/admin/            rotas de escrita (protegidas por rotaAdmin)
components/
  CartaVisual.tsx       a carta em HTML/CSS
  admin/                formulários e modal de confirmação
  FiltrosCartas.tsx     filtros (estado na URL)
lib/
  mongodb.ts            conexão com cache para o hot reload
  consultas.ts          queries do site público (somente leitura)
  tipos.ts              tipos das coleções do bot
  raridades.ts          espelha embeds.js do bot
  vip.ts                espelha os planos de vip.js do bot
  noticias.ts           tipos e constantes das notícias (seguro no cliente)
  noticiasDb.ts         leitura das notícias
  admin/
    guarda.ts           porteiro das rotas de escrita
    acoes.ts            ações sobre jogadores (dar carta, VIP, banir...)
    cartas.ts           cadastro e edição do catálogo
    noticias.ts         escrita das notícias
    jogadores.ts        ficha e busca de jogadores
    sistema.ts          estado do bot e saúde do banco
    auditoria.ts        log de tudo que o painel escreve
data/
  noticias.ts           semente: as notícias que existiam antes do banco
```

## Decisões que vale conhecer

**A carta é HTML, não imagem.** O bot desenha em canvas porque o Discord só aceita imagem. Na web isso seria erro: pesaria mais, não seria responsivo, não daria para o Google ler o texto, e obrigaria instalar o `canvas` (dependência nativa) na Vercel — justamente onde ele dá mais problema.

**O site nunca escreve no banco.** Toda escrita passa pelo bot. Isso impede que um bug aqui corrompa a economia do jogo.

**Filtros ficam na URL.** `?raridade=master&serie=Naruto` sobrevive ao recarregar, pode ser compartilhado e funciona com o botão voltar.

**Três arquivos espelham o bot** e precisam ser atualizados junto se o bot mudar: `lib/raridades.ts` (cores e rótulos), `lib/tipos.ts` (schemas) e as páginas legais (`PRIVACIDADE.md` / `TERMOS.md`).

**Arquivo que chama `getDb()` só pode ser importado por Server Component ou rota de API.** Se um componente com `'use client'` importar um desses — mesmo que só para pegar uma constante do arquivo — o Next tenta empacotar o driver do Mongo para o navegador e a compilação quebra com `Module not found: Can't resolve 'net'`, mensagem que não diz nada sobre a causa real.

Por isso as notícias estão em três arquivos em vez de um:

| Arquivo | O quê | Quem pode importar |
|---|---|---|
| `lib/noticias.ts` | Tipos, `ETIQUETAS`, formatação | qualquer um, inclusive cliente |
| `lib/noticiasDb.ts` | Leitura no banco | só servidor |
| `lib/admin/noticias.ts` | Escrita | só rota de API do admin |

Repare no `import type { ObjectId } from 'mongodb'` no topo de `lib/noticias.ts`: importação de tipo é apagada na compilação, então não puxa o driver. Tirar o `type` dali quebra a build.

Se quiser que esse erro apareça como mensagem clara em vez de "can't resolve 'net'", instale `npm i server-only` e adicione `import 'server-only';` no topo de `lib/mongodb.ts`.

## Variáveis de ambiente

| Variável | Obrigatória | O que faz |
|---|---|---|
| `MONGODB_URI` | sim | Mesmo banco do bot. **Inclua o nome do banco no caminho** |
| `NEXT_PUBLIC_INVITE_URL` | sim | Link de convite do bot |
| `NEXT_PUBLIC_SUPPORT_URL` | não | Servidor de suporte |
| `NEXT_PUBLIC_SITE_URL` | não | URL pública, usada no sitemap e nas meta tags |

## Deploy na Vercel

1. Suba este diretório num repositório próprio (separado do bot)
2. Importe na Vercel
3. Configure as variáveis de ambiente
4. No MongoDB Atlas, libere o acesso da Vercel em **Network Access**

O plano gratuito da Vercel dá conta com folga do tráfego de um beta.

## Login com Discord

O site usa OAuth2 do Discord. Para configurar:

1. **Discord Developer Portal** → sua aplicação → **OAuth2**
2. Em *Redirects*, adicione `http://localhost:3000/api/auth/callback` (e depois a URL de produção)
3. Copie **Client ID** e **Client Secret** para o `.env.local`
4. Gere a chave de sessão: `openssl rand -hex 32` → `SESSION_SECRET`
5. Coloque seu ID do Discord em `ADMIN_DISCORD_IDS`

⚠️ O `NEXT_PUBLIC_SITE_URL` precisa bater **exatamente** com o Redirect cadastrado no Discord, senão o login falha com `invalid_redirect_uri`.

### Como a sessão funciona

Cookie assinado com HMAC-SHA256 (mesmo princípio de um JWT, sem dependência externa). O conteúdo é legível — são dados públicos do Discord — mas não é falsificável sem a chave.

Proteções aplicadas:

| O quê | Contra o quê |
|---|---|
| `httpOnly` | XSS não consegue ler o cookie |
| `sameSite: lax` | CSRF |
| `secure` em produção | Interceptação em HTTP |
| `state` de uso único no OAuth | Login forjado por terceiro |
| Comparação em tempo constante | Descobrir a chave por timing |
| Token do Discord revogado após o uso | Superfície de ataque desnecessária |
| Logout por POST | `<img src="/logout">` deslogar visitantes |

Trocar o `SESSION_SECRET` invalida todas as sessões — útil em emergência.

## Painel administrativo

`/admin` tem seis telas:

| Tela | O que faz |
|---|---|
| **Visão geral** | Números do jogo, se o bot está no ar, últimas ações administrativas |
| **Jogadores** | Busca por ID → ficha completa → dar/remover cartas, moedas, VIP, Pokédex, banir, resetar |
| **Cartas** | Cadastrar carta nova, corrigir atributos, trocar imagem, apagar do catálogo |
| **Notícias** | Escrever, editar e despublicar as notícias da home |
| **Sistema** | Servidores conectados, saúde do banco, latência, coleções |
| **Auditoria** | Histórico de tudo que foi escrito pelo painel |

### As camadas de segurança

A proteção de **página** está no `app/admin/layout.tsx`, então toda página nova dentro de `/admin` herda sem risco de esquecer.

Isso **não vale para as rotas de API**: `app/api/**` não passa por aquele layout. Se uma rota de escrita confiasse nele, qualquer pessoa daria VIP a si mesma com um `curl`. Por isso toda rota administrativa é envolvida por `rotaAdmin()` (`lib/admin/guarda.ts`), que aplica, nesta ordem:

| Camada | Contra o quê |
|---|---|
| Só aceita POST | Navegador dispara GET sozinho (prefetch, preview de link no Discord) |
| `Origin` tem que bater com o host | CSRF, mesmo se o `sameSite` do cookie falhar |
| Sessão assinada e válida | Cookie forjado |
| ID na lista `ADMIN_DISCORD_IDS`, lida a cada requisição | Tirar alguém da lista derruba o acesso na hora, sem esperar a sessão expirar |
| 40 operações por minuto por administrador | Script automatizado com sessão roubada |
| Ação perigosa exige redigitar o ID + motivo | Clicar na linha errada da tabela |

**`ADMIN_DISCORD_IDS` vazio bloqueia todo mundo**, de propósito: uma variável esquecida não pode virar painel aberto.

⚠️ O limite de requisições é em memória do processo. Na Vercel, cada instância tem o próprio contador — serve contra acidente, não contra atacante determinado. Se isso passar a importar, mova para o Mongo.

### Ações perigosas

Remover cartas, remover VIP, apagar a Pokédex, banir e resetar conta abrem um modal que exige **redigitar o ID do jogador** e **escrever o motivo**. Dar cartas e mexer em moedas viram perigosas acima de 25 cartas ou 100 mil moedas.

O servidor revalida as duas coisas (`validarConfirmacao` em `lib/admin/acoes.ts`). O modal é ergonomia; a trava está no servidor.

O erro mais provável num painel assim não é invasão — é banir o jogador errado porque a linha de cima estava selecionada. Redigitar o ID quebra o piloto automático.

### Log de auditoria

Coleção `auditoria`. Grava quem fez, o quê, em quem, por quê, de que IP, **e o estado anterior**. Registra também as tentativas que falharam: uma sequência de erros de permissão é o rastro que um ataque deixa.

O `antes` é o que permite desfazer. Saber que você deu VIP não ajuda muito; saber que a pessoa era "prata até 12/09" é o que deixa reverter. No reset de conta, o documento inteiro vai para o log antes de ser limpo.

**Não existe rota de escrita para o log**, e o painel não apaga registro. Auditoria que o suspeito pode editar não é auditoria.

### O que ainda é melhor fazer por terminal

Importar cartas em massa: `npm run import:anilist` e `npm run seed:cards` no bot. O painel é para o caso avulso.

### Banimento

O painel escreve em `users.banimento`; o bot lê em `Commands/utils/moderacao.js` e bloqueia **todos** os comandos, mostrando ao jogador o motivo e o prazo.

Duas decisões que valem conhecer:

- **O bot guarda o veredito por 30 segundos.** Sem cache seria uma consulta ao Mongo por clique, para um campo que quase nunca muda. Consequência: banir e desbanir levam até meio minuto para valer.
- **Banco fora do ar não bane ninguém.** Se a consulta falhar, o jogador passa. Errar liberando é incômodo; errar bloqueando derruba o jogo inteiro numa queda do Atlas.

Banimento com prazo vencido se resolve sozinho na primeira consulta depois do vencimento — não precisa de rotina agendada.

### Como o painel vê os servidores conectados

O bot publica servidores, contagem de membros e um carimbo de tempo na coleção `bot_status` a cada minuto (`Commands/utils/presenca.js`). O site só lê.

O caminho óbvio seria o site perguntar à API do Discord — mas para listar os servidores do bot ele precisaria do **token do bot**, e aí um site hospedado na Vercel passaria a carregar a credencial que controla o bot inteiro. Não vale por uma lista de servidores.

De brinde, o carimbo vira sinal de vida: sem atualização por 3 minutos, o painel mostra o bot como offline.

## Próximos passos

- [ ] Checkout de VIP via Mercado Pago, chamando o webhook que já existe no bot
- [ ] Página de perfil público do jogador
- [ ] Página individual da notícia (o campo `corpo` já é salvo, só falta a rota)
- [ ] Mover o limite de requisições para o Mongo, se o painel ganhar mais administradores

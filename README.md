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
components/
  CartaVisual.tsx       a carta em HTML/CSS
  FiltrosCartas.tsx     filtros (estado na URL)
lib/
  mongodb.ts            conexão com cache para o hot reload
  consultas.ts          todas as queries (somente leitura)
  tipos.ts              tipos das coleções do bot
  raridades.ts          espelha embeds.js do bot
data/
  noticias.ts           notícias da home
```

## Decisões que vale conhecer

**A carta é HTML, não imagem.** O bot desenha em canvas porque o Discord só aceita imagem. Na web isso seria erro: pesaria mais, não seria responsivo, não daria para o Google ler o texto, e obrigaria instalar o `canvas` (dependência nativa) na Vercel — justamente onde ele dá mais problema.

**O site nunca escreve no banco.** Toda escrita passa pelo bot. Isso impede que um bug aqui corrompa a economia do jogo.

**Filtros ficam na URL.** `?raridade=master&serie=Naruto` sobrevive ao recarregar, pode ser compartilhado e funciona com o botão voltar.

**Três arquivos espelham o bot** e precisam ser atualizados junto se o bot mudar: `lib/raridades.ts` (cores e rótulos), `lib/tipos.ts` (schemas) e as páginas legais (`PRIVACIDADE.md` / `TERMOS.md`).

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

## Próximos passos

- [ ] Login com Discord OAuth2 (destrava checkout e admin)
- [ ] Checkout de VIP via Mercado Pago, chamando o webhook que já existe no bot
- [ ] Painel administrativo (começar somente leitura)
- [ ] Página de perfil público do jogador

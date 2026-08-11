# Como o site fala três idiomas

Português, inglês e espanhol. Este documento é a referência de quem for
mexer nisso — inclusive para retomar a tradução das páginas que faltam.

## O essencial

- Os códigos são a **língua, sem região**: `pt`, `en`, `es`
- O idioma vive **na URL**: `/pt/guia`, `/en/guia`, `/es/guia`
- Nenhuma página escreve texto na mão — tudo sai de
  `lib/i18n/dicionarios/<idioma>.json`
- O site abre em **português** e lembra a escolha pelo cookie `idioma`

## Onde está cada coisa

| Arquivo | Papel |
|---|---|
| `lib/i18n/config.ts` | idiomas, rótulos do seletor, locale de formatação |
| `lib/i18n/index.ts` | o `traduzir(idioma)` e o `formatarNumero` |
| `lib/i18n/dicionarios/*.json` | os textos |
| `middleware.ts` | põe o idioma na URL e grava o cookie |
| `components/SeletorIdioma.tsx` | os três botões do cabeçalho |
| `app/[locale]/layout.tsx` | `<html lang>`, metadados e `hreflang` |
| `scripts/conferirIdiomas.mjs` | `npm run idiomas:conferir` |

## Traduzir uma página

O padrão é sempre o mesmo. Use `app/[locale]/cartas/page.tsx` como
modelo — ela tem os dois casos (página e `generateMetadata`), e passa
strings prontas para um componente de cliente.

Para conteúdo que é estrutura — o guia inteiro, o FAQ do VIP — o modelo é
`lib/guia.ts`: o texto vai para o dicionário como lista de objetos, os
números ficam no código, e um `preencher` troca os `{marcadores}`. O
dicionário nunca escreve um número do jogo à mão; se escrevesse, ele
sobreviveria à mudança da regra e viraria mentira em silêncio.

**1.** Adicione as chaves nos **três** JSONs, com o mesmo caminho.

**2.** Receba o parâmetro de rota e monte o tradutor:

```tsx
import { notFound } from 'next/navigation';
import { traduzir } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';

export default async function Pagina({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const href = (c: string) => `/${idioma}${c}`;
  // ...
}
```

**3.** Troque o texto por `t('chave')` e **todo link interno** por
`href('/caminho')`.

## Sete armadilhas

**Link sem idioma desfaz a escolha do visitante.** Um `<Link href="/cartas">`
cai no middleware, que redecide o idioma e joga a pessoa de volta para o
português. Sempre `href('/cartas')`.

**Nunca importe `lib/i18n` num componente de cliente.** Ele tem
`server-only` no topo justamente para o build quebrar se isso acontecer:
os três dicionários somam mais de 100 KB e iriam parar no bundle do
navegador. Componente de cliente recebe as strings prontas por prop —
veja `SeletorIdioma.tsx`.

**Conteúdo que é estrutura usa `t.dados()`, não `t()`.** As seções da home
são uma lista de objetos, não uma frase. Espremer isso em chaves soltas
(`home.recurso3.titulo`) deixa o dicionário ilegível.

**Erro que vem de outra rota tem que viajar como código, não como texto.**
A rota de callback do OAuth não sabe em que idioma o visitante está; por
isso ela redireciona com `?erro=state_invalido` e quem traduz é a página.
Mesmo raciocínio vale para qualquer coisa gravada no banco para exibir
depois.

**Termo literal de terceiro não se traduz.** O `invalid redirect_uri` da
dica de desenvolvimento fica em inglês nos três idiomas: é a mensagem
exata que o Discord devolve, e traduzir faria a pessoa procurar no portal
por um texto que não existe.

**Nome de comando MUDA com o idioma — isto se inverteu.**

Antes havia um nome só para todos, e a regra aqui era repetir esse nome
nos três idiomas. Hoje o bot tem o canônico em inglês e **um apelido por
idioma** no Discord: quem usa o Discord em português vê `/loja`, em
inglês vê `/shop`, em espanhol vê `/tienda`.

Então cada dicionário cita o nome do SEU idioma. Escrever `/shop` na
página em português manda a pessoa digitar um comando que, para ela, não
existe — o mesmo erro de antes, agora ao contrário.

`/roll`, `/market` e `/daily` continuam iguais nos três: nunca tiveram
nome em português, e por isso não têm apelido.

A lista mora em `Commands/utils/nomesDeComando.js`, no repositório do
bot. Aqui não há import possível — os dois projetos são separados —,
então o que segura os dois juntos é o `npm run idiomas:conferir`, que
reprova nome em português nos dicionários `en` e `es`. Há teste de que
ele reprova.

**Rótulo que vem de catálogo do código vazava português.** Raridade,
etiqueta de notícia, nome de plano e nome de moldura eram strings em
`lib/raridades.ts`, `lib/noticias.ts` e `lib/vip.ts`. Agora o catálogo
guarda só a mecânica — chave, cor, emoji, peso, preço — e o nome sai do
dicionário. Mesma regra do bot. O `label` em português continua em
`lib/raridades.ts` só para o `/admin`, que é interno; página pública que
usar `meta.label` está errada.

## Conferir antes de abrir PR

```bash
npm run typecheck && npm run idiomas:conferir
```

O `idiomas:conferir` pega os erros silenciosos: chave faltando num
idioma, lista com número diferente de itens, e marcador `{valor}`
presente só de um lado. Nenhum dos três quebra o build — chave que falta
cai no português, e a página fica no ar com uma frase em português no
meio do inglês.

A conferência anterior era um `node -e` colado neste documento, e estava
quebrada: `l.map(k)` passava o índice do array como prefixo de chave, então
ela reportava 100% das chaves como faltando, sempre. Por isso agora é
script no repositório, com teste de que ele realmente reprova.

## O que ainda falta traduzir

As páginas públicas estão todas prontas. Sobra uma coisa:

- **Campos por idioma nas notícias**, no editor do painel. Hoje a notícia
  tem um título e um resumo só, e eles aparecem iguais nos três idiomas —
  é o único texto do site que ainda escapa do dicionário, porque vem do
  banco. A etiqueta (Novidade, Atualização…) já é traduzida.

O `/admin` fica em português por decisão de escopo: é uso interno.

O `next lint` deste repositório não está configurado — abre um prompt
interativo pedindo para escolher o preset. Não tem a ver com tradução,
mas atrapalha quem tentar rodar a suíte inteira.

## Páginas legais: decidido, ficam em português

`/termos` e `/privacidade` são prosa jurídica, e o corpo dos dois fica em
português nos três idiomas. Foi decisão de risco, não de esforço: uma
imprecisão de tradução numa política de privacidade pode valer contra
quem a publicou.

A alternativa — traduzir e avisar que "em caso de divergência prevalece o
português" — resolve no papel e piora na prática: a pessoa lê a versão
que a própria página avisa não ser a que vale. A chave
`legal.aviso_traducao`, que existia para essa saída, foi removida para
não convidar a usá-la.

Como está montado:

- `components/AvisoSoPortugues.tsx` abre a página fora do português, e a
  **nota vai no idioma do visitante** — avisar em português que o
  documento só existe em português não avisa ninguém
- O bloco do documento leva `lang="pt"`, senão o leitor de tela lê o
  português inteiro com a fonética do outro idioma
- Só o título da aba e a descrição acompanham o idioma, porque é o que
  aparece no buscador e no link do rodapé

## Por que algumas decisões são assim

**O português também leva prefixo.** Sem ele, `/guia` e `/pt/guia` seriam
duas URLs com o mesmo conteúdo — duplicação aos olhos do Google, a menos
que se acerte `canonical` em toda página.

**Sem detecção automática de idioma.** Chegamos a implementar por
`Accept-Language` e por país. Saiu: cada palpite errado é um visitante
caindo num idioma que não pediu, e o seletor resolve em um clique.

**`hreflang` sem região.** Com `en-US` o Google deixa de oferecer a página
para quem busca em inglês no Reino Unido; com `es-ES`, para o México, que
é o maior mercado de língua espanhola.

**O bot usa códigos diferentes** (`pt-BR`, `en-US`) porque a API do
Discord exige. A divergência é proposital — não "corrija".

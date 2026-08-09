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

## Traduzir uma página

O padrão é sempre o mesmo. Use `app/[locale]/cartas/page.tsx` como
modelo — ela tem os dois casos (página e `generateMetadata`).

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

## Cinco armadilhas

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

## Conferir antes de abrir PR

```bash
npx tsc --noEmit
```

E a paridade das chaves nos três dicionários:

```bash
node -e "
const l=['pt','en','es'].map(x=>require('./lib/i18n/dicionarios/'+x+'.json'));
const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>
  v&&typeof v==='object'&&!Array.isArray(v)?k(v,p+x+'.'):[p+x]);
const [a,b,c]=l.map(k);
const faltam=[...a.filter(x=>!b.includes(x)),...a.filter(x=>!c.includes(x))];
console.log(faltam.length?'FALTAM: '+faltam.join(', '):'paridade ok ('+a.length+' chaves)');
"
```

Chave que falta num idioma não quebra nada — cai no português. É
justamente por isso que precisa ser conferido: o erro é silencioso.

## O que ainda falta traduzir

- `app/[locale]/guia/page.tsx` e `lib/guia.ts` (o maior, ~446 linhas)
- `app/[locale]/vip/page.tsx` (~39 strings, boa parte FAQ)
- `app/[locale]/termos` e `app/[locale]/privacidade` — ver abaixo
- Campos por idioma nas notícias, no editor do painel

O `/admin` fica em português por decisão de escopo: é uso interno.

## Decisão pendente: páginas legais

`/termos` e `/privacidade` são prosa jurídica. A chave
`legal.aviso_traducao` já existe nos três dicionários ("em caso de
divergência, prevalece o texto em português"), mas o corpo ainda não foi
traduzido.

**O aviso e a tradução precisam entrar juntos.** Uma página em português
exibindo "esta é uma tradução de cortesia" confunde mais do que ajuda.

Duas saídas, e a escolha é de risco, não técnica:

1. Traduzir por inteiro, com o aviso — mais trabalho, e uma imprecisão
   numa política de privacidade pode valer contra você
2. Manter o corpo em português nos três idiomas, com uma nota explicando
   que o documento existe só nesse idioma

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

import { NextResponse, type NextRequest } from 'next/server';
import { IDIOMAS, IDIOMA_PADRAO, ehIdioma } from '@/lib/i18n/config';

/**
 * Põe o idioma na URL.
 *
 * Toda página pública vive sob `/<idioma>/...`. Quem chega numa URL sem
 * idioma vai para o português, e a escolha manual fica lembrada.
 *
 * ## Por que o português também tem prefixo
 *
 * Seria possível deixar `/guia` como português e só prefixar os outros.
 * Não fizemos: sem prefixo, `/guia` e `/pt/guia` viram duas URLs com
 * o mesmo conteúdo, e o Google trata isso como conteúdo duplicado a
 * menos que se acerte canonical em toda página. Um endereço por idioma,
 * sem exceção, é mais simples de manter correto.
 *
 * O custo é que os links antigos (`/guia`) mudam — por isso o redirect
 * abaixo é 307, não 308: mantém os antigos funcionando sem gravar em
 * cache do navegador uma decisão de idioma que pode mudar.
 */

const COOKIE = 'idioma';

/** Repassa o caminho para os componentes servidores lerem. */
function novoCabecalho(request: NextRequest, pathname: string): Headers {
  const h = new Headers(request.headers);
  h.set('x-pathname', pathname);
  return h;
}

// Rotas que NÃO recebem prefixo de idioma.
//
// O painel administrativo fica em português por decisão de escopo, e as
// rotas de API não têm idioma nenhum — são dados, não página.
const SEM_IDIOMA = ['/admin', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SEM_IDIOMA.some((prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`))) {
    return NextResponse.next();
  }

  const jaTemIdioma = IDIOMAS.some(
    (i) => pathname === `/${i}` || pathname.startsWith(`/${i}/`)
  );

  if (jaTemIdioma) {
    // Visitar uma URL de idioma É a escolha do visitante: grava, para a
    // próxima visita à raiz cair no mesmo lugar.
    const idiomaDaUrl = pathname.split('/')[1];
    // O caminho vai num cabeçalho para o 404 conseguir descobrir o
    // idioma: ele é renderizado sem , então não tem outro jeito
    // de saber em que idioma responder.
    const resposta = NextResponse.next({
      request: { headers: novoCabecalho(request, pathname) }
    });
    if (request.cookies.get(COOKIE)?.value !== idiomaDaUrl) {
      resposta.cookies.set(COOKIE, idiomaDaUrl, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax'
      });
    }
    return resposta;
  }

  // Português por padrão, e a escolha manual é lembrada.
  //
  // Chegamos a detectar o idioma pelo navegador e pelo país de origem.
  // Saiu: acertava na maioria, mas cada palpite errado é um visitante
  // caindo num idioma que ele não pediu, e o site tem um seletor visível
  // no cabeçalho para resolver isso em um clique.
  //
  // O cookie é o que importa aqui: quem trocou de idioma uma vez não
  // precisa trocar de novo nas próximas visitas.
  const salvo = request.cookies.get(COOKIE)?.value;
  const idioma = salvo && ehIdioma(salvo) ? salvo : IDIOMA_PADRAO;

  const destino = request.nextUrl.clone();
  destino.pathname = `/${idioma}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(destino, 307);
}

export const config = {
  // Fica de fora tudo que não é página: arquivos estáticos, imagens e os
  // metadados que o Google lê na raiz. Sem isto, o /sitemap.xml seria
  // redirecionado para /pt-BR/sitemap.xml e o buscador não o encontraria.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)'
  ]
};

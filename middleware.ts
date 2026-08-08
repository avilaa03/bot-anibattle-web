import { NextResponse, type NextRequest } from 'next/server';
import { IDIOMAS, IDIOMA_PADRAO, negociarIdioma, ehIdioma } from '@/lib/i18n/config';

/**
 * Põe o idioma na URL.
 *
 * Toda página pública vive sob `/<idioma>/...`. Quem chega numa URL sem
 * idioma é redirecionado para o idioma que o navegador pede — e a
 * escolha manual, quando existe, ganha do navegador.
 *
 * ## Por que o português também tem prefixo
 *
 * Seria possível deixar `/guia` como português e só prefixar os outros.
 * Não fizemos: sem prefixo, `/guia` e `/pt-BR/guia` viram duas URLs com
 * o mesmo conteúdo, e o Google trata isso como conteúdo duplicado a
 * menos que se acerte canonical em toda página. Um endereço por idioma,
 * sem exceção, é mais simples de manter correto.
 *
 * O custo é que os links antigos (`/guia`) mudam — por isso o redirect
 * abaixo é 307, não 308: mantém os antigos funcionando sem gravar em
 * cache do navegador uma decisão de idioma que pode mudar.
 */

const COOKIE = 'idioma';

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
    const resposta = NextResponse.next();
    if (request.cookies.get(COOKIE)?.value !== idiomaDaUrl) {
      resposta.cookies.set(COOKIE, idiomaDaUrl, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax'
      });
    }
    return resposta;
  }

  // Escolha anterior vence o navegador: quem já trocou de idioma no site
  // não quer ser mandado de volta pelo Accept-Language a cada visita.
  const salvo = request.cookies.get(COOKIE)?.value;
  const idioma = salvo && ehIdioma(salvo)
    ? salvo
    : negociarIdioma(request.headers.get('accept-language'));

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

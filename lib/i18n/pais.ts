import { IDIOMA_PADRAO, type Idioma } from './config';

/**
 * De que país o visitante veio, e que idioma isso sugere.
 *
 * ## De onde vem o país
 *
 * Next.js não descobre o país sozinho: quem informa é a camada na frente
 * da aplicação, por um cabeçalho. Os nomes mudam conforme o provedor —
 * daí a lista abaixo, em ordem de confiança.
 *
 * **Numa VPS sem nada na frente, nenhum desses cabeçalhos existe**, e a
 * detecção por país simplesmente não acontece. Não é erro: a função
 * devolve `null` e quem chama cai no `Accept-Language` do navegador, que
 * funciona em qualquer hospedagem e costuma acertar tanto quanto.
 *
 * Para o país passar a valer, basta pôr o site atrás da Cloudflare (plano
 * gratuito serve) e ligar o "IP Geolocation" — ela passa a mandar
 * `CF-IPCountry` e isto começa a funcionar sozinho, sem mudar código.
 */

const CABECALHOS_DE_PAIS = [
  'cf-ipcountry',        // Cloudflare
  'x-vercel-ip-country', // Vercel
  'x-geo-country',       // convenção comum em proxies próprios
  'x-country-code'
];

/**
 * País → idioma.
 *
 * A lista cobre os países onde cada língua é oficial ou majoritária. Um
 * país fora dela cai no `Accept-Language`, e depois no português.
 *
 * Note que país não é língua: um argentino no Brasil recebe português
 * pelo IP, mas o navegador dele quase certamente pede espanhol — por
 * isso o `Accept-Language` continua tendo a última palavra quando o país
 * não é conclusivo, e por isso a escolha manual vence os dois.
 */
const PAIS_PARA_IDIOMA: Record<string, Idioma> = {
  // Português
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',

  // Inglês
  US: 'en', GB: 'en', IE: 'en', CA: 'en', AU: 'en', NZ: 'en', ZA: 'en',
  IN: 'en', SG: 'en', PH: 'en', NG: 'en', KE: 'en', GH: 'en', JM: 'en', TT: 'en',

  // Espanhol
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', GQ: 'es'
};

/** Código de país do visitante, ou null se a hospedagem não informar. */
export function paisDaRequisicao(headers: Headers): string | null {
  for (const nome of CABECALHOS_DE_PAIS) {
    const valor = headers.get(nome);
    // A Cloudflare manda 'XX' quando não consegue determinar, e 'T1' para
    // tráfego vindo do Tor. Nenhum dos dois diz nada sobre idioma.
    if (valor && valor.length === 2 && !['XX', 'T1'].includes(valor.toUpperCase())) {
      return valor.toUpperCase();
    }
  }
  return null;
}

/** Idioma sugerido pelo país, ou null se o país for desconhecido. */
export function idiomaDoPais(pais: string | null): Idioma | null {
  if (!pais) return null;
  return PAIS_PARA_IDIOMA[pais] ?? null;
}

export { IDIOMA_PADRAO };

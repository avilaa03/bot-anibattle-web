/**
 * Idiomas do site.
 *
 * Os códigos são a LÍNGUA, sem região: `pt`, `en`, `es`.
 *
 * Isso é decisão de alcance, não de preguiça. Com `en-US`, o Google
 * entende que a página é para os Estados Unidos e deixa de oferecê-la a
 * quem busca em inglês no Reino Unido ou na Austrália. Com `es-ES`, o
 * mesmo acontece com o México — que é o maior mercado de língua
 * espanhola. E entre pt-BR e pt-PT não há diferença que justifique
 * separar o conteúdo em duas versões.
 *
 * Um efeito colateral a saber: o BOT usa `pt-BR` e `en-US` porque o
 * Discord exige esses códigos exatos na API dele. Site e bot têm códigos
 * diferentes de propósito — são sistemas separados, cada um seguindo a
 * regra de quem o hospeda.
 *
 * O português é o padrão e o texto de reserva: chave que faltar em outro
 * idioma cai nele, em vez de sumir da tela.
 */

export const IDIOMAS = ['pt', 'en', 'es'] as const;

export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PADRAO: Idioma = 'pt';

/**
 * Como cada idioma se apresenta no seletor.
 *
 * O rótulo curto vai no botão; o nome completo vai no `title` e num
 * texto só para leitor de tela, para quem não enxerga não ouvir só "PT".
 */
export const ROTULOS: Record<Idioma, { curto: string; nome: string; bandeira: string }> = {
  pt: { curto: 'PT', nome: 'Português', bandeira: '🇧🇷' },
  en: { curto: 'EN', nome: 'English', bandeira: '🇬🇧' },
  es: { curto: 'ES', nome: 'Español', bandeira: '🇪🇸' }
};

/**
 * Локаль para `Intl` (número e data).
 *
 * Aqui a região volta, e não é contradição: `Intl` precisa dela para
 * saber que 1.234 tem ponto em português e vírgula em inglês. Isso é
 * formatação, não indexação — o que o Google lê é o `hreflang`.
 */
export const LOCALE_FORMATO: Record<Idioma, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES'
};

export function ehIdioma(valor: string): valor is Idioma {
  return (IDIOMAS as readonly string[]).includes(valor);
}


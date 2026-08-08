import 'server-only';

import { IDIOMA_PADRAO, LOCALE_FORMATO, type Idioma } from './config';

import pt from './dicionarios/pt.json';
import en from './dicionarios/en.json';
import es from './dicionarios/es.json';

/**
 * Tradução das páginas públicas.
 *
 * Mesma convenção do bot: nenhuma página escreve texto na mão, tudo sai
 * de `dicionarios/<idioma>.json` por `t('chave.pontilhada')`.
 *
 * O `server-only` no topo é proposital. Os dicionários somados passam de
 * 100 KB; se um componente de cliente importasse este arquivo por
 * engano, os três idiomas iriam parar no bundle do navegador. Assim o
 * build quebra na hora, em vez de a página ficar pesada em silêncio.
 * Componente de cliente recebe as strings já traduzidas por prop.
 */

const DICIONARIOS: Record<Idioma, unknown> = {
  pt,
  en,
  es
};

function buscar(dicionario: unknown, chave: string): unknown {
  let atual: unknown = dicionario;
  for (const parte of chave.split('.')) {
    if (atual === null || typeof atual !== 'object') return undefined;
    atual = (atual as Record<string, unknown>)[parte];
  }
  return atual;
}

/** Substitui {marcadores}. Marcador sem valor fica como está — some do
 * texto, mas nunca vira "undefined" na cara do visitante. */
function interpolar(texto: string, valores?: Record<string, string | number>): string {
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (original, nome: string) =>
    Object.prototype.hasOwnProperty.call(valores, nome) ? String(valores[nome]) : original
  );
}

export type Tradutor = {
  (chave: string, valores?: Record<string, string | number>): string;
  /** Valor cru do dicionário, para conteúdo que é estrutura e não frase. */
  dados: <T>(chave: string) => T;
  idioma: Idioma;
};

/**
 * Devolve o `t` preso a um idioma.
 *
 * Chave ausente devolve a própria chave. É feio na tela de propósito:
 * aparece na hora, em vez de virar um vazio que passa despercebido até
 * alguém reclamar.
 */
export function traduzir(idioma: Idioma): Tradutor {
  const t = ((chave: string, valores?: Record<string, string | number>) => {
    let valor = buscar(DICIONARIOS[idioma], chave);
    if (valor === undefined && idioma !== IDIOMA_PADRAO) {
      valor = buscar(DICIONARIOS[IDIOMA_PADRAO], chave);
    }
    if (typeof valor === 'string') return interpolar(valor, valores);
    if (Array.isArray(valor)) {
      return valor.map((l) => interpolar(String(l), valores)).join('\n');
    }
    return chave;
  }) as Tradutor;

  t.dados = <T>(chave: string): T => {
    const valor = buscar(DICIONARIOS[idioma], chave);
    return (valor !== undefined ? valor : buscar(DICIONARIOS[IDIOMA_PADRAO], chave)) as T;
  };

  t.idioma = idioma;
  return t;
}

/** Formatador de número no idioma certo (1.234 x 1,234 x 1.234). */
export function formatarNumero(valor: number, idioma: Idioma): string {
  return new Intl.NumberFormat(LOCALE_FORMATO[idioma]).format(valor);
}

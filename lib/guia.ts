/**
 * O conteúdo do guia do jogador.
 *
 * ## Onde mora o quê
 *
 * O TEXTO fica nos dicionários (`guia.*` em `lib/i18n/dicionarios`),
 * porque é texto e existe em três idiomas. Aqui ficam os NÚMEROS e o
 * formato — e é este arquivo que junta os dois.
 *
 * A página vira um `map`, e acrescentar seção é acrescentar objeto no
 * dicionário. Mais importante: o índice lateral se monta sozinho a partir
 * da mesma lista, então nunca há uma seção sem link nem um link para
 * seção que não existe.
 *
 * ## O tom
 *
 * Isto é para JOGADOR, não para quem programou o bot. Três regras:
 *
 * 1. **Nada de jargão do código.** Ninguém sabe o que é "sink", "EV" ou
 *    "cooldown efetivo". Fala-se de moeda que sai de circulação, de quanto
 *    a caixa devolve na média, de quanto tempo até o próximo roll.
 * 2. **Dizer o que dá errado.** O guia avisa que a venda rápida paga mal
 *    em carta rara ANTES de a pessoa perder 85% do valor num clique. Guia
 *    que só elogia o produto não é guia, é propaganda.
 * 3. **Números de verdade.** "As chances ficam à vista" só vale se elas
 *    estiverem à vista.
 *
 * ## Nomes de comando não se traduzem
 *
 * `/roll`, `/battle`, `/market` aparecem iguais nos três idiomas porque é
 * o que o jogador digita. Só `/idioma` tem nome localizado no Discord
 * (`/language`) — os outros comandos não têm `setNameLocalizations`, e
 * traduzir aqui mandaria a pessoa digitar algo que não existe.
 */

import { CARGAS_BASE, NIVEIS_DE_CARGA, maxCargas } from './nivel';
import type { Tradutor } from './i18n';

/**
 * Números do guia que TÊM que bater com a regra de verdade.
 *
 * A regra 3 do cabeçalho ("números de verdade") só se sustenta se eles
 * vierem do mesmo lugar que o jogo usa. Um "4 cargas" digitado à mão
 * sobrevive à mudança da regra e vira mentira em silêncio — o texto
 * continua bonito e passa a estar errado.
 *
 * Por isso o dicionário escreve `{max_cargas}` em vez do número: o
 * tradutor não tem como congelar um valor que ele nem vê.
 */
const CARGAS_MAX = maxCargas(NIVEIS_DE_CARGA[NIVEIS_DE_CARGA.length - 1]);

const VALORES: Record<string, string> = {
  cargas_base: String(CARGAS_BASE),
  cargas_base_vip: String(CARGAS_BASE + 1),
  max_cargas: String(CARGAS_MAX),
  max_cargas_vip: String(CARGAS_MAX + 1),
  marcos: NIVEIS_DE_CARGA.join(', '),
  nivel_carga_1: String(NIVEIS_DE_CARGA[0]),
  nivel_carga_2: String(NIVEIS_DE_CARGA[1]),
  nivel_carga_3: String(NIVEIS_DE_CARGA[2]),
  cargas_nivel_1: String(maxCargas(NIVEIS_DE_CARGA[0])),
  cargas_nivel_2: String(maxCargas(NIVEIS_DE_CARGA[1])),
  cargas_nivel_3: String(maxCargas(NIVEIS_DE_CARGA[2]))
};

export interface Passo {
  titulo: string;
  texto: string;
}

export interface Comando {
  nome: string;
  o_que_faz: string;
  dica?: string;
}

export interface Secao {
  id: string;
  icone: string;
  titulo: string;
  resumo: string;
  paragrafos?: string[];
  comandos?: Comando[];
  /** Caixa de destaque no fim da seção. */
  atencao?: { titulo: string; texto: string };
  tabela?: { cabecalho: string[]; linhas: string[][] };
}

export interface Duvida {
  pergunta: string;
  resposta: string;
}

/**
 * Troca os `{marcadores}` numéricos, em profundidade.
 *
 * Devolve estrutura nova em vez de escrever por cima: `t.dados` entrega o
 * objeto do JSON importado, que é o mesmo em toda requisição. Mexer nele
 * contaminaria as próximas — e só na produção, onde o módulo fica em
 * cache.
 */
function preencher<T>(valor: T): T {
  if (typeof valor === 'string') {
    return valor.replace(/\{(\w+)\}/g, (original, nome: string) =>
      Object.prototype.hasOwnProperty.call(VALORES, nome) ? VALORES[nome] : original
    ) as unknown as T;
  }
  if (Array.isArray(valor)) {
    return valor.map((item) => preencher(item)) as unknown as T;
  }
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, preencher(v)])
    ) as T;
  }
  return valor;
}

export function primeirosPassos(t: Tradutor): Passo[] {
  return preencher(t.dados<Passo[]>('guia.passos'));
}

export function secoes(t: Tradutor): Secao[] {
  return preencher(t.dados<Secao[]>('guia.secoes'));
}

export function duvidas(t: Tradutor): Duvida[] {
  return preencher(t.dados<Duvida[]>('guia.duvidas'));
}

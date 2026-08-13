import { randomInt } from 'node:crypto';
import { TIERS } from '@/lib/vip';
import { getItem, ITENS } from '@/lib/itens';
import { getCaixa, CAIXAS } from '@/lib/caixas';

/**
 * Códigos de resgate — espelho de `Commands/utils/redeem.js` e
 * `Commands/utils/rewards.js` do bot.
 *
 * ## Por que espelhar em vez de importar
 *
 * O bot usa Mongoose e vive num processo próprio; o site usa o driver
 * nativo. Não há import possível entre os dois, e chamar o bot pela rede
 * exigiria expô-lo na internet — que é justamente o que o desenho de
 * código evita. Então vale a mesma regra de `vip.ts`, `sorteio.ts` e
 * `valores.ts`: o site tem sua cópia, e `npm run codigos:conferir`
 * reprova quando as duas discordarem.
 *
 * ## O que NÃO está espelhado, de propósito
 *
 * O **resgate** mora só no bot. O site cria códigos e o bot os consome —
 * e a trava contra resgate duplo (o índice único `(codigo, userId)` na
 * coleção `resgates`) precisa de um dono só. Duas implementações da mesma
 * trava viram duas travas que discordam.
 */

// ---------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------

/**
 * Sem 0, O, 1, I e L.
 *
 * O jogador digita o código à mão olhando para um print ou para a tela de
 * obrigado, e `0`/`O` são o mesmo rabisco em quase toda fonte. Cada
 * confusão dessas vira uma mensagem no privado do suporte.
 */
export const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const PREFIXO = 'ANI';
const GRUPOS = 3;
const TAMANHO_GRUPO = 4;

export const FORMATO = new RegExp(
  `^${PREFIXO}(-[${ALFABETO}]{${TAMANHO_GRUPO}}){${GRUPOS}}$`
);

export function ehFormatoValido(codigo: string): boolean {
  return FORMATO.test(codigo);
}

/**
 * Gera um código novo.
 *
 * `randomInt` do `node:crypto`, nunca `Math.random`: o gerador padrão do
 * JavaScript é previsível a partir de saídas anteriores, e código de
 * resgate previsível é dinheiro de graça para quem achar o padrão. Ele
 * também é uniforme — `Math.random() * 31 | 0` enviesa os primeiros
 * símbolos e encolhe o espaço real de busca.
 */
export function gerarCodigo(): string {
  const grupos: string[] = [];
  for (let g = 0; g < GRUPOS; g++) {
    let grupo = '';
    for (let i = 0; i < TAMANHO_GRUPO; i++) grupo += ALFABETO[randomInt(0, ALFABETO.length)];
    grupos.push(grupo);
  }
  return [PREFIXO, ...grupos].join('-');
}

// ---------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------

export type TipoRecompensa = 'vip' | 'moedas' | 'item' | 'caixa' | 'carta';

export const TIPOS: TipoRecompensa[] = ['vip', 'moedas', 'item', 'caixa', 'carta'];

export interface Recompensa {
  tipo: TipoRecompensa;
  params: Record<string, unknown>;
}

/** Tetos por recompensa. Guarda contra o zero a mais, não regra de jogo. */
export const MAXIMO = {
  moedas: 1_000_000,
  quantidade: 100,
  meses: 120
};

export class ErroDeCodigo extends Error {}

function inteiroPositivo(valor: unknown, campo: string, maximo: number): number {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n <= 0) {
    throw new ErroDeCodigo(`"${campo}" precisa ser um número maior que zero.`);
  }
  if (n > maximo) throw new ErroDeCodigo(`"${campo}" passa do máximo permitido (${maximo}).`);
  return n;
}

/**
 * Valida e normaliza UMA recompensa.
 *
 * Roda na CRIAÇÃO do código, e é a linha de defesa que importa: sem ela,
 * um código com `{ caixa: 'lendária' }` é aceito, vendido, pago — e só
 * falha na cara do jogador, com o dinheiro já no seu bolso. Aqui ele
 * falha na sua tela, antes de existir cliente.
 *
 * O que sai daqui é o que fica GRAVADO, não o que veio da tela: `"3"`
 * vira `3`, `"OURO"` vira `"ouro"`. Assim a entrega, no bot, nunca
 * precisa desconfiar do que está lendo.
 */
export function validarRecompensa(bruta: unknown): Recompensa {
  const r = (bruta ?? {}) as { tipo?: unknown; params?: Record<string, unknown> };
  const tipo = String(r.tipo ?? '').toLowerCase().trim() as TipoRecompensa;
  const params = r.params ?? {};

  switch (tipo) {
    case 'vip': {
      const tier = String(params.tier ?? '').toLowerCase().trim();
      if (!TIERS[tier]) {
        throw new ErroDeCodigo(
          `Plano "${params.tier}" não existe. Use: ${Object.keys(TIERS).join(', ')}.`
        );
      }
      return { tipo, params: { tier, meses: inteiroPositivo(params.meses ?? 1, 'meses', MAXIMO.meses) } };
    }

    case 'moedas':
      return { tipo, params: { quantidade: inteiroPositivo(params.quantidade, 'quantidade', MAXIMO.moedas) } };

    case 'item': {
      const chave = String(params.chave ?? '').toLowerCase().trim();
      if (!getItem(chave)) {
        throw new ErroDeCodigo(
          `Item "${params.chave}" não existe. Use: ${Object.keys(ITENS).join(', ')}.`
        );
      }
      return {
        tipo,
        params: { chave, quantidade: inteiroPositivo(params.quantidade ?? 1, 'quantidade', MAXIMO.quantidade) }
      };
    }

    case 'caixa': {
      const chave = String(params.chave ?? '').toLowerCase().trim();
      if (!getCaixa(chave)) {
        throw new ErroDeCodigo(
          `Caixa "${params.chave}" não existe. Use: ${Object.keys(CAIXAS).join(', ')}.`
        );
      }
      return {
        tipo,
        params: { chave, quantidade: inteiroPositivo(params.quantidade ?? 1, 'quantidade', MAXIMO.quantidade) }
      };
    }

    case 'carta': {
      const cardId = String(params.cardId ?? '').trim();
      // A existência da carta é conferida em `lib/admin/codigos.ts`, que
      // tem o banco à mão. Aqui só o formato — este arquivo é puro de
      // propósito, para poder ser testado sem conexão.
      if (!/^[a-f\d]{24}$/i.test(cardId)) {
        throw new ErroDeCodigo(`"${params.cardId}" não é um id de carta válido.`);
      }
      return {
        tipo,
        params: {
          cardId,
          quantidade: inteiroPositivo(params.quantidade ?? 1, 'quantidade', MAXIMO.quantidade),
          semPokedex: params.semPokedex === true
        }
      };
    }

    default:
      throw new ErroDeCodigo(
        `Tipo de recompensa "${r.tipo}" não existe. Use: ${TIPOS.join(', ')}.`
      );
  }
}

export function validarRecompensas(brutas: unknown): Recompensa[] {
  if (!Array.isArray(brutas) || brutas.length === 0) {
    throw new ErroDeCodigo('O código precisa entregar pelo menos uma recompensa.');
  }
  if (brutas.length > 10) {
    throw new ErroDeCodigo('Um código entrega no máximo 10 recompensas.');
  }
  return brutas.map(validarRecompensa);
}

/**
 * Texto de uma recompensa, para a tela do painel.
 *
 * Só em português: o painel é em português por decisão de escopo, e o
 * texto que o JOGADOR vê é montado pelo bot, no idioma dele.
 */
export function descrever(r: Recompensa): string {
  const p = r.params as Record<string, number & string>;
  switch (r.tipo) {
    case 'vip': {
      const tier = TIERS[String(p.tier)];
      return `${tier.emoji} VIP ${tier.nome} por ${p.meses} mês(es)`;
    }
    case 'moedas':
      return `🪙 ${Number(p.quantidade).toLocaleString('pt-BR')} moedas`;
    case 'item': {
      const item = getItem(String(p.chave));
      return `${item?.emoji ?? '🎒'} ${item?.nome ?? p.chave} x${p.quantidade}`;
    }
    case 'caixa': {
      const caixa = getCaixa(String(p.chave));
      return `${caixa?.emoji ?? '📦'} ${caixa?.nome ?? p.chave} x${p.quantidade}`;
    }
    case 'carta':
      return `🎴 ${p.quantidade} carta(s) do catálogo`;
    default:
      return String(r.tipo);
  }
}

import { CHANCE_MESTRA, CHANCE_MESTRA_PADRAO, PROTECOES, tabelaDeChances, umACada } from '@/lib/sorteio';
import { PRECO_GEMA } from '@/lib/itens';
import { VALOR_BASE } from '@/lib/valores';

/**
 * As variáveis de ambiente que mudam o jogo sem precisar de deploy.
 *
 * ## Por que esta tela existe
 *
 * Todas elas têm padrão embutido, então nada quebra sem elas — e é
 * exatamente isso que as torna fáceis de esquecer. Sem uma tela dizendo o
 * valor EM VIGOR, a única forma de saber se `CHANCE_MESTRA=0.05` pegou é
 * entrar na VPS e ler o `.env`.
 *
 * ## ⚠️ O que este arquivo consegue e o que não consegue enxergar
 *
 * O site e o bot são processos diferentes, em containers diferentes. O que
 * aparece aqui é o `.env` **do site**, não o do bot.
 *
 * Para a maioria das variáveis os dois leem o mesmo valor porque você
 * configura os dois iguais — mas se divergirem, esta tela mostra o do site
 * e o jogo pratica o do bot. Onde isso importa, o campo vem marcado com
 * `fonte: 'site'` e a tela avisa.
 *
 * A saída definitiva seria o bot publicar a própria configuração em
 * `bot_status` (ele já escreve ali a cada minuto). Fica registrado como o
 * próximo passo natural desta tela.
 */

export type FonteDoValor = 'site' | 'compartilhada';

export interface VariavelDeConfig {
  env: string;
  rotulo: string;
  valorEmVigor: string;
  padrao: string;
  usandoPadrao: boolean;
  /** O que muda no jogo, em uma frase. */
  efeito: string;
  /** O que observar antes de mexer. */
  quandoMexer: string;
  fonte: FonteDoValor;
  grupo: 'sorteio' | 'economia' | 'ritmo';
}

function texto(valor: number, casas = 0): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function doEnv(nome: string): string | null {
  const bruto = process.env[nome];
  return bruto === undefined || bruto === '' ? null : bruto;
}

export function listarConfiguracao(): VariavelDeConfig[] {
  const multiplicador = Number(process.env.VALOR_MULTIPLICADOR) > 0
    ? Number(process.env.VALOR_MULTIPLICADOR)
    : 1;

  const taxa = Number(process.env.MARKET_TAX_RATE);
  const taxaEmVigor = taxa >= 0 && taxa <= 0.5 ? taxa : 0.05;

  const cooldown = Number(process.env.ROLL_COOLDOWN_MS) > 0
    ? Number(process.env.ROLL_COOLDOWN_MS)
    : 15 * 60 * 1000;

  const linhas: VariavelDeConfig[] = [
    {
      env: 'CHANCE_MESTRA',
      rotulo: 'Chance de Mestra',
      valorEmVigor: `${CHANCE_MESTRA}%`,
      padrao: `${CHANCE_MESTRA_PADRAO}%`,
      usandoPadrao: doEnv('CHANCE_MESTRA') === null,
      efeito: `1 Mestra a cada ${texto(umACada(CHANCE_MESTRA) ?? 0)} rolls. A Comum absorve a diferença automaticamente.`,
      quandoMexer:
        'A sensação de "evento do servidor" depende do volume de rolls do servidor inteiro, '
        + 'não da taxa individual. Passando de ~40 jogadores ativos, caia para 0.05.',
      fonte: 'compartilhada',
      grupo: 'sorteio'
    },
    ...PROTECOES.map((p): VariavelDeConfig => ({
      env: p.env,
      rotulo: `Garantia de ${p.raridade === 'ultra rare' ? 'Ultra Rara' : 'Lendária'}`,
      valorEmVigor: `${texto(p.limite)} rolls`,
      padrao: `${texto(p.padrao)} rolls`,
      usandoPadrao: doEnv(p.env) === null,
      efeito: `Depois de ${texto(p.limite)} rolls sem essa raridade ou melhor, o próximo vem garantido.`,
      quandoMexer:
        p.raridade === 'ultra rare'
          ? 'Pega o ~1% mais azarado e age em silêncio. Subir demais transforma a rede em código morto.'
          : 'É a rede que evita desistência. Baixar demais faz a Lendária virar rotina.',
      fonte: 'compartilhada',
      grupo: 'sorteio'
    })),
    {
      env: 'VALOR_MULTIPLICADOR',
      rotulo: 'Escala dos preços',
      valorEmVigor: `${multiplicador}x`,
      padrao: '1x',
      usandoPadrao: doEnv('VALOR_MULTIPLICADOR') === null,
      efeito:
        `Uma Mestra de overall 95 vale ${texto(Math.round(VALOR_BASE.master * 1.27 * multiplicador))} moedas. `
        + 'Escala tudo mantendo a hierarquia entre raridades.',
      quandoMexer:
        '⚠️ Mexer aqui NÃO reprecifica o acervo já existente — o valor fica gravado em cada carta. '
        + 'Depois de mudar, rode `npm run migrar:valores -- --confirmar` no bot.',
      fonte: 'site',
      grupo: 'economia'
    },
    {
      env: 'PRECO_GEMA',
      rotulo: 'Preço da gema',
      valorEmVigor: `${texto(PRECO_GEMA)} moedas`,
      padrao: '150 moedas',
      usandoPadrao: doEnv('PRECO_GEMA') === null,
      efeito: 'Régua do aprimoramento e do desmanche. É o principal sink de moeda do jogo.',
      quandoMexer:
        'A tabela de desmanche foi calibrada contra a venda rápida. Subir demais faz a Mestra '
        + 'valer mais desmanchada do que vendida — e aí o jogo passa a empurrar todo mundo a '
        + 'picotar a carta mais rara. O bot tem teste que falha se isso acontecer.',
      fonte: 'compartilhada',
      grupo: 'economia'
    },
    {
      env: 'MARKET_TAX_RATE',
      rotulo: 'Taxa do mercado',
      valorEmVigor: `${(taxaEmVigor * 100).toFixed(1)}%`,
      padrao: '5.0%',
      usandoPadrao: doEnv('MARKET_TAX_RATE') === null,
      efeito: 'Retido em cada venda no mercado. Essa moeda é destruída, não vai para ninguém.',
      quandoMexer: 'Era o único sink do jogo antes da loja. Subir freia inflação, mas esfria o mercado.',
      fonte: 'site',
      grupo: 'economia'
    },
    {
      env: 'ROLL_COOLDOWN_MS',
      rotulo: 'Intervalo do /roll',
      valorEmVigor: `${texto(cooldown / 60000, 1)} min`,
      padrao: '15 min',
      usandoPadrao: doEnv('ROLL_COOLDOWN_MS') === null,
      efeito: `Teto de ${texto(Math.floor((24 * 60) / (cooldown / 60000)))} rolls por dia (VIP chega a 40% menos espera).`,
      quandoMexer:
        'Mexe em tudo ao mesmo tempo: quantas cartas entram, quanto a Mestra demora e quanto '
        + 'vantagem um macro tem sobre quem dorme.',
      fonte: 'site',
      grupo: 'ritmo'
    }
  ];

  return linhas;
}

export interface ProjecaoDeMestra {
  jogadoresAtivos: number;
  rollsPorDia: number;
  horasEntreMestras: number | null;
}

/**
 * De quanto em quanto tempo sai uma Mestra no servidor, para alguns
 * tamanhos de base.
 *
 * É a tabela que responde "já está na hora de baixar a chance?" — e ela
 * precisa da taxa em vigor, não da padrão.
 */
export function projetarMestras(
  jogadoresAtivos: number,
  rollsPorJogadorPorDia = 30,
  chanceMestra = CHANCE_MESTRA
): ProjecaoDeMestra {
  const rollsPorDia = jogadoresAtivos * rollsPorJogadorPorDia;
  const porDia = rollsPorDia * (chanceMestra / 100);

  return {
    jogadoresAtivos,
    rollsPorDia,
    horasEntreMestras: porDia > 0 ? 24 / porDia : null
  };
}

/** A tabela de chances em vigor, pronta para a tela. */
export function tabelaEmVigor() {
  return tabelaDeChances().map((f) => ({
    ...f,
    umACada: umACada(f.chance)
  }));
}

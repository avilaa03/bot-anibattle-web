/**
 * Planos VIP — espelho de `bot_animefight/Commands/utils/vip.js`.
 *
 * Só os campos que o site precisa: nome, preço e ordem. As vantagens de
 * jogo (cooldown, daily, molduras) continuam morando no bot, que é quem
 * as aplica. Se um preço mudar lá, mude aqui junto.
 */

export interface TierVip {
  key: string;
  nome: string;
  emoji: string;
  precoBRL: number;
  ordem: number;
  cor: string;
  /** Multiplicador do cooldown do /roll. 0.9 = 10% mais rápido. */
  rollCooldownMultiplier: number;
  /**
   * Cargas de roll a mais que o plano concede.
   *
   * Quantidade, nunca sorte: o assinante ACUMULA mais rolls não usados e
   * continua com exatamente a mesma chance de raridade.
   */
  cargasExtras: number;
  /** Multiplicador da recompensa diária. */
  dailyMultiplier: number;
  /** Bilhetes de roll extra entregues junto com o /daily. */
  rollExtraDiario: number;
  /**
   * Multiplicador da taxa do mercado. 0.6 = paga 60% da taxa normal,
   * 0 = isento.
   */
  taxaMercadoMultiplier: number;
  /** Multiplicador da venda rápida. 1.15 = recebe 15% a mais. */
  bonusVendaRapida: number;
  /**
   * Molduras de carta liberadas, por CHAVE.
   *
   * Chave e não nome porque "Prata" é "Silver" em inglês. O nome de
   * exibição sai de `t('vip.molduras.<chave>')`, com o mesmo vocabulário
   * do `vip_catalogo.molduras` do bot — é a mesma moldura nos dois lugares.
   */
  molduras: string[];
  /** Quantas cartas cabem na lista de desejos. */
  limiteDesejos: number;
  podeCorPerfil: boolean;
  podeBanner: boolean;
  destaqueRanking: boolean;
}

export const TIERS: Record<string, TierVip> = {
  bronze: {
    key: 'bronze', nome: 'Bronze', emoji: '🥉', precoBRL: 5, ordem: 1, cor: '#CD7F32',
    rollCooldownMultiplier: 0.85, cargasExtras: 1, dailyMultiplier: 1.5,
    rollExtraDiario: 0, taxaMercadoMultiplier: 0.8, bonusVendaRapida: 1.05,
    molduras: ['bronze'], limiteDesejos: 25,
    podeCorPerfil: true, podeBanner: false, destaqueRanking: false
  },
  prata: {
    key: 'prata', nome: 'Prata', emoji: '🥈', precoBRL: 15, ordem: 2, cor: '#C0C0C0',
    rollCooldownMultiplier: 0.75, cargasExtras: 1, dailyMultiplier: 2,
    rollExtraDiario: 1, taxaMercadoMultiplier: 0.6, bonusVendaRapida: 1.10,
    molduras: ['bronze', 'prata'], limiteDesejos: 40,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: false
  },
  ouro: {
    key: 'ouro', nome: 'Ouro', emoji: '🥇', precoBRL: 30, ordem: 3, cor: '#FFD700',
    rollCooldownMultiplier: 0.65, cargasExtras: 2, dailyMultiplier: 2.5,
    rollExtraDiario: 2, taxaMercadoMultiplier: 0.3, bonusVendaRapida: 1.15,
    molduras: ['bronze', 'prata', 'ouro', 'sakura'], limiteDesejos: 60,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: true
  },
  master: {
    key: 'master', nome: 'Master', emoji: '🌟', precoBRL: 50, ordem: 4, cor: '#E91E63',
    rollCooldownMultiplier: 0.55, cargasExtras: 3, dailyMultiplier: 3,
    rollExtraDiario: 3, taxaMercadoMultiplier: 0, bonusVendaRapida: 1.20,
    molduras: ['bronze', 'prata', 'ouro', 'sakura', 'holografica', 'neon'], limiteDesejos: 100,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: true
  }
};

/** Limite da lista de desejos para quem não assina. */
export const LIMITE_DESEJOS_GRATIS = 10;

/**
 * A taxa do mercado que todo mundo paga, antes do desconto do plano.
 *
 * Espelha `MARKET_TAX_RATE` de `utils/economy.js` no bot, que lê do
 * ambiente com este mesmo padrão. O site não tem como consultar o .env do
 * bot, então este número é o único ponto do projeto que precisa ser
 * mudado à mão se você mexer em `MARKET_TAX_RATE` na VPS.
 */
export const TAXA_MERCADO_BASE = 0.05;

/** A taxa efetiva de um plano, já com o desconto. `0.015` = 1,5%. */
export function taxaMercadoDe(tier: TierVip | null): number {
  return TAXA_MERCADO_BASE * (tier ? tier.taxaMercadoMultiplier : 1);
}

/** O bônus de venda rápida em porcentagem inteira: `1.15` vira `15`. */
export function bonusVendaEmPorcento(tier: TierVip): number {
  return Math.round((tier.bonusVendaRapida - 1) * 100);
}

/**
 * O que NENHUM plano dá.
 *
 * Esta lista existe na página de vendas de propósito, e vende mais do que
 * parece: quem já se queimou com bot pay-to-win procura exatamente isso
 * antes de pagar. Precisa continuar verdadeira — há um teste no bot
 * (`tests/vip.test.js`) que falha se algum plano ganhar campo de combate.
 */
/**
 * A lista mora nos dicionários (`vip.nunca_incluso`) porque é texto, e
 * precisa existir nos três idiomas.
 */

/** Redução de cooldown em porcentagem, para exibir. */
export function reducaoCooldown(tier: TierVip): number {
  return Math.round((1 - tier.rollCooldownMultiplier) * 100);
}

export const ORDEM_TIERS = ['bronze', 'prata', 'ouro', 'master'];

export interface VipDoJogador {
  tier?: string | null;
  since?: Date | null;
  expiresAt?: Date | null;
}

/**
 * As vantagens efetivas de um jogador.
 *
 * Espelha `getPerks` do bot. Recebe o objeto `vip` do documento, não o
 * usuário inteiro — o painel só precisa dessa parte.
 */
export function getPerks(vip: VipDoJogador | null | undefined) {
  const ativo = vipAtivo(vip);
  const tier = ativo && vip?.tier ? TIERS[vip.tier] : null;

  if (!tier) {
    return {
      vip: false, tier: null,
      rollCooldownMultiplier: 1, cargasExtras: 0, dailyMultiplier: 1,
      rollExtraDiario: 0, taxaMercadoMultiplier: 1, bonusVendaRapida: 1,
      limiteDesejos: LIMITE_DESEJOS_GRATIS
    };
  }

  return {
    vip: true,
    tier,
    rollCooldownMultiplier: tier.rollCooldownMultiplier,
    cargasExtras: tier.cargasExtras || 0,
    dailyMultiplier: tier.dailyMultiplier,
    rollExtraDiario: tier.rollExtraDiario || 0,
    taxaMercadoMultiplier: tier.taxaMercadoMultiplier ?? 1,
    bonusVendaRapida: tier.bonusVendaRapida ?? 1,
    limiteDesejos: tier.limiteDesejos || LIMITE_DESEJOS_GRATIS
  };
}

export function vipAtivo(vip: VipDoJogador | null | undefined): boolean {
  if (!vip?.tier) return false;
  if (!vip.expiresAt) return true; // vitalício
  return new Date(vip.expiresAt).getTime() > Date.now();
}

/**
 * Mesma regra do bot: renovar antes de expirar acumula o tempo restante
 * em vez de jogá-lo fora.
 */
export function calcularExpiracao(vip: VipDoJogador | null | undefined, meses: number): Date {
  const agora = Date.now();
  const atual = vipAtivo(vip) && vip?.expiresAt ? new Date(vip.expiresAt).getTime() : agora;
  const base = Math.max(agora, atual);
  return new Date(base + meses * 30 * 24 * 60 * 60 * 1000);
}

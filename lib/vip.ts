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
  /** Multiplicador da recompensa diária. */
  dailyMultiplier: number;
  /** Molduras de carta liberadas. */
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
    rollCooldownMultiplier: 0.90, dailyMultiplier: 1.25,
    molduras: ['Bronze'], limiteDesejos: 15,
    podeCorPerfil: true, podeBanner: false, destaqueRanking: false
  },
  prata: {
    key: 'prata', nome: 'Prata', emoji: '🥈', precoBRL: 15, ordem: 2, cor: '#C0C0C0',
    rollCooldownMultiplier: 0.80, dailyMultiplier: 1.5,
    molduras: ['Bronze', 'Prata'], limiteDesejos: 20,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: false
  },
  ouro: {
    key: 'ouro', nome: 'Ouro', emoji: '🥇', precoBRL: 30, ordem: 3, cor: '#FFD700',
    rollCooldownMultiplier: 0.70, dailyMultiplier: 2,
    molduras: ['Bronze', 'Prata', 'Ouro', 'Sakura'], limiteDesejos: 30,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: true
  },
  master: {
    key: 'master', nome: 'Master', emoji: '🌟', precoBRL: 50, ordem: 4, cor: '#E91E63',
    rollCooldownMultiplier: 0.60, dailyMultiplier: 3,
    molduras: ['Bronze', 'Prata', 'Ouro', 'Sakura', 'Holográfica', 'Neon'], limiteDesejos: 50,
    podeCorPerfil: true, podeBanner: true, destaqueRanking: true
  }
};

/** Limite da lista de desejos para quem não assina. */
export const LIMITE_DESEJOS_GRATIS = 10;

/**
 * O que NENHUM plano dá.
 *
 * Esta lista existe na página de vendas de propósito, e vende mais do que
 * parece: quem já se queimou com bot pay-to-win procura exatamente isso
 * antes de pagar. Precisa continuar verdadeira — há um teste no bot
 * (`tests/vip.test.js`) que falha se algum plano ganhar campo de combate.
 */
export const NUNCA_INCLUSO = [
  'Atributos melhores nas cartas (ATA, LIF, POW)',
  'Mais chance de rolar carta rara',
  'Qualquer vantagem no resultado de uma batalha',
  'Cartas exclusivas que não dá para conseguir jogando',
  'Moeda do jogo comprada com dinheiro real'
];

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

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
}

export const TIERS: Record<string, TierVip> = {
  bronze: { key: 'bronze', nome: 'Bronze', emoji: '🥉', precoBRL: 5, ordem: 1, cor: '#CD7F32' },
  prata: { key: 'prata', nome: 'Prata', emoji: '🥈', precoBRL: 15, ordem: 2, cor: '#C0C0C0' },
  ouro: { key: 'ouro', nome: 'Ouro', emoji: '🥇', precoBRL: 30, ordem: 3, cor: '#FFD700' },
  master: { key: 'master', nome: 'Master', emoji: '🌟', precoBRL: 50, ordem: 4, cor: '#E91E63' }
};

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

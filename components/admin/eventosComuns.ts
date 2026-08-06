import type { TipoEvento, CriterioSelecao } from '@/lib/admin/eventos';

/**
 * O que a lista e o detalhe do evento compartilham.
 *
 * Fica num arquivo à parte porque os dois componentes precisam, e um
 * importar do outro criaria ciclo.
 */

export interface ItemCatalogo {
  chave: string;
  nome: string;
  emoji: string;
}

export const TIPOS: { valor: TipoEvento; nome: string; descricao: string }[] = [
  {
    valor: 'direto',
    nome: 'Distribuição direta',
    descricao:
      'Você escolhe quem recebe, aqui no painel. Bom para premiar vencedores de algo que aconteceu fora do bot.'
  },
  {
    valor: 'inscricao',
    nome: 'Inscrição no bot',
    descricao: 'Os jogadores se inscrevem pelo /evento no Discord. Bom para sorteio e evento aberto.'
  },
  {
    valor: 'lote',
    nome: 'Premiação em lote',
    descricao: 'Cola a lista de IDs e premia de uma vez. Bom para compensar gente por um problema.'
  }
];

export const CRITERIOS: { valor: CriterioSelecao; nome: string }[] = [
  { valor: 'ids', nome: 'Lista de IDs' },
  { valor: 'beta', nome: 'Participantes da beta' },
  { valor: 'nivel', nome: 'Nível mínimo' },
  { valor: 'ranking', nome: 'Top do ranking' },
  { valor: 'ativos', nome: 'Ativos nos últimos dias' }
];

export const CORES_STATUS: Record<string, string> = {
  rascunho: 'bg-superficie2 text-textoFraco',
  aberto: 'bg-emerald-500/15 text-emerald-400',
  encerrado: 'bg-superficie2 text-textoFraco'
};

export function nomeDoTipo(tipo: string): string {
  return TIPOS.find((t) => t.valor === tipo)?.nome ?? tipo;
}

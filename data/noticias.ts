/**
 * Notícias da página inicial.
 *
 * Ficam em arquivo, não no banco, de propósito: são poucas, mudam pouco,
 * e assim você publica uma notícia com um commit — sem precisar de painel
 * administrativo nem de tabela nova. Quando isso virar incômodo (umas 20
 * notícias, ou vontade de publicar do celular), aí sim vale mover para o
 * banco.
 *
 * A primeira da lista aparece em destaque.
 */

export interface Noticia {
  slug: string;
  titulo: string;
  resumo: string;
  data: string;         // AAAA-MM-DD
  etiqueta: 'novidade' | 'atualizacao' | 'evento' | 'aviso';
  destaque?: boolean;
}

export const ETIQUETAS: Record<Noticia['etiqueta'], { label: string; cor: string }> = {
  novidade: { label: 'Novidade', cor: '#4CAF50' },
  atualizacao: { label: 'Atualização', cor: '#2196F3' },
  evento: { label: 'Evento', cor: '#FF9800' },
  aviso: { label: 'Aviso', cor: '#E53935' }
};

export const NOTICIAS: Noticia[] = [
  {
    slug: 'trofeus-e-missoes',
    titulo: 'Troféus, missões e ranking chegaram',
    resumo:
      'Agora você tem objetivos de longo prazo: 28 troféus no estilo PlayStation, com a '
      + 'Platina desbloqueando só quando você conquistar todos os outros. Somam-se a isso '
      + 'missões diárias e semanais, e um ranking de batalha de Bronze a Mestre.',
    data: '2026-08-02',
    etiqueta: 'novidade',
    destaque: true
  },
  {
    slug: 'trocas-e-lista-de-desejos',
    titulo: 'Troque cartas direto com outros jogadores',
    resumo:
      'Chega de intermediar tudo com moeda. O comando /trocar abre uma mesa onde os dois '
      + 'lados montam a oferta e confirmam. E com /desejar você marca as cartas que está '
      + 'caçando — quando alguém rolar uma delas, você é avisado na hora.',
    data: '2026-08-02',
    etiqueta: 'novidade'
  },
  {
    slug: 'daily-com-sequencia',
    titulo: 'A recompensa diária agora premia quem volta',
    resumo:
      'O /daily virou sequência: quanto mais dias seguidos você coleta, mais ele vale, '
      + 'com bônus especiais nos dias 7, 14, 30, 60 e 100. Faltou um dia? A sequência zera.',
    data: '2026-08-02',
    etiqueta: 'atualizacao'
  },
  {
    slug: 'pokedex',
    titulo: 'Pokédex: toda carta que passa pela sua mão fica registrada',
    resumo:
      'Mesmo que você venda a carta depois, ela continua no seu registro. Use /pokedex para '
      + 'ver o que falta e /ficha para consultar qualquer carta que você já teve.',
    data: '2026-08-01',
    etiqueta: 'novidade'
  }
];

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

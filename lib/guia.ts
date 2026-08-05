/**
 * O conteúdo do guia do jogador.
 *
 * ## Por que fica em dados e não no JSX
 *
 * A página vira um `map`, e acrescentar seção é acrescentar objeto. Mais
 * importante: o índice lateral se monta sozinho a partir daqui, então
 * nunca há uma seção sem link nem um link para seção que não existe.
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
 */

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

export const PRIMEIROS_PASSOS: Passo[] = [
  {
    titulo: 'Role sua primeira carta',
    texto:
      'Digite `/roll` em qualquer canal onde o bot esteja. Uma carta aparece e você escolhe: '
      + 'guardar no inventário ou vender na hora. Guarde — no começo você precisa de cartas, não de moedas.'
  },
  {
    titulo: 'Junte três cartas',
    texto:
      'Com três você já pode batalhar. Role de novo a cada 15 minutos, ou use `/daily` todo dia para '
      + 'ganhar moedas sem esperar.'
  },
  {
    titulo: 'Teste seu time sem risco',
    texto:
      'Use `/treino` antes de desafiar alguém. É a mesma batalha de verdade, contra um adversário do bot, '
      + 'mas não vale moeda nem pontuação. Serve para você ver como suas cartas se comportam.'
  },
  {
    titulo: 'Desafie alguém',
    texto:
      '`/battle @pessoa` abre um duelo 3 contra 3 valendo moedas. Vocês montam o time no privado e a luta '
      + 'é transmitida no canal, golpe a golpe.'
  },
  {
    titulo: 'Complete suas missões',
    texto:
      'Use `/missoes` para ver o que dá recompensa hoje. O progresso é automático — você só volta lá para resgatar.'
  }
];

export const SECOES: Secao[] = [
  {
    id: 'cartas',
    icone: '🎴',
    titulo: 'Cartas e raridade',
    resumo: 'Como você consegue cartas e o que faz uma valer mais que a outra.',
    paragrafos: [
      'Cada `/roll` sorteia uma carta. Você pode rolar uma vez a cada 15 minutos.',
      'Toda carta tem três atributos: **ATA** pesa na ordem dos turnos, no acerto crítico e na esquiva; '
      + '**LIF** é a vida; **POW** é o dano. O **overall** é o resumo dos três.',
      'O que decide o valor de uma carta é a **raridade**, não o overall. Uma Comum excelente nunca chega '
      + 'perto de uma Mestra ruim — o overall só move o preço dentro da faixa da própria raridade.'
    ],
    tabela: {
      cabecalho: ['Raridade', 'Chance por roll', 'Aparece 1 a cada'],
      linhas: [
        ['⚪ Comum', '64%', '2 rolls'],
        ['🔵 Rara', '25%', '4 rolls'],
        ['🟣 Ultra Rara', '9,8%', '10 rolls'],
        ['🟠 Lendária', '1,1%', '91 rolls'],
        ['🌟 Mestra', '0,1%', '1.000 rolls']
      ]
    },
    atencao: {
      titulo: 'Sequência ruim tem limite',
      texto:
        'Se você passar muitos rolls sem uma Ultra Rara — ou muito mais sem uma Lendária — o jogo garante uma. '
        + 'A Mestra é a única que nunca vem garantida: ela é sorte, e sorte comprada com espera deixa de ser sorte.'
    }
  },

  {
    id: 'batalhas',
    icone: '⚔️',
    titulo: 'Batalhas',
    resumo: 'Duelos 3 contra 3, com transmissão ao vivo no canal.',
    paragrafos: [
      'Cada rodada é um 1 contra 1: sua primeira carta enfrenta a primeira do oponente, a segunda contra a '
      + 'segunda, e assim por diante. **A ordem que você escolhe importa.** Quem vencer 2 das 3 rodadas leva o duelo.',
      'Existe dano variável, crítico e esquiva — mas tudo pende para a carta melhor. E quem cai abaixo de 40% '
      + 'de vida entra em **modo desespero**, com muito mais chance de crítico. Viradas acontecem.',
      'Vitórias movem sua pontuação de ranking. Ganhar de alguém muito acima de você rende bastante; ganhar de '
      + 'alguém muito abaixo rende quase nada — então não adianta caçar jogador fraco.'
    ],
    comandos: [
      { nome: '/battle', o_que_faz: 'Desafia outro jogador. Aposta mínima de 10 moedas, o vencedor leva o dobro.' },
      {
        nome: '/treino',
        o_que_faz: 'A mesma batalha, contra um time do bot.',
        dica: 'Não vale moeda, pontuação, missão nem conquista. É para testar sem risco.'
      },
      { nome: '/torneio', o_que_faz: 'Competição com vários jogadores em chaves eliminatórias.' },
      { nome: '/ranking', o_que_faz: 'Classificação por pontuação, de Bronze a Mestre.' }
    ]
  },

  {
    id: 'economia',
    icone: '🪙',
    titulo: 'Moedas e mercado',
    resumo: 'Como ganhar dinheiro e, principalmente, como não perdê-lo à toa.',
    paragrafos: [
      'Você ganha moedas vendendo cartas, cumprindo missões, coletando o `/daily` e vencendo batalhas apostadas.',
      'Para vender existem dois caminhos, e a diferença entre eles é grande.'
    ],
    comandos: [
      {
        nome: '/quicksell',
        o_que_faz: 'Vende na hora, direto para o bot.',
        dica: 'Paga metade do valor numa Comum, mas só 15% numa Mestra.'
      },
      {
        nome: '/sell',
        o_que_faz: 'Anuncia no mercado pelo preço que você quiser.',
        dica: 'Você recebe o preço cheio que outro jogador pagar, menos 5% de taxa.'
      },
      { nome: '/market', o_que_faz: 'Procura e compra cartas anunciadas por outros jogadores.' },
      { nome: '/trocar', o_que_faz: 'Troca carta por carta. Os dois montam a oferta e os dois confirmam.' },
      { nome: '/daily', o_que_faz: 'Recompensa diária. Quanto mais dias seguidos, mais vale.' }
    ],
    atencao: {
      titulo: 'Tirou algo raro? Não use a venda rápida',
      texto:
        'A venda rápida paga bem em carta comum e mal em carta rara — de propósito. Numa Mestra ela devolve só '
        + '15% do valor. Anuncie no `/market`: você recebe o que outro jogador pagar, e a diferença chega a ser de '
        + 'dezenas de milhares de moedas. A venda rápida existe para carta repetida, não para tesouro.'
    }
  },

  {
    id: 'caixas',
    icone: '🎁',
    titulo: 'Caixas',
    resumo: 'Sorteios pagos com chances melhores — e por que eles nunca compensam na média.',
    paragrafos: [
      'Caixas são compradas com moeda e **guardadas na bolsa**. Você abre quando quiser, com `/caixa abrir`.',
      'Cada uma tem a própria distribuição, e as porcentagens ficam à vista no `/caixa`. Nada é escondido.',
      'Uma coisa importante e que o jogo não esconde: **toda caixa é prejuízo na média.** Você paga pela chance, '
      + 'não pelo retorno. Se abrir cem caixas esperando lucro, você perde dinheiro — é assim que foi desenhado, '
      + 'porque é isso que tira moeda de circulação e segura os preços do mercado.'
    ],
    tabela: {
      cabecalho: ['Caixa', 'O que ela garante', 'Por dia'],
      linhas: [
        ['📦 Comum', 'A mais barata, para tentar a sorte sem doer', '5'],
        ['🎯 Temática', 'Você escolhe a série. Rara ou melhor garantida', '3'],
        ['💠 Elite', 'Ultra Rara garantida, boa chance de Lendária', '2'],
        ['🌟 Lendária', '10% de chance de sair uma Mestra', '1']
      ]
    },
    atencao: {
      titulo: 'A Caixa Temática é a única que mira',
      texto:
        'Ela deixa você escolher a série. Se falta uma carta específica para fechar uma série na Pokédex, é ela '
        + 'que resolve — as outras sorteiam do catálogo inteiro.'
    }
  },

  {
    id: 'aprimorar',
    icone: '⬆️',
    titulo: 'Aprimoramento',
    resumo: 'Deixe uma carta mais forte gastando gemas. Sem teto, e sem risco de arruinar.',
    paragrafos: [
      'Gemas vêm de duas portas: comprar na `/loja` ou desmanchar uma carta que você não quer.',
      'Cada tentativa tem três desfechos: **sobe um nível**, **não acontece nada**, ou **cai um nível**. Conforme '
      + 'o nível sobe, acertar fica mais difícil.',
      '**Não existe teto.** Uma carta de nível alto não é uma carta cara, é uma carta **sortuda** — e é isso que '
      + 'faz ela valer o que vale no mercado entre jogadores.'
    ],
    comandos: [
      { nome: '/aprimorar', o_que_faz: 'Gasta gemas para tentar subir o nível de uma carta.' },
      {
        nome: '/desmanchar',
        o_que_faz: 'Transforma uma carta em gemas.',
        dica: 'Rende mais que a venda rápida em tudo — menos na Mestra, onde vender ainda paga melhor.'
      },
      { nome: '/bolsa', o_que_faz: 'Mostra os itens e as caixas que você tem guardados.' },
      { nome: '/loja', o_que_faz: 'Compra gemas, pergaminhos de proteção e rolls extras.' }
    ],
    atencao: {
      titulo: 'Sua carta nunca fica pior do que nasceu',
      texto:
        'O overall natural é o chão absoluto. Uma carta que nunca subiu **não pode cair** — a chance de queda no '
        + 'nível 0 é literalmente zero. E a carta nunca é destruída, em nenhum caso. O pergaminho de proteção segura '
        + 'a queda quando você já está em nível alto.'
    }
  },

  {
    id: 'nivel',
    icone: '⭐',
    titulo: 'Seu nível',
    resumo: 'Tudo que você faz rende XP. E o que o nível dá não é sorte — é tempo de volta.',
    paragrafos: [
      'Rolar, batalhar, trocar, descobrir carta nova, completar missão e coletar o diário: tudo rende XP. Quem usa '
      + 'o bot inteiro sobe mais rápido que quem só rola.',
      'A cada 10 níveis você passa a **acumular um roll a mais**. Na prática: se você não pode entrar de 15 em 15 '
      + 'minutos, os rolls que passarem enquanto você está fora deixam de ser perdidos, e você usa vários seguidos '
      + 'quando voltar.',
      'Repare no que isso **não** é: o nível não encurta seu cooldown e não melhora sua chance de raridade. '
      + 'O sorteio é igual para todo mundo, do primeiro dia ao nível 50. O nível só evita que você desperdice o que '
      + 'já era seu.'
    ],
    tabela: {
      cabecalho: ['Nível', 'O que muda'],
      linhas: [
        ['5', 'Moedas e uma Caixa Comum'],
        ['10', 'Passa a acumular 2 rolls'],
        ['15', 'Uma Caixa Temática'],
        ['20', 'Passa a acumular 3 rolls'],
        ['25', 'Uma Caixa de Elite'],
        ['30', 'Passa a acumular 4 rolls']
      ]
    }
  },

  {
    id: 'pokedex',
    icone: '📖',
    titulo: 'Pokédex e coleção',
    resumo: 'Todo carta que passa por você fica registrada para sempre.',
    paragrafos: [
      'Mesmo que você venda, troque ou desmanche a carta, a descoberta continua no seu registro. Ela é permanente.',
      'Cada carta tem um número fixo: a `#042` de hoje é a mesma amanhã, mesmo com o catálogo crescendo.'
    ],
    comandos: [
      { nome: '/pokedex', o_que_faz: 'O que você já descobriu e o que ainda falta. Filtra por série ou raridade.' },
      { nome: '/ficha', o_que_faz: 'A ficha completa de uma carta, por nome ou número. Funciona mesmo se você já vendeu.' },
      { nome: '/colecionadores', o_que_faz: 'Ranking de quem descobriu mais cartas.' },
      { nome: '/desejar', o_que_faz: 'Marca uma carta que você quer. Quando alguém rolar, você é avisado.' },
      { nome: '/conquistas', o_que_faz: 'Seus troféus. Bronze, Prata, Ouro e a Platina, que exige todos os outros.' }
    ]
  },

  {
    id: 'evento',
    icone: '🎗️',
    titulo: 'Cartas de evento',
    resumo: 'As únicas que o sorteio nunca entrega.',
    paragrafos: [
      'Cartas de evento são distribuídas em ocasiões especiais — participação na beta, campanhas, '
      + 'prêmios de torneio. Elas **nunca saem de `/roll` nem de caixa**, e é justamente isso que as '
      + 'torna especiais: ter uma significa que você estava lá.',
      'Elas ficam numa **Pokédex separada**, em `/pokedex dex:evento`. A razão é simples: a Pokédex '
      + 'normal existe para ser completada, e se as cartas de evento entrassem nela, a barra de todo '
      + 'mundo cairia a cada distribuição nova — ninguém que perdeu o evento conseguiria fechar 100% '
      + 'de novo.',
      'Algumas cartas são **vinculadas**: elas são suas e não podem ser vendidas, trocadas nem '
      + 'transferidas. Batalham normalmente, e aparecem com um 🔒 nas listagens. Outras são '
      + 'negociáveis, e essas costumam valer muito no mercado — não existe como conseguir mais depois '
      + 'que a distribuição fecha.'
    ],
    atencao: {
      titulo: 'Carta de evento não pode ser desmanchada',
      texto:
        'Nem as negociáveis. Desmanchar é o único clique do jogo que apaga uma carta para sempre, e '
        + 'essas não voltam a ser distribuídas. Se quiser se desfazer de uma negociável, venda no '
        + '`/market` — pelo menos ela continua existindo com outra pessoa.'
    }
  },

  {
    id: 'vip',
    icone: '✨',
    titulo: 'VIP',
    resumo: 'O que a assinatura muda — e o que ela nunca vai mudar.',
    paragrafos: [
      'O VIP encurta seu tempo de espera entre rolls (até 40% menos), acumula mais rolls não usados nos planos '
      + 'mais altos, e libera molduras, cores e emblemas exclusivos.',
      '**Nenhum plano dá vantagem de combate.** Atributos das cartas, chance de raridade e resultado de batalha são '
      + 'exatamente iguais para todo mundo, pagando ou não. O que a assinatura compra é tempo e aparência, nunca sorte.',
      'Isso não é promessa de marketing: existe uma verificação automática no código do bot que impede qualquer '
      + 'plano de tocar em atributo de combate ou em chance de raridade.'
    ]
  }
];

/** Perguntas que aparecem sempre. */
export const DUVIDAS = [
  {
    pergunta: 'Perdi minha carta favorita numa venda. Dá para desfazer?',
    resposta:
      'Se você anunciou no mercado e ninguém comprou ainda, use `/undosell` para cancelar. Se já vendeu para o bot '
      + 'com a venda rápida, não há como desfazer — mas a descoberta continua na sua Pokédex para sempre.'
  },
  {
    pergunta: 'Quanto tempo até eu conseguir uma Mestra?',
    resposta:
      'Ela sai em 1 a cada 1.000 rolls. Para quem rola umas 30 vezes por dia, isso dá mais ou menos um mês — mas é '
      + 'sorte, então pode vir amanhã ou daqui a três meses. É por isso que quando alguém tira uma, o servidor '
      + 'inteiro fica sabendo.'
  },
  {
    pergunta: 'Vale a pena abrir caixa?',
    resposta:
      'Se o seu objetivo é lucro, não: toda caixa devolve menos do que custa, na média. Vale quando você quer uma '
      + 'chance concentrada de algo raro, ou quando precisa de uma carta de série específica para fechar a Pokédex.'
  },
  {
    pergunta: 'Meu aprimoramento falhou e a carta caiu de nível. Ela pode ser destruída?',
    resposta:
      'Nunca. A carta jamais é destruída, e nunca fica pior do que era quando você a conseguiu. O overall natural é '
      + 'o mínimo absoluto.'
  },
  {
    pergunta: 'Como eu consigo uma carta de evento?',
    resposta:
      'Participando do evento. Elas não saem de `/roll` nem de caixa, em nenhuma circunstância — são '
      + 'entregues à mão em ocasiões específicas. Se a carta for negociável, ainda dá para comprá-la '
      + 'de outro jogador no `/market`, e o preço costuma ser alto justamente porque não há como '
      + 'produzir mais.'
  },
  {
    pergunta: 'O bot não respondeu meu comando. E agora?',
    resposta:
      'Espere alguns segundos e tente de novo. Se continuar, confira se o bot está online no topo desta página. '
      + 'Alguns comandos precisam que você aceite mensagens diretas do servidor — é o caso da escolha de time na '
      + 'batalha e no treino.'
  }
];

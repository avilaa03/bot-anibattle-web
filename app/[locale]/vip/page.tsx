import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TIERS, ORDEM_TIERS, LIMITE_DESEJOS_GRATIS, reducaoCooldown } from '@/lib/vip';
import { CARGAS_BASE, NIVEIS_DE_CARGA, maxCargas } from '@/lib/nivel';
import { traduzir, type Tradutor } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';

// A página é estática: preço e vantagens vêm do código, não do banco.
export const revalidate = 3600;

const SUPORTE = process.env.NEXT_PUBLIC_SUPPORT_URL || '#';

/** O teto de cargas de quem joga de graça no nível mais alto de carga. */
const CARGAS_MAX_GRATIS = maxCargas(NIVEIS_DE_CARGA[NIVEIS_DE_CARGA.length - 1]);

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = traduzir(ehIdioma(locale) ? locale : 'pt');
  return {
    title: t('vip.meta_titulo'),
    description: t('vip.meta_descricao')
  };
}

/**
 * Linhas do comparativo.
 *
 * Ficam numa estrutura só para a tabela não sair do ar com a realidade:
 * cada linha lê direto do TIERS, que espelha `vip.js` do bot. Só o rótulo
 * e as palavras da coluna "Grátis" vêm do dicionário — o resto é número.
 */
function montarLinhas(t: Tradutor) {
  const cargasGratis = t('vip.cargas_gratis', {
    base: CARGAS_BASE,
    max: CARGAS_MAX_GRATIS
  });

  return [
    {
      rotulo: t('vip.linha_cooldown'),
      gratis: t('vip.gratis_normal'),
      valor: (tier: typeof TIERS[string]) => `−${reducaoCooldown(tier)}%`
    },
    {
      // A vantagem nova, e a única que mexe em QUANTIDADE. Ela soma com as
      // cargas do nível em vez de substituir — quem quiser conferir a conta
      // precisa ver os dois números lado a lado.
      rotulo: t('vip.linha_cargas'),
      gratis: cargasGratis,
      valor: (tier: typeof TIERS[string]) =>
        tier.cargasExtras > 0
          ? t('vip.cargas_vip', {
              n: tier.cargasExtras,
              max: CARGAS_MAX_GRATIS + tier.cargasExtras
            })
          : cargasGratis
    },
    {
      rotulo: t('vip.linha_daily'),
      gratis: '1×',
      valor: (tier: typeof TIERS[string]) => `${tier.dailyMultiplier}×`
    },
    {
      rotulo: t('vip.linha_molduras'),
      gratis: t('vip.gratis_padrao'),
      valor: (tier: typeof TIERS[string]) =>
        `${tier.molduras.length} (${tier.molduras.map((m) => t(`vip.molduras.${m}`)).join(', ')})`
    },
    {
      rotulo: t('vip.linha_desejos'),
      gratis: t('vip.cartas_n', { n: LIMITE_DESEJOS_GRATIS }),
      valor: (tier: typeof TIERS[string]) => t('vip.cartas_n', { n: tier.limiteDesejos })
    },
    {
      rotulo: t('vip.linha_cor'),
      gratis: '—',
      valor: (tier: typeof TIERS[string]) => (tier.podeCorPerfil ? '✓' : '—')
    },
    {
      rotulo: t('vip.linha_banner'),
      gratis: '—',
      valor: (tier: typeof TIERS[string]) => (tier.podeBanner ? '✓' : '—')
    },
    {
      rotulo: t('vip.linha_ranking'),
      gratis: '—',
      valor: (tier: typeof TIERS[string]) => (tier.destaqueRanking ? '✓' : '—')
    }
  ];
}

type Pergunta = { p: string; r: string };

export default async function PaginaVip({ params }: Props) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const href = (c: string) => `/${idioma}${c}`;

  const LINHAS = montarLinhas(t);

  // `t.dados` devolve o valor cru, sem trocar marcador — é o que faz dele
  // o jeito certo de ler estrutura. As perguntas que citam números do jogo
  // precisam da troca aqui.
  const preencher = (texto: string) =>
    texto
      .replace('{niveis}', NIVEIS_DE_CARGA.join(', '))
      .replace('{max}', String(CARGAS_MAX_GRATIS));

  const PERGUNTAS = t.dados<Pergunta[]>('vip.faq');

  return (
    <div className="container-site py-16">
      {/* ---------- Topo ---------- */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('vip.titulo')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-textoFraco">{t('vip.subtitulo')}</p>
      </div>

      {/* ---------- A promessa que importa ---------- */}
      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-marca/40 bg-marca/5 p-6">
        <h2 className="text-lg font-semibold">{t('vip.promessa_titulo')}</h2>
        <p
          className="mt-3 text-sm leading-relaxed text-textoFraco [&_strong]:text-texto"
          dangerouslySetInnerHTML={{ __html: t('vip.promessa_texto') }}
        />
        <ul className="mt-4 grid gap-2 text-sm text-textoFraco sm:grid-cols-2">
          {t.dados<string[]>('vip.nunca_incluso').map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-red-400">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-textoFraco">{t('vip.promessa_rodape')}</p>
      </section>

      {/*
        ---------- Cargas de roll ----------

        A vantagem mais recente e a única que mexe em quantidade, então é
        também a mais fácil de ler como pay-to-win. Explicar a mecânica
        inteira aqui — inclusive que o jogador grátis chega ao teto dele
        sozinho, só subindo de nível — custa espaço e evita a acusação.
      */}
      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-borda bg-superficie p-6">
        <h2 className="text-lg font-semibold">{t('vip.cargas_titulo')}</h2>
        <p
          className="mt-3 text-sm leading-relaxed text-textoFraco [&_strong]:text-texto
                     [&_code]:rounded [&_code]:bg-superficie2 [&_code]:px-1 [&_code]:py-0.5"
          dangerouslySetInnerHTML={{ __html: t('vip.cargas_texto') }}
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-borda bg-fundo p-4">
            <h3 className="text-sm font-semibold">{t('vip.gratis_titulo')}</h3>
            <p
              className="mt-2 text-sm leading-relaxed text-textoFraco [&_strong]:text-texto"
              dangerouslySetInnerHTML={{
                __html: t('vip.gratis_texto', {
                  base: CARGAS_BASE,
                  niveis: NIVEIS_DE_CARGA.join(', '),
                  max: CARGAS_MAX_GRATIS
                })
              }}
            />
          </div>
          <div className="rounded-lg border border-borda bg-fundo p-4">
            <h3 className="text-sm font-semibold">{t('vip.assinando_titulo')}</h3>
            <p
              className="mt-2 text-sm leading-relaxed text-textoFraco [&_strong]:text-texto"
              dangerouslySetInnerHTML={{
                __html: t('vip.assinando_texto', {
                  max_vip: CARGAS_MAX_GRATIS + 1,
                  base_vip: CARGAS_BASE + 1
                })
              }}
            />
          </div>
        </div>

        <p
          className="mt-4 text-sm leading-relaxed text-textoFraco [&_strong]:text-texto"
          dangerouslySetInnerHTML={{ __html: t('vip.quantidade_texto') }}
        />
      </section>

      {/* ---------- Planos ---------- */}
      <section className="mt-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ORDEM_TIERS.map((chave) => {
            const tier = TIERS[chave];
            const destaque = chave === 'ouro';

            // Cada item é uma frase com <strong> no meio, então vem
            // montado do dicionário em vez de costurado em JSX.
            const itens = [
              t('vip.plano_cooldown', { n: reducaoCooldown(tier) }),
              tier.cargasExtras > 0 ? t('vip.plano_carga', { n: tier.cargasExtras }) : null,
              t('vip.plano_daily', { n: tier.dailyMultiplier }),
              t('vip.plano_molduras', { n: tier.molduras.length }),
              t('vip.plano_desejos', { n: tier.limiteDesejos }),
              tier.podeBanner ? t('vip.plano_banner') : null,
              tier.destaqueRanking ? t('vip.plano_ranking') : null
            ].filter((x): x is string => x !== null);

            return (
              <div
                key={chave}
                className={`cartao relative flex flex-col p-6 ${destaque ? 'ring-2 ring-marca' : ''}`}
                style={{ borderColor: `${tier.cor}44` }}
              >
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marca px-3 py-0.5 text-xs font-medium text-white">
                    {t('vip.mais_escolhido')}
                  </span>
                )}

                <div className="text-3xl">{tier.emoji}</div>
                <h3 className="mt-3 text-lg font-bold" style={{ color: tier.cor }}>
                  {t(`vip.tiers.${chave}`)}
                </h3>

                <div className="mt-3">
                  <span className="text-3xl font-bold">R$ {tier.precoBRL}</span>
                  <span className="text-sm text-textoFraco"> {t('vip.por_mes')}</span>
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm text-textoFraco [&_strong]:text-texto">
                  {itens.map((item) => (
                    <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>

                <a href={SUPORTE} target="_blank" rel="noopener noreferrer"
                   className={`mt-6 ${destaque ? 'botao-primario' : 'botao-secundario'} w-full justify-center`}>
                  {t('vip.assinar')}
                </a>
              </div>
            );
          })}
        </div>

        {/*
          Enquanto o checkout automático não existe, a compra é combinada
          no servidor de suporte e ativada com `npm run vip:grant` ou pelo
          painel. Dizer isso abertamente é melhor que um botão que leva a
          um checkout quebrado.
        */}
        <p className="mt-6 text-center text-sm text-textoFraco">{t('vip.pagamento_nota')}</p>
      </section>

      {/* ---------- Comparativo ---------- */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">{t('vip.comparativo')}</h2>

        <div className="cartao mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-superficie2 text-left text-xs text-textoFraco">
              <tr>
                <th className="px-4 py-3">{t('vip.col_vantagem')}</th>
                <th className="px-4 py-3">{t('vip.col_gratis')}</th>
                {ORDEM_TIERS.map((c) => (
                  <th key={c} className="px-4 py-3" style={{ color: TIERS[c].cor }}>
                    {TIERS[c].emoji} {t(`vip.tiers.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {LINHAS.map((linha) => (
                <tr key={linha.rotulo}>
                  <td className="px-4 py-3">{linha.rotulo}</td>
                  <td className="px-4 py-3 text-textoFraco">{linha.gratis}</td>
                  {ORDEM_TIERS.map((c) => (
                    <td key={c} className="px-4 py-3">{linha.valor(TIERS[c])}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-superficie2/40">
                <td className="px-4 py-3 font-medium">{t('vip.linha_batalha')}</td>
                <td className="px-4 py-3 text-textoFraco">—</td>
                {ORDEM_TIERS.map((c) => (
                  <td key={c} className="px-4 py-3 text-textoFraco">—</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Perguntas ---------- */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">{t('vip.perguntas')}</h2>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {PERGUNTAS.map(({ p, r }) => (
            <div key={p} className="cartao p-5">
              <h3 className="font-medium">{p}</h3>
              <p className="mt-2 text-sm leading-relaxed text-textoFraco">{preencher(r)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14 text-center">
        <Link href={href('/cartas')} className="botao-secundario">
          {t('vip.ver_catalogo')}
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { primeirosPassos, secoes, duvidas } from '@/lib/guia';
import { traduzir } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = traduzir(ehIdioma(locale) ? locale : 'pt');
  return {
    title: t('guia.meta_titulo'),
    description: t('guia.meta_descricao')
  };
}

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

/**
 * O guia do jogador.
 *
 * Escrito para quem nunca abriu o bot, não para quem o programou. O texto
 * mora nos dicionários e os números em `lib/guia.ts` — a página só
 * desenha, e o índice lateral se monta a partir da mesma lista das
 * seções, então nunca há link para seção inexistente.
 */

/** Destaca `comandos` e **negrito** sem trazer uma biblioteca de markdown. */
function Texto({ children }: { children: string }) {
  const partes = children.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith('`') && parte.endsWith('`')) {
          return (
            <code key={i} className="rounded bg-superficie2 px-1.5 py-0.5 text-marca">
              {parte.slice(1, -1)}
            </code>
          );
        }
        if (parte.startsWith('**') && parte.endsWith('**')) {
          return <strong key={i} className="text-texto">{parte.slice(2, -2)}</strong>;
        }
        return <span key={i}>{parte}</span>;
      })}
    </>
  );
}

export default async function PaginaGuia({ params }: Props) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const href = (c: string) => `/${idioma}${c}`;

  const PASSOS = primeirosPassos(t);
  const SECOES = secoes(t);
  const DUVIDAS = duvidas(t);

  return (
    <div className="container-site py-10">
      {/* ---------- Abertura ---------- */}
      <header className="mx-auto max-w-3xl text-center">
        <span className="etiqueta">{t('guia.etiqueta')}</span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t('guia.titulo')}</h1>
        <p className="mt-4 text-textoFraco">{t('guia.abertura')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={INVITE} className="botao-primario" target="_blank" rel="noopener noreferrer">
            {t('guia.cta_adicionar')}
          </a>
          <Link href={href('/cartas')} className="botao-secundario">
            {t('guia.cta_catalogo')}
          </Link>
        </div>
      </header>

      <div className="mt-12 gap-10 lg:grid lg:grid-cols-[220px_1fr]">
        {/* ---------- Índice ---------- */}
        <nav className="mb-10 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <div className="rotulo mb-3">{t('guia.nesta_pagina')}</div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href="#comecar" className="text-textoFraco transition hover:text-texto">
                  🚀 {t('guia.comecar')}
                </a>
              </li>
              {SECOES.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-textoFraco transition hover:text-texto">
                    {s.icone} {s.titulo}
                  </a>
                </li>
              ))}
              <li>
                <a href="#duvidas" className="text-textoFraco transition hover:text-texto">
                  💬 {t('guia.duvidas_titulo')}
                </a>
              </li>
            </ul>
          </div>
        </nav>

        <div className="min-w-0 space-y-12">
          {/* ---------- Primeiros passos ---------- */}
          <section id="comecar" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">🚀 {t('guia.comecar')}</h2>
            {/* A contagem sai da lista: o texto dizia "cinco" com seis passos. */}
            <p className="mt-2 text-textoFraco">
              {t('guia.comecar_texto', { n: PASSOS.length })}
            </p>

            <ol className="mt-6 space-y-4">
              {PASSOS.map((passo, i) => (
                <li key={i} className="cartao flex gap-4 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca/15 text-sm font-bold text-marca">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-semibold">{passo.titulo}</div>
                    <p className="mt-1 text-sm text-textoFraco">
                      <Texto>{passo.texto}</Texto>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- Seções ---------- */}
          {SECOES.map((secao) => (
            <section key={secao.id} id={secao.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold">
                {secao.icone} {secao.titulo}
              </h2>
              <p className="mt-2 text-textoFraco">{secao.resumo}</p>

              {secao.paragrafos && (
                <div className="mt-5 space-y-3 text-sm leading-relaxed text-textoFraco">
                  {secao.paragrafos.map((p, i) => (
                    <p key={i}><Texto>{p}</Texto></p>
                  ))}
                </div>
              )}

              {secao.tabela && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-borda">
                  <table className="w-full text-sm">
                    <thead className="bg-superficie2 text-left text-xs text-textoFraco">
                      <tr>
                        {secao.tabela.cabecalho.map((h) => (
                          <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borda">
                      {secao.tabela.linhas.map((linha, i) => (
                        <tr key={i}>
                          {linha.map((celula, j) => (
                            <td key={j} className={`px-4 py-2.5 ${j === 0 ? 'font-medium' : 'text-textoFraco'}`}>
                              {celula}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {secao.comandos && (
                <div className="mt-6 space-y-2">
                  {secao.comandos.map((c) => (
                    <div key={c.nome} className="cartao p-4">
                      <code className="text-sm font-semibold text-marca">{c.nome}</code>
                      <p className="mt-1 text-sm text-textoFraco">
                        <Texto>{c.o_que_faz}</Texto>
                      </p>
                      {c.dica && (
                        <p className="mt-1.5 text-xs text-textoFraco/80">
                          💡 <Texto>{c.dica}</Texto>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {secao.atencao && (
                <div className="mt-6 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
                  <div className="font-semibold text-amber-300">⚠️ {secao.atencao.titulo}</div>
                  <p className="mt-1.5 text-sm text-amber-200/80">
                    <Texto>{secao.atencao.texto}</Texto>
                  </p>
                </div>
              )}
            </section>
          ))}

          {/* ---------- Dúvidas ---------- */}
          <section id="duvidas" className="scroll-mt-24">
            <h2 className="text-2xl font-bold">💬 {t('guia.duvidas_titulo')}</h2>
            <div className="mt-6 space-y-3">
              {DUVIDAS.map((d, i) => (
                <details key={i} className="cartao p-4">
                  <summary className="cursor-pointer font-medium">{d.pergunta}</summary>
                  <p className="mt-2 text-sm text-textoFraco">
                    <Texto>{d.resposta}</Texto>
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ---------- Fecho ---------- */}
          <section className="cartao p-6 text-center">
            <h2 className="text-lg font-semibold">{t('guia.fecho_titulo')}</h2>
            <p className="mt-2 text-sm text-textoFraco">
              <Texto>{t('guia.fecho_texto')}</Texto>
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a href={INVITE} className="botao-primario" target="_blank" rel="noopener noreferrer">
                {t('guia.cta_adicionar')}
              </a>
              <Link href={href('/vip')} className="botao-secundario">
                {t('guia.cta_vip')}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

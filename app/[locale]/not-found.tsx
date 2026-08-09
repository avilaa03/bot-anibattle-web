import Link from 'next/link';
import { headers } from 'next/headers';
import { traduzir } from '@/lib/i18n';
import { IDIOMA_PADRAO, ehIdioma, type Idioma } from '@/lib/i18n/config';

/**
 * O 404 não recebe `params`.
 *
 * O Next chama esta página quando a rota não casou com nada, e nesse
 * caso não existe segmento `[locale]` resolvido para ler. O idioma é
 * recuperado da própria URL, que o middleware injeta no cabeçalho
 * `x-pathname`; sem ele, cai no português.
 */
async function idiomaDaUrl(): Promise<Idioma> {
  const caminho = (await headers()).get('x-pathname') ?? '';
  const primeiro = caminho.split('/').filter(Boolean)[0];
  return primeiro && ehIdioma(primeiro) ? primeiro : IDIOMA_PADRAO;
}

export default async function NaoEncontrado() {
  const idioma = await idiomaDaUrl();
  const t = traduzir(idioma);

  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-6xl">🎴</div>
      <h1 className="mt-6 text-3xl font-bold">{t('nao_encontrado.titulo')}</h1>
      <p className="mt-3 max-w-md text-textoFraco">{t('nao_encontrado.texto')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${idioma}`} className="botao-primario">
          {t('nao_encontrado.voltar')}
        </Link>
        <Link href={`/${idioma}/cartas`} className="botao-secundario">
          {t('nao_encontrado.catalogo')}
        </Link>
      </div>
    </div>
  );
}

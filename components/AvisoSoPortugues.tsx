import { traduzir } from '@/lib/i18n';
import { IDIOMA_PADRAO, type Idioma } from '@/lib/i18n/config';

/**
 * A nota que abre /termos e /privacidade fora do português.
 *
 * Os dois documentos ficam em português nos três idiomas, de propósito.
 * Não é preguiça: é prosa jurídica, e uma imprecisão de tradução numa
 * política de privacidade pode valer contra quem a publicou. Traduzir com
 * um "em caso de divergência prevalece o português" resolveria no papel e
 * pioraria na prática — a pessoa lê a versão que a própria página avisa
 * não ser a que vale.
 *
 * A NOTA, essa sim, vai no idioma do visitante. Avisar em português que o
 * documento só existe em português não avisa ninguém.
 *
 * Em português não renderiza nada: não há o que explicar.
 *
 * Quem usa este componente precisa pôr `lang="pt"` no bloco do documento
 * — a página herda o `lang` do visitante no `<html>`, e sem isso o leitor
 * de tela lê o português inteiro com a fonética do outro idioma.
 */
export default function AvisoSoPortugues({ idioma }: { idioma: Idioma }) {
  if (idioma === IDIOMA_PADRAO) return null;

  const t = traduzir(idioma);

  return (
    <div className="mt-8 rounded-xl border border-borda bg-superficie p-4 text-sm leading-relaxed text-textoFraco">
      {t('legal.so_em_portugues')}
    </div>
  );
}

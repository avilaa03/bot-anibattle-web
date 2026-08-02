import Link from 'next/link';
import Image from 'next/image';
import type { CartaSimples } from '@/lib/tipos';
import { getRaridade, formatarNumero, formatarMoedas } from '@/lib/raridades';

/**
 * A carta renderizada em HTML/CSS, não como imagem.
 *
 * O bot desenha a carta em canvas porque o Discord só aceita imagem. Na
 * web isso seria um erro: imagem gerada no servidor é pesada, não é
 * responsiva, não dá para selecionar o texto, e obrigaria instalar o
 * `canvas` (dependência nativa) na Vercel — que é justamente onde ele dá
 * mais problema.
 *
 * Em HTML a carta fica leve, responsiva e indexável pelo Google.
 */

interface Props {
  carta: CartaSimples;
  totalCatalogo?: number;
  prioridade?: boolean;
}

export default function CartaVisual({ carta, totalCatalogo = 0, prioridade = false }: Props) {
  const meta = getRaridade(carta.raridade);

  return (
    <Link
      href={carta.numero != null ? `/cartas/${carta.numero}` : '/cartas'}
      className="group block"
    >
      <article
        className="relative aspect-[5/7] overflow-hidden rounded-xl transition-transform duration-200 group-hover:-translate-y-1"
        style={{
          border: `3px solid ${meta.cor}`,
          background: `linear-gradient(135deg, ${meta.gradiente[0]}, ${meta.gradiente[1]})`,
          boxShadow: meta.peso >= 3 ? `0 0 18px ${meta.cor}55` : undefined
        }}
      >
        {/* Arte do personagem, ancorada no topo — é onde fica o rosto */}
        {carta.imagem ? (
          <Image
            src={carta.imagem}
            alt={carta.nome}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover object-top"
            priority={prioridade}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Sem imagem
          </div>
        )}

        {/* Escurecimento em cima e embaixo, para o texto ler bem */}
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/80 to-transparent" />

        {/* Badge de overall */}
        <div
          className="absolute left-2 top-2 flex h-11 w-11 flex-col items-center justify-center rounded-lg text-black sm:h-12 sm:w-12"
          style={{ background: `linear-gradient(135deg, ${meta.corTexto}, ${meta.cor})` }}
        >
          <span className="text-base font-bold leading-none sm:text-lg">{carta.overall}</span>
          <span className="text-[8px] font-semibold opacity-70">OVR</span>
        </div>

        {/* Pílula de raridade */}
        <div
          className="absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider backdrop-blur-sm sm:text-[10px]"
          style={{ borderColor: meta.cor, color: meta.corTexto, background: 'rgba(0,0,0,0.5)' }}
        >
          {meta.label}
        </div>

        {/* Nome, série e atributos */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="truncate text-sm font-bold leading-tight text-white sm:text-base">
            {carta.nome}
          </h3>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: meta.corTexto }}>
            {carta.serie}
          </p>

          <div
            className="mt-2 grid grid-cols-3 gap-1 border-t pt-2 text-center"
            style={{ borderColor: `${meta.cor}66` }}
          >
            {([['ATA', carta.ATA], ['LIF', carta.LIF], ['POW', carta.POW]] as const).map(
              ([rotulo, valor]) => (
                <div key={rotulo}>
                  <div className="text-[8px] tracking-widest" style={{ color: meta.corTexto }}>
                    {rotulo}
                  </div>
                  <div className="text-xs font-bold text-white sm:text-sm">{valor}</div>
                </div>
              )
            )}
          </div>
        </div>
      </article>

      <div className="mt-2 flex items-center justify-between px-0.5 text-xs">
        <span className="font-mono text-textoFraco">
          {formatarNumero(carta.numero, totalCatalogo)}
        </span>
        <span className="text-textoFraco">🪙 {formatarMoedas(carta.valorMercado)}</span>
      </div>
    </Link>
  );
}

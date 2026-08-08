'use client';

import { useState } from 'react';

/**
 * Avatar do administrador logado.
 *
 * É componente de cliente só por causa do `onError`: a URL do avatar vem
 * da sessão, e o hash guardado lá envelhece — quem troca a foto no
 * Discord invalida o endereço antigo, e a sessão só aprende isso no
 * próximo login. O resultado era o ícone de imagem quebrada no cabeçalho.
 *
 * A queda é em dois degraus: primeiro o avatar padrão do Discord
 * (calculado pelo id, sempre existe), e se nem ele carregar, um círculo
 * com a inicial. Assim o cabeçalho nunca mostra imagem quebrada.
 */
export default function AvatarAdmin({
  src,
  padrao,
  nome
}: {
  src: string;
  padrao: string;
  nome: string;
}) {
  const [tentativa, setTentativa] = useState<'principal' | 'padrao' | 'inicial'>('principal');

  if (tentativa === 'inicial') {
    return (
      <div
        title={nome}
        aria-label={nome}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-superficie2 text-xs font-medium text-textoFraco"
      >
        {nome.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tentativa === 'principal' ? src : padrao}
      alt={nome}
      title={nome}
      width={28}
      height={28}
      // O Discord serve a CDN sem exigir referrer, mas alguns proxies
      // corporativos removem o header e o pedido volta 403. Sem referrer,
      // isso não acontece.
      referrerPolicy="no-referrer"
      onError={() => setTentativa((t) => (t === 'principal' ? 'padrao' : 'inicial'))}
      className="rounded-full"
    />
  );
}

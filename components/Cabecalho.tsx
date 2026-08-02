import Link from 'next/link';

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

const LINKS = [
  { href: '/cartas', label: 'Cartas' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#noticias', label: 'Notícias' },
  { href: '/#contato', label: 'Contato' }
];

export default function Cabecalho() {
  return (
    <header className="sticky top-0 z-50 border-b border-borda bg-fundo/85 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🎴</span>
          <span className="text-lg">AniBattle</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-textoFraco transition-colors hover:text-texto"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a href={INVITE} target="_blank" rel="noopener noreferrer" className="botao-primario !py-2 !px-4">
          Adicionar ao Discord
        </a>
      </div>
    </header>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import Cabecalho from '@/components/Cabecalho';
import Rodape from '@/components/Rodape';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://anibattle.com.br';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AniBattle — Colecione e batalhe com cartas de anime no Discord',
    template: '%s | AniBattle'
  },
  description:
    'Bot de Discord para colecionar cartas de personagens de anime, montar time e duelar. '
    + 'Pokédex, mercado entre jogadores, torneios e troféus. Grátis para jogar.',
  keywords: [
    'bot discord', 'cartas de anime', 'bot de cartas', 'anime discord',
    'colecionar cartas', 'tcg discord', 'bot brasileiro'
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'AniBattle',
    title: 'AniBattle — Cartas de anime no Discord',
    description: 'Colecione, troque e batalhe com cartas de personagens de anime. Grátis.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AniBattle — Cartas de anime no Discord',
    description: 'Colecione, troque e batalhe com cartas de personagens de anime.'
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-fundo font-sans text-texto antialiased">
        <Cabecalho />
        <main className="min-h-[70vh]">{children}</main>
        <Rodape />
      </body>
    </html>
  );
}

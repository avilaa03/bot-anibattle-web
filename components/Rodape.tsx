import Link from 'next/link';

const SUPORTE = process.env.NEXT_PUBLIC_SUPPORT_URL || '#';
const REPO = 'https://github.com/avilaa03/bot_animefight';

export default function Rodape() {
  return (
    <footer id="contato" className="mt-24 border-t border-borda bg-superficie">
      <div className="container-site grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🎴</span>
            <span>AniBattle</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-textoFraco">
            Colecione cartas de personagens de anime, monte seu time e dispute
            com outros jogadores. Direto no Discord.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium">Jogo</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li><Link href="/cartas" className="hover:text-texto">Catálogo de cartas</Link></li>
            <li><Link href="/#recursos" className="hover:text-texto">Como funciona</Link></li>
            <li><Link href="/#noticias" className="hover:text-texto">Notícias</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium">Suporte</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li>
              <a href={SUPORTE} target="_blank" rel="noopener noreferrer" className="hover:text-texto">
                Servidor de suporte
              </a>
            </li>
            <li>
              <a href={REPO} target="_blank" rel="noopener noreferrer" className="hover:text-texto">
                Código no GitHub
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li><Link href="/privacidade" className="hover:text-texto">Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-texto">Termos de uso</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-borda">
        <div className="container-site py-6 text-xs leading-relaxed text-textoFraco">
          <p>
            AniBattle é um projeto de fã, sem vínculo, patrocínio ou aprovação dos
            detentores dos direitos das obras retratadas. Nomes e imagens de
            personagens pertencem aos seus respectivos criadores e distribuidoras.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} AniBattle.</p>
        </div>
      </div>
    </footer>
  );
}

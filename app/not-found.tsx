import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-6xl">🎴</div>
      <h1 className="mt-6 text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-3 max-w-md text-textoFraco">
        Essa carta não está no baralho. Talvez o número não exista no catálogo,
        ou o link esteja errado.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="botao-primario">Voltar ao início</Link>
        <Link href="/cartas" className="botao-secundario">Ver o catálogo</Link>
      </div>
    </div>
  );
}

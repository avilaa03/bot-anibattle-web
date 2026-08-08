import './globals.css';

/**
 * Layout raiz.
 *
 * Ele ficou propositalmente vazio: quem define `<html lang>`, cabeçalho,
 * rodapé e metadados é `app/[locale]/layout.tsx`, que sabe o idioma.
 *
 * O Next exige um layout raiz com <html> e <body>. Como o idioma só é
 * conhecido um nível abaixo, este aqui é a casca mínima — e o `lang`
 * real é aplicado no layout de idioma.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

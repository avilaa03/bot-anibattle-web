import type { Config } from 'tailwindcss';

/**
 * O tema espelha as cores de raridade do bot (Commands/utils/embeds.js).
 * Se você mudar a cor de uma raridade lá, mude aqui também — é o que
 * mantém a carta no site parecida com a carta no Discord.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        fundo: '#0B0D10',
        superficie: '#13171C',
        superficie2: '#1B2027',
        borda: '#262C35',
        texto: '#E8EAED',
        textoFraco: '#9AA3AE',
        marca: '#E91E63',
        raridade: {
          common: '#9E9E9E',
          rare: '#2196F3',
          ultra: '#AB47BC',
          legendary: '#FF9800',
          master: '#FFD700'
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;

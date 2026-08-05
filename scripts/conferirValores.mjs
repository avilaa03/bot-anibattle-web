/**
 * Confere se `lib/valores.ts` ainda bate com o `valores.js` do bot.
 *
 * Irmão do `conferirVip.mjs`, e pela mesma razão: são dois repositórios
 * separados espelhando a mesma regra à mão, e quando um dos lados muda
 * sozinho nada quebra — só passa a mostrar um número diferente.
 *
 * Foi assim que este arquivo nasceu. A fórmula do preço passou a depender
 * da raridade no bot, o site ficou com `overall * 10`, e o catálogo
 * anunciava 950 para uma Mestra que no Discord vale 190.500. O painel
 * admin usava a mesma conta para GRAVAR a cópia no inventário, então a
 * divergência não parava na tela: virava acervo com preço velho.
 *
 * Rode antes de mexer em preço:
 *   npm run valores:conferir
 *   CAMINHO_BOT=/caminho/do/bot_animefight npm run valores:conferir
 *
 * A varredura da fórmula antiga roda SEMPRE, com ou sem o bot por perto —
 * é ela que o CI executa.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const RAIZ = new URL('..', import.meta.url).pathname;

let divergencias = 0;

// ---------------------------------------------------------------------
// 1. A fórmula antiga não pode reaparecer em lugar nenhum
// ---------------------------------------------------------------------
//
// Espelha a varredura de `tests/valores.test.js` no bot, inclusive nos
// dois furos que ela já teve: o padrão tolera o que houver entre o campo
// e o operador, porque o código real escreve `(carta.overall ?? 0) * 10`.

const IGNORAR = new Set(['node_modules', '.git', '.next', 'scripts']);
const PERMITIDO = path.join(RAIZ, 'lib', 'valores.ts');

const PROIBIDOS = [
    // Overall reconstruído pelo preço, ou preço reconstruído pelo overall.
    /marketValue[^;\n]{0,20}\/\s*10\b/,
    /overall[^;\n]{0,20}\*\s*10\b/,
    // A venda rápida era metade do valor. Hoje a fatia depende da
    // raridade (Comum 50% -> Mestra 15%), e é `valores.ts` quem sabe.
    /(marketValue|valorMercado)[^;\n]{0,20}\/\s*2\b/
];

function listarFontes(dir, acumulado = []) {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        if (IGNORAR.has(entrada.name)) continue;
        const completo = path.join(dir, entrada.name);
        if (entrada.isDirectory()) listarFontes(completo, acumulado);
        else if (/\.tsx?$/.test(entrada.name)) acumulado.push(completo);
    }
    return acumulado;
}

/** Tira comentários: eles citam a fórmula proibida ao explicá-la. */
function semComentarios(src) {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

console.log('\nProcurando a fórmula antiga no código do site:\n');

const suspeitos = [];
for (const pasta of ['app', 'components', 'lib']) {
    for (const arquivo of listarFontes(path.join(RAIZ, pasta))) {
        if (arquivo === PERMITIDO) continue;
        const codigo = semComentarios(readFileSync(arquivo, 'utf8'));
        if (PROIBIDOS.some((padrao) => padrao.test(codigo))) {
            suspeitos.push(path.relative(RAIZ, arquivo));
        }
    }
}

if (suspeitos.length > 0) {
    divergencias += suspeitos.length;
    console.log('  DIVERGE  arquivos calculando preço por fora de lib/valores.ts:');
    for (const s of suspeitos) console.log(`           ${s}`);
} else {
    console.log('  OK      nenhum arquivo usa a fórmula antiga');
}

// A varredura precisa provar que pega o que já deixou passar.
const REGRESSOES = [
    'const marketValue = (carta.overall ?? 0) * 10;',
    'valorMercado: (carta.overall ?? 0) * 10',
    'valueToSell: Math.floor(marketValue / 2)',
    '{formatarMoedas(carta.valorMercado / 2)}'
];
const pegaTudo = REGRESSOES.every((l) => PROIBIDOS.some((p) => p.test(l)));
if (!pegaTudo) divergencias++;
console.log(`  ${pegaTudo ? 'OK     ' : 'DIVERGE'} a varredura pega as formas que já escaparam`);

// ---------------------------------------------------------------------
// 2. As constantes batem com as do bot (só se o bot estiver por perto)
// ---------------------------------------------------------------------

const CAMINHO_BOT = process.env.CAMINHO_BOT || '../bot_animefight';
const valoresDoBot = path.resolve(CAMINHO_BOT, 'Commands/utils/valores.js');

if (!existsSync(valoresDoBot)) {
    console.log(`\n⚠️  Não achei o bot em "${CAMINHO_BOT}" — pulando a comparação de constantes.`);
    console.log('   Os repositórios são separados, então esta parte é opcional.');
    console.log('   Para rodar: CAMINHO_BOT=/caminho/do/bot_animefight npm run valores:conferir');
} else {
    const bot = require(valoresDoBot);
    const site = readFileSync(PERMITIDO, 'utf8');

    /** Lê `chave: 123` de dentro de um bloco `export const NOME = { ... }`. */
    const doSite = (constante, chave) => {
        const bloco = site.split(`${constante}: Record<string, number> = {`)[1]?.split('};')[0] ?? '';
        const m = bloco.match(new RegExp(`'?${chave}'?:\\s*([\\d.]+)`));
        return m ? Number(m[1]) : undefined;
    };

    const conferir = (nome, doBotValor, doSiteValor) => {
        const igual = Number(doBotValor) === Number(doSiteValor);
        if (!igual) divergencias++;
        console.log(`  ${igual ? 'OK     ' : 'DIVERGE'} ${nome.padEnd(24)} bot=${doBotValor}  site=${doSiteValor}`);
    };

    console.log('\nConferindo lib/valores.ts contra o bot:\n');

    for (const raridade of Object.keys(bot.VALOR_BASE)) {
        conferir(`base ${raridade}`, bot.VALOR_BASE[raridade], doSite('VALOR_BASE', raridade));
        conferir(`quicksell ${raridade}`, bot.QUICKSELL_PCT[raridade], doSite('QUICKSELL_PCT', raridade));
    }

    conferir('fator mínimo', bot.FATOR_MINIMO, (site.match(/FATOR_MINIMO = ([\d.]+)/) || [])[1]);
    conferir('faixa do overall', bot.FAIXA_DO_OVERALL, (site.match(/FAIXA_DO_OVERALL = ([\d.]+)/) || [])[1]);
}

console.log(divergencias === 0
    ? '\n✓ O site está mostrando o mesmo preço que o Discord pratica.\n'
    : `\n⚠️  ${divergencias} divergência(s). O site está anunciando um preço que o bot não pratica.\n`);

process.exit(divergencias ? 1 : 0);

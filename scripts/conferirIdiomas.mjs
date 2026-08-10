/**
 * Confere se os três dicionários dizem a mesma coisa.
 *
 * Rode antes de abrir PR que mexa em tradução:
 *   npm run idiomas:conferir
 *
 * ## Por que isto existe
 *
 * Chave que falta num idioma NÃO quebra nada: o `traduzir()` cai no
 * português e a página continua no ar, com uma frase em português no meio
 * do inglês. O erro é silencioso, e por isso precisa de um teste.
 *
 * ## O que ele pega
 *
 * 1. Chave presente num idioma e ausente noutro
 * 2. Lista com número diferente de itens — o guia inteiro é lista de
 *    objetos, e uma seção a menos no espanhol passaria despercebida por
 *    uma conferência que só olha o primeiro nível
 * 3. Marcador `{valor}` presente de um lado e não do outro, que é como um
 *    número do jogo some do texto traduzido
 *
 * O item 2 é o motivo de este script ler em profundidade. A conferência
 * antiga usava `l.map(k)`, e `Array.prototype.map` passa o ÍNDICE como
 * segundo argumento — que virava o prefixo da chave. Todas as chaves do
 * inglês nasciam com "1" na frente e as do espanhol com "2", então nada
 * batia com nada: o script reportava 100% das chaves como faltando,
 * sempre. Alarme que sempre toca é alarme que ninguém ouve.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const IDIOMAS = ['pt', 'en', 'es'];
const PADRAO = 'pt';

const dicionarios = Object.fromEntries(
    IDIOMAS.map((i) => [i, require(`../lib/i18n/dicionarios/${i}.json`)])
);

/** Achata em `caminho.pontilhado` -> valor, entrando também nas listas. */
function achatar(valor, prefixo = '', destino = new Map()) {
    if (Array.isArray(valor)) {
        destino.set(`${prefixo}[]`, valor.length);
        valor.forEach((item, i) => achatar(item, `${prefixo}[${i}]`, destino));
    } else if (valor !== null && typeof valor === 'object') {
        for (const [chave, v] of Object.entries(valor)) {
            achatar(v, prefixo ? `${prefixo}.${chave}` : chave, destino);
        }
    } else {
        destino.set(prefixo, valor);
    }
    return destino;
}

const marcadores = (texto) =>
    typeof texto === 'string'
        ? [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
        : [];

const achatados = Object.fromEntries(
    IDIOMAS.map((i) => [i, achatar(dicionarios[i])])
);

const problemas = [];
const base = achatados[PADRAO];

for (const idioma of IDIOMAS.filter((i) => i !== PADRAO)) {
    const outro = achatados[idioma];

    for (const [caminho, valor] of base) {
        if (!outro.has(caminho)) {
            // Uma lista mais curta já foi reportada pelo seu próprio `[]`;
            // não vale repetir o aviso para cada item que falta dentro dela.
            const lista = caminho.match(/^(.*)\[\d+\]/);
            if (lista && outro.get(`${lista[1]}[]`) !== base.get(`${lista[1]}[]`)) continue;
            problemas.push(`${idioma}: falta  ${caminho}`);
            continue;
        }

        if (caminho.endsWith('[]') && outro.get(caminho) !== valor) {
            problemas.push(
                `${idioma}: a lista ${caminho.slice(0, -2)} tem ${outro.get(caminho)} item(ns), `
                + `o ${PADRAO} tem ${valor}`
            );
            continue;
        }

        const aqui = marcadores(valor).join(',');
        const la = marcadores(outro.get(caminho)).join(',');
        if (aqui !== la) {
            problemas.push(
                `${idioma}: marcadores diferentes em ${caminho} — `
                + `${PADRAO} tem {${aqui || '—'}}, ${idioma} tem {${la || '—'}}`
            );
        }
    }

    for (const caminho of outro.keys()) {
        if (!base.has(caminho)) problemas.push(`${idioma}: sobra  ${caminho} (não existe no ${PADRAO})`);
    }
}

console.log('\nConferindo os dicionários de idioma:\n');

if (problemas.length === 0) {
    const chaves = [...base.keys()].filter((c) => !c.endsWith('[]')).length;
    console.log(`  OK      ${chaves} textos, iguais nos ${IDIOMAS.length} idiomas\n`);
    process.exit(0);
}

for (const p of problemas) console.log(`  ${p}`);
console.log(`\n⚠️  ${problemas.length} problema(s). Um deles vira frase em português no site em inglês.\n`);
process.exit(1);

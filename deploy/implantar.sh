#!/usr/bin/env bash
#
# Publica a versão da main na VPS.
#
# Roda NA VPS, enviado pelo GitHub Actions via SSH. Na mão:
#
#   cd /caminho/do/anibattle-site && bash deploy/implantar.sh
#
# Diferença para o script do bot: aqui a verificação é uma requisição HTTP.
# O site "no ar" significa responder 200 na porta 3000 — contêiner rodando
# não basta, porque o Next sobe e só depois descobre que não conecta no
# banco.
set -euo pipefail

DIRETORIO="${DEPLOY_DIR:-$(pwd)}"
ESPERA_SEGUNDOS=120
SERVICO="web"
PORTA=3000

cd "$DIRETORIO"

if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    echo "❌ Nem 'docker compose' nem 'docker-compose' encontrados nesta VPS."
    exit 1
fi

echo "▶ Diretório: $DIRETORIO"
echo "▶ Compose:   $COMPOSE"

if [ ! -f .env ]; then
    echo "❌ Não achei o .env em $DIRETORIO."
    echo "   O compose lê MONGODB_URI dele tanto para o build quanto para a execução."
    exit 1
fi

# O MONGODB_URI é passado como ARG no build (o Next precisa dele para gerar
# as páginas). O docker compose lê ARGs do ambiente do shell, não do
# env_file — por isso exportamos o .env antes de subir.
set -a
# shellcheck disable=SC1091
source .env
set +a

COMMIT_ANTERIOR="$(git rev-parse HEAD)"
echo "▶ Commit atual: ${COMMIT_ANTERIOR:0:7}"

git fetch --prune origin
# Sem `git clean`: apagaria o .env, que existe só neste servidor.
git reset --hard origin/main

COMMIT_NOVO="$(git rev-parse HEAD)"
echo "▶ Commit novo:  ${COMMIT_NOVO:0:7}"

subir() {
    $COMPOSE up -d --build
}

esta_no_ar() {
    local fim=$((SECONDS + ESPERA_SEGUNDOS))
    while [ $SECONDS -lt $fim ]; do
        if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:${PORTA}/"; then
            return 0
        fi
        sleep 3
    done
    return 1
}

echo "▶ Construindo e subindo... (o build do Next leva alguns minutos numa VPS pequena)"
subir

echo "▶ Esperando o site responder (até ${ESPERA_SEGUNDOS}s)..."
if esta_no_ar; then
    echo "✅ Site no ar em ${COMMIT_NOVO:0:7}."
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
fi

echo "❌ O site não respondeu em ${ESPERA_SEGUNDOS}s. Últimas linhas do log:"
$COMPOSE logs --tail 40 "$SERVICO" 2>&1 || true

if [ "$COMMIT_ANTERIOR" = "$COMMIT_NOVO" ]; then
    echo "❌ Não há versão anterior diferente para voltar. Contêiner deixado como está."
    exit 1
fi

echo "▶ Voltando para ${COMMIT_ANTERIOR:0:7}..."
git reset --hard "$COMMIT_ANTERIOR"
subir

if esta_no_ar; then
    echo "⚠️  Deploy revertido: a versão anterior está no ar."
    echo "    O commit ${COMMIT_NOVO:0:7} NÃO foi publicado. Veja o log acima."
else
    echo "🚨 A versão anterior também não subiu. O site está fora do ar — entre na VPS."
fi

exit 1

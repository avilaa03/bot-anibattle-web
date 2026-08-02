import { MongoClient, Db } from 'mongodb';

/**
 * Conexão com o MongoDB — o MESMO banco que o bot usa.
 *
 * Usamos o driver nativo em vez do Mongoose de propósito: o site só lê,
 * e o driver puro evita o conflito de registrar models duas vezes no
 * hot reload do Next.
 *
 * O cliente fica guardado em `globalThis` porque, em desenvolvimento, o
 * Next recarrega os módulos a cada alteração — sem isso, cada save abriria
 * uma conexão nova e estouraria o limite de 500 do Atlas M0 em minutos.
 */

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    'MONGODB_URI não definido. Copie .env.local.example para .env.local e preencha.'
  );
}

// Aviso para o erro que já derrubou o bot uma vez: URI sem nome de banco
// conecta no banco "test", que está vazio.
if (/mongodb(\+srv)?:\/\/[^/]+\/?(\?|$)/.test(uri)) {
  console.warn(
    '[mongodb] A URI parece não ter o nome do banco no caminho. ' +
    'Sem isso o driver conecta no banco "test" e tudo vem vazio. ' +
    'Correto: ...mongodb.net/AnimeFightDB?...'
  );
}

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _anibattleMongo: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._anibattleMongo) {
    global._anibattleMongo = new MongoClient(uri, options).connect();
  }
  clientPromise = global._anibattleMongo;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

export default clientPromise;

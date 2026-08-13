import { randomUUID, timingSafeEqual } from 'node:crypto';

const MODEL_NAMES = {
  1: 'Modelo Duplo',
  2: 'Modelo Moderno',
  3: 'Modelo Hierárquico'
};

function sendJson(response, statusCode, payload) {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    return response.status(statusCode).json(payload);
  }

  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') return request.body;

  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  return rawBody ? JSON.parse(rawBody) : {};
}

function isPasswordValid(candidate) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const receivedBuffer = Buffer.from(String(candidate || ''));
  const expectedBuffer = Buffer.from(expected);
  return expectedBuffer.length > 0
    && receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getVotesKey() {
  const environment = process.env.VOTE_ENV || process.env.VERCEL_ENV || 'development';
  return `datarange:votes:${environment}`;
}

async function redis(command) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Banco de votação não configurado.');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || 'Falha ao acessar o banco de votação.');
  return result.result;
}

async function listVotes() {
  const records = await redis(['LRANGE', getVotesKey(), '0', '-1']);
  return (records || []).flatMap(record => {
    try {
      return [typeof record === 'string' ? JSON.parse(record) : record];
    } catch {
      return [];
    }
  });
}

function buildSummary(votes) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  votes.forEach(vote => {
    if (counts[vote.option] !== undefined) counts[vote.option] += 1;
  });

  return {
    total: votes.length,
    options: Object.entries(counts).map(([option, count]) => ({
      option,
      name: MODEL_NAMES[option],
      count,
      percentage: votes.length ? Math.round((count / votes.length) * 100) : 0
    }))
  };
}

export default async function handler(request, response) {
  try {
    if (request.method === 'POST') {
      const body = await readBody(request);
      const name = String(body.name || '').trim().replace(/\s+/g, ' ');
      const note = String(body.note || '').trim();
      const option = String(body.option || '');

      if (name.length < 2 || name.length > 80) {
        return sendJson(response, 400, { error: 'Informe um nome entre 2 e 80 caracteres.' });
      }
      if (!['1', '2', '3'].includes(option)) {
        return sendJson(response, 400, { error: 'Selecione um dos três modelos.' });
      }
      if (note.length > 500) {
        return sendJson(response, 400, { error: 'A observação deve ter no máximo 500 caracteres.' });
      }

      const vote = {
        id: randomUUID(),
        name,
        note,
        option,
        createdAt: new Date().toISOString()
      };
      const total = Number(await redis(['LPUSH', getVotesKey(), JSON.stringify(vote)])) || 0;
      return sendJson(response, 201, { ok: true, name: vote.name, total });
    }

    if (request.method === 'GET') {
      const password = request.headers['x-admin-password'];
      if (!password) {
        const total = Number(await redis(['LLEN', getVotesKey()])) || 0;
        return sendJson(response, 200, { total });
      }
      if (!isPasswordValid(password)) {
        return sendJson(response, 401, { error: 'Senha administrativa inválida.' });
      }

      const votes = await listVotes();
      return sendJson(response, 200, { votes, summary: buildSummary(votes) });
    }

    return sendJson(response, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error('Vote API error:', error);
    return sendJson(response, 500, { error: 'Não foi possível acessar a votação agora. Tente novamente.' });
  }
}

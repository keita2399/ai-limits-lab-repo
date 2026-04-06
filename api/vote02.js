const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'ai-limits-lab:vote:round2';

async function redisCmd(...args) {
  const res = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  return json.result;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function getCounts() {
  const data = await redisCmd('HGETALL', KEY);
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i += 2) {
      counts[data[i]] = parseInt(data[i + 1]) || 0;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const result = await getCounts();
    return res.json(result);
  }

  if (req.method === 'POST') {
    const { design } = req.body;
    if (!['A', 'B', 'C', 'D', 'E'].includes(design)) {
      return res.status(400).json({ error: 'invalid design' });
    }
    await redisCmd('HINCRBY', KEY, design, '1');
    const result = await getCounts();
    return res.json(result);
  }

  return res.status(405).json({ error: 'method not allowed' });
}

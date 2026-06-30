import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'KV store not configured' });
  }

  try {
    const redis = new Redis({ url, token });
    const total = await redis.incr('spellings-y7:visitas');
    return res.status(200).json({ visitas: total });
  } catch (error) {
    return res.status(500).json({ error: 'KV error', details: error.message });
  }
}

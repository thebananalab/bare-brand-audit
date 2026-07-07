import { Redis } from '@upstash/redis';

let redis;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = Redis.fromEnv();
}

const TTL_SECONDS = 24 * 60 * 60;

export function cacheKeyForUrl(rawUrl) {
  try {
    const u = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return 'url:' + host + path + (u.search || '');
  } catch {
    return 'url:' + rawUrl.trim().toLowerCase();
  }
}

export function cacheKeyForImage(imageBase64) {
  return 'img:' + imageBase64.slice(0, 64);
}

export async function getCachedResult(key) {
  if (!redis) return null;
  try {
    return await redis.get('audit:' + key);
  } catch (e) {
    console.error('resultCache get failed, skipping cache:', e.message);
    return null;
  }
}

export async function setCachedResult(key, value) {
  if (!redis) return;
  try {
    await redis.set('audit:' + key, value, { ex: TTL_SECONDS });
  } catch (e) {
    console.error('resultCache set failed, skipping cache:', e.message);
  }
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const translationCache = new Map();
const PENDING_REQUESTS = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamp }] of translationCache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      translationCache.delete(key);
    }
  }
}, 60000);

const app = express();
const PORT = process.env.PORT || 8086;
const BASE_URL = process.env.TRANSLATE_BASE_URL || 'http://localhost:5000';
const API_KEY = process.env.TRANSLATE_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const cache = new Map();

function normalizeText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}
const APP_NAME_TOKEN = 'GOICA_TOKEN_NO_TRANSLATE';
const APP_NAME_REAL = 'GoIca';
async function translateLibre(text, target, source = 'auto') {
  const textWithToken = text.replace(/goica/gi, APP_NAME_TOKEN);
  const body = {
    q: textWithToken,
    source,
    target,
    format: 'text',
  };
  if (API_KEY) body.api_key = API_KEY;

  const res = await fetch(`${BASE_URL}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`LibreTranslate error ${res.status}: ${msg}`);
  }
  const data = await res.json();
  let translatedText = data.translatedText;
  translatedText = translatedText.replace(new RegExp(APP_NAME_TOKEN, 'g'), APP_NAME_REAL);
  return translatedText;
}

async function translateOne(text, target, source = 'auto') {
  const norm = normalizeText(text);
  if (!norm) return '';
  
  const cacheKey = `${target}::${source}::${norm}`;
  const cached = translationCache.get(cacheKey);
  
  // Devolver de la caché si está disponible
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return cached.translation;
  }

  // Evitar solicitudes duplicadas
  if (PENDING_REQUESTS.has(cacheKey)) {
    return PENDING_REQUESTS.get(cacheKey);
  }

  try {
    const translationPromise = translateLibre(norm, target, source)
      .then(translation => {
        translationCache.set(cacheKey, {
          translation,
          timestamp: Date.now()
        });
        return translation;
      })
      .finally(() => {
        PENDING_REQUESTS.delete(cacheKey);
      });

    PENDING_REQUESTS.set(cacheKey, translationPromise);
    return await translationPromise;
  } catch (error) {
    console.error('Error en translateOne:', error);
    PENDING_REQUESTS.delete(cacheKey);
    return norm; // Devolver el texto original si hay error
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, provider: 'libretranslate', baseUrl: BASE_URL });
});

app.post('/translate', async (req, res) => {
  try {
    const { texts, targetLang, sourceLang } = req.body || {};
    if (!Array.isArray(texts) || !targetLang) {
      return res.status(400).json({ error: 'texts (array) and targetLang are required' });
    }

    const unique = Array.from(new Set(texts.map(t => normalizeText(t))));

    const resultsMap = new Map();
    await Promise.all(
      unique.map(async (t) => {
        const tr = await translateOne(t, targetLang, sourceLang || 'auto');
        resultsMap.set(t, tr);
      })
    );

    const translations = texts.map(t => resultsMap.get(normalizeText(t)) || t);
    res.json({ translations });
  } catch (err) {
    console.error('Translate error:', err);
    res.status(500).json({ error: 'translation_failed', message: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`servicioTraduccion running on port ${PORT}`);
});

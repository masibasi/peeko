const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite';

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}

async function doFetch(texts: string[], inputType: 'document' | 'query'): Promise<Response> {
  const apiKey = process.env['VOYAGE_API_KEY'];
  if (!apiKey) throw new Error('VOYAGE_API_KEY is not set');

  return fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: texts, model: MODEL, input_type: inputType }),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(
  texts: string[],
  inputType: 'document' | 'query',
): Promise<number[][]> {
  const MAX_RETRIES = 5;
  let delay = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const response = await doFetch(texts, inputType);

    if (response.status === 401) {
      throw new Error(`Voyage AI 401 unauthorized — check VOYAGE_API_KEY`);
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === MAX_RETRIES) {
        throw new Error(`Voyage AI error after ${MAX_RETRIES} retries: ${response.status}`);
      }
      // Honour Retry-After header if present, otherwise exponential backoff
      const retryAfter = response.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      console.warn(`[embedding] HTTP ${response.status}, waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(waitMs);
      delay = Math.min(delay * 2, 30_000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Voyage AI error: ${response.status}`);
    }

    const body = (await response.json()) as VoyageResponse;
    return body.data.map((d) => d.embedding);
  }

  throw new Error('embedTexts: unreachable');
}

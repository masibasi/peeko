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

export async function embedTexts(
  texts: string[],
  inputType: 'document' | 'query',
): Promise<number[][]> {
  let response = await doFetch(texts, inputType);

  if (response.status === 401) {
    throw new Error(`Voyage AI 401 unauthorized — check VOYAGE_API_KEY`);
  }

  if (!response.ok) {
    // Single retry on 5xx
    response = await doFetch(texts, inputType);
    if (!response.ok) {
      throw new Error(`Voyage AI error after retry: ${response.status}`);
    }
  }

  const body = (await response.json()) as VoyageResponse;
  return body.data.map((d) => d.embedding);
}

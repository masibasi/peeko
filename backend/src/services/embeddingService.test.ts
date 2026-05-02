import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must mock before importing the module so the module sees the mock env
vi.stubEnv('VOYAGE_API_KEY', 'test-key');

// We'll import dynamically after stubbing fetch
let embedTexts: (texts: string[], inputType: 'document' | 'query') => Promise<number[][]>;

const makeResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('embeddingService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ embedTexts } = await import('./embeddingService.js'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns embeddings on success', async () => {
    const mockData = { data: [{ embedding: [0.1, 0.2, 0.3] }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeResponse(200, mockData)));

    const result = await embedTexts(['hello'], 'document');
    expect(result).toEqual([[0.1, 0.2, 0.3]]);
  });

  it('retries once on 5xx and succeeds on second attempt', async () => {
    const mockData = { data: [{ embedding: [0.5, 0.6] }] };
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce(makeResponse(503, { error: 'service unavailable' }))
        .mockResolvedValueOnce(makeResponse(200, mockData)),
    );

    const result = await embedTexts(['hello'], 'query');
    expect(result).toEqual([[0.5, 0.6]]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws on second 5xx failure (no more retries)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(500, { error: 'internal' })),
    );

    await expect(embedTexts(['hello'], 'document')).rejects.toThrow();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on 401 without retrying', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(makeResponse(401, { error: 'unauthorized' })));

    await expect(embedTexts(['hello'], 'document')).rejects.toThrow(/401|unauthorized/i);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});

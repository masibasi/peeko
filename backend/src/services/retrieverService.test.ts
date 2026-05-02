import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub env before module load
vi.stubEnv('VOYAGE_API_KEY', 'test-key');
vi.stubEnv('SUPABASE_URL', 'http://localhost');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-role-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

describe('retrieverService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns empty string when has_materials is false — no embedding call', async () => {
    const mockEmbedTexts = vi.fn();
    vi.doMock('./embeddingService.js', () => ({ embedTexts: mockEmbedTexts }));

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { has_materials: false },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.doMock('../config/supabase.js', () => ({ supabase: mockSupabase }));

    const { queryRelevantChunks } = await import('./retrieverService.js');
    const result = await queryRelevantChunks('session-123', 'what is gradient descent', 5);

    expect(result).toBe('');
    expect(mockEmbedTexts).not.toHaveBeenCalled();
  });

  it('returns top-K chunks ordered by cosine similarity when has_materials is true', async () => {
    const queryEmbedding = Array(512).fill(0.1);
    const mockEmbedTexts = vi.fn().mockResolvedValue([queryEmbedding]);

    vi.doMock('./embeddingService.js', () => ({ embedTexts: mockEmbedTexts }));

    // 10 pre-seeded chunks, rpc returns top 5
    const topChunks = Array.from({ length: 5 }, (_, i) => ({
      chunk_id: `chunk-${i}`,
      text: `Chunk text ${i}`,
      similarity: 0.9 - i * 0.05,
    }));

    const mockRpc = vi.fn().mockResolvedValue({ data: topChunks, error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { has_materials: true },
              error: null,
            }),
          }),
        }),
      }),
      rpc: mockRpc,
    };
    vi.doMock('../config/supabase.js', () => ({ supabase: mockSupabase }));

    const { queryRelevantChunks } = await import('./retrieverService.js');
    const result = await queryRelevantChunks('session-123', 'gradient descent', 5);

    expect(result).not.toBe('');
    expect(result).toContain('Chunk text 0');
    expect(mockEmbedTexts).toHaveBeenCalledWith(['gradient descent'], 'query');
    expect(mockRpc).toHaveBeenCalledWith('match_material_chunks', expect.objectContaining({
      p_session_id: 'session-123',
      p_match_count: 5,
    }));
  });
});

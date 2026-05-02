import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('VOYAGE_API_KEY', 'test-key');
vi.stubEnv('SUPABASE_URL', 'http://localhost');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-role-key');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');

describe('materialService — status update after chunk insertion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('sets status to ready and chunk_count matches actual rows inserted', async () => {
    const sampleText = Array.from({ length: 20 }, (_, i) =>
      `Paragraph ${i + 1}: This sentence explains concept ${i + 1} in detail. `,
    ).join('\n\n');

    vi.doMock('pdf-parse', () => ({
      default: vi.fn().mockResolvedValue({ text: sampleText }),
    }));

    const fakeEmbedding = Array(512).fill(0.01);
    vi.doMock('./embeddingService.js', () => ({
      embedTexts: vi.fn().mockResolvedValue(
        Array(50).fill(fakeEmbedding),
      ),
    }));

    let materialStatus = 'processing';
    let recordedChunkCount = 0;
    let hasMaterialsSet = false;
    let chunksInserted: unknown[] = [];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'lecture_materials') {
          return {
            update: vi.fn().mockImplementation((patch: Record<string, unknown>) => {
              if (patch['status']) materialStatus = patch['status'] as string;
              if (patch['chunk_count'] !== undefined) recordedChunkCount = patch['chunk_count'] as number;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'material_chunks') {
          return {
            insert: vi.fn().mockImplementation((rows: unknown[]) => {
              chunksInserted = rows;
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'sessions') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                hasMaterialsSet = true;
                return Promise.resolve({ error: null });
              }),
            }),
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'sessions/mat-1/file.pdf' }, error: null }),
        }),
      },
    };
    vi.doMock('../config/supabase.js', () => ({ supabase: mockSupabase }));

    const { processMaterial } = await import('./materialService.js');
    await processMaterial(
      Buffer.from('fake pdf content'),
      'application/pdf',
      'lecture.pdf',
      'session-abc',
      'mat-1',
    );

    expect(materialStatus).toBe('ready');
    expect(recordedChunkCount).toBeGreaterThan(0);
    expect(recordedChunkCount).toBe(chunksInserted.length);
    expect(hasMaterialsSet).toBe(true);
  });

  it('sets status to failed with error_message when parsing throws', async () => {
    vi.doMock('pdf-parse', () => ({
      default: vi.fn().mockRejectedValue(new Error('corrupt PDF')),
    }));
    vi.doMock('./embeddingService.js', () => ({
      embedTexts: vi.fn(),
    }));

    let materialStatus = 'processing';
    let errorMessage = '';

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'lecture_materials') {
          return {
            update: vi.fn().mockImplementation((patch: Record<string, unknown>) => {
              if (patch['status']) materialStatus = patch['status'] as string;
              if (patch['error_message']) errorMessage = patch['error_message'] as string;
              return { eq: vi.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'sessions/mat-fail/file.pdf' }, error: null }),
        }),
      },
    };
    vi.doMock('../config/supabase.js', () => ({ supabase: mockSupabase }));

    const { processMaterial } = await import('./materialService.js');
    // processMaterial throws, but we just want to check the DB side-effect
    await processMaterial(
      Buffer.from('not a real pdf'),
      'application/pdf',
      'bad.pdf',
      'session-abc',
      'mat-fail',
    ).catch(() => {});

    expect(materialStatus).toBe('failed');
    expect(errorMessage).toContain('corrupt PDF');
  });
});

import { describe, it, expect } from 'vitest';
import { chunkText } from './materialService.js';

describe('chunkText', () => {
  it('produces chunks ≤ 850 chars each', () => {
    const input = 'a'.repeat(3000);
    const chunks = chunkText(input);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(850);
    }
  });

  it('adjacent chunks share ≥ 90 chars of overlap', () => {
    const sentences = Array.from({ length: 40 }, (_, i) =>
      `Sentence ${i + 1} covers the topic of concept ${i + 1} in detail. `,
    ).join('');
    const chunks = chunkText(sentences);
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 0; i < chunks.length - 1; i++) {
      const a = chunks[i]!;
      const b = chunks[i + 1]!;
      let overlap = 0;
      for (let len = Math.min(a.length, b.length); len >= 1; len--) {
        if (a.endsWith(b.substring(0, len))) {
          overlap = len;
          break;
        }
      }
      expect(overlap).toBeGreaterThanOrEqual(90);
    }
  });

  it('produces no empty chunks', () => {
    const input = 'Hello world. This is a test.\n\nNew paragraph here.';
    const chunks = chunkText(input);
    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });

  it('handles input shorter than chunk size as a single chunk', () => {
    const input = 'Short text.';
    const chunks = chunkText(input);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('Short text.');
  });
});

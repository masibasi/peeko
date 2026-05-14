import { supabase } from '../config/supabase.js';
import { embedTexts } from './embeddingService.js';

const CHUNK_SIZE = 800;
const OVERLAP = 100;
const MAX_CHUNK = 850;

// Exported for unit tests

export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    // Prefer paragraph boundary within the window
    const window = text.slice(start, end + 200);
    const paraBreak = window.lastIndexOf('\n\n');
    if (paraBreak > OVERLAP) {
      end = start + paraBreak;
    } else {
      // Fall back to sentence boundary
      const sentBreak = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? '),
      );
      if (sentBreak > OVERLAP) {
        end = start + sentBreak + 1; // include the punctuation
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    // Next window starts OVERLAP chars before end
    start = end - OVERLAP;
    if (start <= 0) start = end; // safety guard against infinite loop
  }

  return chunks.filter((c) => c.trim().length > 0);
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf' || mimeType === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/docx' ||
    mimeType.includes('docx')
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text
  return buffer.toString('utf-8');
}

// Embed and insert in batches to avoid request size limits
const EMBED_BATCH = 16;
const INSERT_BATCH = 50;

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const batch = chunks.slice(i, i + EMBED_BATCH);
    const batchEmbeddings = await embedTexts(batch, 'document');
    embeddings.push(...batchEmbeddings);
  }
  return embeddings;
}

// materialId is pre-created by the route handler (fire-and-poll pattern)
export async function processMaterial(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
  sessionId: string,
  materialId: string,
): Promise<void> {
  try {
    console.log(`[processMaterial] start materialId=${materialId} file=${filename} mime=${mimeType} size=${fileBuffer.length}`);

    // 1. Ensure storage bucket exists (idempotent — no-ops if already created)
    const { error: bucketError } = await supabase.storage.createBucket('lecture-materials', { public: false });
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.warn(`[processMaterial] bucket creation warning: ${bucketError.message}`);
    }
    console.log('[processMaterial] step 1 done: bucket ready');

    // 2. Upload raw file to Supabase Storage and update file_url
    const storagePath = `sessions/${sessionId}/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from('lecture-materials')
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
    console.log('[processMaterial] step 2 done: file uploaded');

    await supabase
      .from('lecture_materials')
      .update({ file_url: storagePath })
      .eq('material_id', materialId);

    // 3. Parse text from file
    console.log('[processMaterial] step 3: extracting text...');
    const text = await extractText(fileBuffer, mimeType);
    if (!text.trim()) throw new Error('No extractable text found in file');
    console.log(`[processMaterial] step 3 done: extracted ${text.length} chars`);

    // 4. Chunk the text
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('Chunking produced no chunks');
    console.log(`[processMaterial] step 4 done: ${chunks.length} chunks`);

    // 5. Embed all chunks
    console.log('[processMaterial] step 5: embedding...');
    const embeddings = await embedChunks(chunks);
    console.log('[processMaterial] step 5 done: embeddings ready');

    // 6. Bulk insert material_chunks in batches to stay within Supabase body size limits
    console.log('[processMaterial] step 6: inserting chunks...');
    const rows = chunks.map((chunkText, i) => ({
      material_id: materialId,
      session_id: sessionId,
      chunk_index: i,
      text: chunkText,
      embedding: JSON.stringify(embeddings[i]),
    }));

    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      const { error: chunkError } = await supabase.from('material_chunks').insert(rows.slice(i, i + INSERT_BATCH));
      if (chunkError) throw new Error(`Failed to insert chunks batch ${i}: ${chunkError.message}`);
    }
    console.log('[processMaterial] step 6 done: all chunks inserted');

    // 7. Update lecture_materials: status = ready, chunk_count
    await supabase
      .from('lecture_materials')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('material_id', materialId);

    // 8. Set sessions.has_materials = true
    await supabase
      .from('sessions')
      .update({ has_materials: true })
      .eq('session_id', sessionId);

    console.log(`[processMaterial] done: ${chunks.length} chunks stored, status=ready`);
  } catch (err) {
    // On any error, mark as failed
    await supabase
      .from('lecture_materials')
      .update({ status: 'failed', error_message: (err as Error).message })
      .eq('material_id', materialId);

    throw err;
  }
}

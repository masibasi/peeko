import WebSocket from 'ws';
import { deepgram } from '../config/deepgram.js';
import { LiveTranscriptionEvents } from '@deepgram/sdk';
import * as transcriptService from './transcriptService.js';
import * as sessionService from './sessionService.js';

interface ActiveConnection {
  browserWs: WebSocket;
  dgConnection: ReturnType<typeof deepgram.listen.live>;
}

const activeConnections = new Map<string, ActiveConnection>();

function sendToBrowser(ws: WebSocket, payload: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function createDgConnection(sessionId: string, browserWs: WebSocket) {
  const dgConnection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true,
  });

  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[audio] Deepgram connected for session ${sessionId}`);
  });

  dgConnection.on(LiveTranscriptionEvents.Transcript, async (result) => {
    const alt = result.channel?.alternatives?.[0];
    if (!alt?.transcript) return;

    const text: string = alt.transcript;
    const isFinal: boolean = result.is_final ?? false;

    if (!isFinal) {
      // Interim: send to browser only, do not store
      sendToBrowser(browserWs, { type: 'interim', text });
    } else {
      // Final: send to browser AND store in Supabase
      sendToBrowser(browserWs, { type: 'final', text });
      if (text.trim()) {
        await transcriptService.storeChunk(sessionId, text).catch((err) => {
          console.error('[audio] Failed to store transcript chunk:', err);
        });
      }
    }
  });

  dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error(`[audio] Deepgram error for session ${sessionId}:`, err);
    sendToBrowser(browserWs, { type: 'error', message: 'Transcription service error' });
  });

  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[audio] Deepgram connection closed for session ${sessionId}`);
  });

  return dgConnection;
}

export function handleAudioWebSocket(browserWs: WebSocket, sessionId: string) {
  // Clean up any stale connection for this session
  const existing = activeConnections.get(sessionId);
  if (existing) {
    try { existing.dgConnection.finish(); } catch {}
  }

  const dgConnection = createDgConnection(sessionId, browserWs);
  activeConnections.set(sessionId, { browserWs, dgConnection });

  browserWs.on('message', (data: WebSocket.RawData) => {
    // Forward raw audio binary to Deepgram
    try {
      dgConnection.send(data as Buffer);
    } catch (err) {
      console.error('[audio] Failed to forward audio to Deepgram:', err);
    }
  });

  browserWs.on('close', async () => {
    console.log(`[audio] Browser disconnected from session ${sessionId}`);
    try { dgConnection.finish(); } catch {}
    activeConnections.delete(sessionId);

    // Mark session as disconnected (if not already ended)
    await sessionService.updateStatus(sessionId, 'disconnected').catch(() => {});
  });

  browserWs.on('error', (err) => {
    console.error(`[audio] Browser WebSocket error for session ${sessionId}:`, err);
    try { dgConnection.finish(); } catch {}
    activeConnections.delete(sessionId);
  });
}

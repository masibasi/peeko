import 'dotenv/config';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { env } from './config/env.js';
import app from './app.js';
import { handleAudioWebSocket } from './services/audioService.js';
import { verifyToken } from './middleware/auth.js';

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: undefined });

// Handle WebSocket upgrade requests
wss.on('connection', async (ws: WebSocket, req) => {
  const rawUrl = req.url ?? '';

  // Expected path: /session/:id/audio
  const match = rawUrl.match(/^\/session\/([^/?]+)\/audio/);
  if (!match) {
    ws.close(4004, 'Unknown WebSocket path');
    return;
  }

  const sessionId = match[1];

  // Extract auth token from query string (?token=...)
  const parsedUrl = new URL(rawUrl, `http://localhost:${env.PORT}`);
  const token = parsedUrl.searchParams.get('token') ?? '';

  const userId = await verifyToken(token);
  if (!userId) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  console.log(`[ws] Audio connection opened — session=${sessionId} user=${userId}`);
  handleAudioWebSocket(ws, sessionId);
});

server.listen(env.PORT, () => {
  console.log(`[server] Peeko backend running on port ${env.PORT}`);
  console.log(`[server] Auth required: ${env.AUTH_REQUIRED}`);
});

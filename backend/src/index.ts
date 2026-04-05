import 'dotenv/config';
import { env } from './config/env.js';
import app from './app.js';

app.listen(env.PORT, () => {
  console.log(`[server] Peeko backend running on port ${env.PORT}`);
  console.log(`[server] Auth required: ${env.AUTH_REQUIRED}`);
});

import 'dotenv/config';

function require(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  SUPABASE_URL: require('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: require('SUPABASE_SERVICE_ROLE_KEY'),
  DEEPGRAM_API_KEY: require('DEEPGRAM_API_KEY'),
  GROQ_API_KEY: require('GROQ_API_KEY'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  AUTH_REQUIRED: process.env.AUTH_REQUIRED !== 'false',
};

import Groq from 'groq-sdk';
import { env } from './env.js';

export const groq = new Groq({ apiKey: env.GROQ_API_KEY });

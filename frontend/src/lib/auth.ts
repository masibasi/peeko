// JWT token management for Google identity token
export const GOOGLE_IDENTITY_TOKEN_KEY = 'google_identity_token';

export function setGoogleToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GOOGLE_IDENTITY_TOKEN_KEY, token);
  }
}

export function getGoogleToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(GOOGLE_IDENTITY_TOKEN_KEY);
  }
  return null;
}

export function removeGoogleToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GOOGLE_IDENTITY_TOKEN_KEY);
  }
}

// Check if a JWT is expired
export function isJwtExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false; // If no exp, treat as not expired
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true; // If token is malformed, treat as expired
  }
}

// Decode JWT payload
export function decodeJwt(token: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

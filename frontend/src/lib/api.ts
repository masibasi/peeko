const API_BASE = '/api/session';

function authHeaders(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface MaterialStatus {
  material_id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  chunk_count: number;
}

export async function uploadMaterial(
  sessionId: string,
  file: File,
  token?: string | null,
  onProgress?: (pct: number) => void,
): Promise<{ material_id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { material_id: string });
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));

    xhr.open('POST', `${API_BASE}/${sessionId}/materials`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function getMaterials(
  sessionId: string,
  token?: string | null,
): Promise<MaterialStatus[]> {
  const res = await fetch(`${API_BASE}/${sessionId}/materials`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`getMaterials failed: ${res.status}`);
  const body = (await res.json()) as { materials: MaterialStatus[] };
  return body.materials;
}

export async function startSession(token?: string | null): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json() as Promise<{ session_id: string }>;
}

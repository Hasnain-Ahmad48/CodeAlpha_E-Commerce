export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export function centsToUsd(cents){
  return `$${(cents/100).toFixed(2)}`;
}


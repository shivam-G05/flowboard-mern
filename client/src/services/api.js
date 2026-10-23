// Thin fetch wrapper. Every request sends the HTTP-only session cookie (credentials: 'include'),
// and every error becomes an ApiError with the server's message, status and details.

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request(method, path, { body, params, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${toQueryString(params)}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. Check your connection and that the API is running.', 0, 'NETWORK_ERROR');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error ?? {};
    // No JSON body on a 5xx usually means a proxy/gateway answered because the API is down.
    const fallback = response.status >= 500 ? 'The server is unavailable right now. Please try again in a moment.' : `Request failed (${response.status})`;
    throw new ApiError(error.message ?? fallback, response.status, error.code, error.details);
  }
  return payload; // { data, meta? }
}

export const api = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
};

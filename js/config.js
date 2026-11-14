/**
 * config.js — Internal Web (kas, crysta, gate, saran)
 * Tanpa backward compat. Semua call site diubah.
 */

const GAS_CONTENT_URL = 'https://script.google.com/macros/s/AKfycbzlxIQc75KaCjn_05YhbQP3VMzP4W0NqpuJrGk8Vjm0F81NixhQ6RE_g55wMq_vf8cPVw/exec';

let _authConfigCache = null, _authConfigCacheTime = 0;
const AUTH_CONFIG_TTL = 5 * 60 * 1000;

// === FETCH WITH TIMEOUT ===
function fetchWithTimeout(url, options, timeoutMs) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  return fetch(url, Object.assign({}, options, { signal: c.signal }))
    .finally(() => clearTimeout(t));
}

// === AUTH CONFIG ===
let _authConfigNegativeUntil = 0;

async function getAuthConfig() {
  const now = Date.now();
  
  // Cache positif
  if (_authConfigCache && (now - _authConfigCacheTime) < AUTH_CONFIG_TTL) {
    return _authConfigCache;
  }
  
  // Negative cache — jangan spam server
  if (now < _authConfigNegativeUntil) {
    throw new Error('Server sedang sibuk. Coba lagi dalam ' + 
                    Math.ceil((_authConfigNegativeUntil - now) / 1000) + ' detik.');
  }
  
  try {
    const res = await fetchWithTimeout(GAS_CONTENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAuthConfig' })
    }, 5000);
    const data = await res.json();
    
    if (data.status === 'success' && data.activeUrl) {
      _authConfigCache = {...};
      _authConfigCacheTime = now;
      _authConfigNegativeUntil = 0;  // reset
      return _authConfigCache;
    }
  } catch(e) {
    console.warn('getAuthConfig error:', e.message);
  }
  
  // Gagal — set cooldown 30 detik
  _authConfigNegativeUntil = now + 30000;
  throw new Error('Server sedang sibuk. Coba lagi dalam 30 detik.');
}

async function reportAuthIssue(failedUrl) {
  try {
    const res = await fetchWithTimeout(GAS_CONTENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'reportAuthIssue',
        uid: localStorage.getItem('u_uid') || '',
        failedUrl: failedUrl
      })
    }, 5000);
    const data = await res.json();
    if (data.newUrl && data.newUrl !== failedUrl) {
      _authConfigCache = { activeUrl: data.newUrl, active: data.active, total: data.total };
      _authConfigCacheTime = Date.now();
    }
    return data;
  } catch(e) { return null; }
}

// === AUTH FETCH ===
async function authFetch(action, payload, options) {
  options = options || {};
  const isWrite = options.isWrite === true;
  const timeout = options.timeout || 12000;
  
  const config = await getAuthConfig();
  const url = config.activeUrl;
  
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, payload))
    }, timeout);
    
    if (res.status >= 500) {
      await reportAuthIssue(url);
      if (!isWrite) {
        const nc = await getAuthConfig();
        if (nc.activeUrl !== url) {
          const r2 = await fetchWithTimeout(nc.activeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(Object.assign({ action }, payload))
          }, timeout);
          return r2.json();
        }
      }
      throw new Error('Server error ' + res.status);
    }
    
    const data = await res.json();
    if (data.status === 'quota_exceeded') {
      await reportAuthIssue(url);
      throw new Error('Server quota habis.');
    }
    return data;
  } catch(e) {
    if (e.name === 'AbortError' || String(e.message).includes('Failed to fetch')) {
      await reportAuthIssue(url);
      if (isWrite) throw new Error('Timeout. Cek dulu sebelum kirim ulang.');
      const nc = await getAuthConfig();
      if (nc.activeUrl !== url) {
        const r2 = await fetchWithTimeout(nc.activeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(Object.assign({ action }, payload))
        }, timeout);
        return r2.json();
      }
    }
    throw e;
  }
}

// === AUTH GET ===
async function authGet(action, params) {
  const config = await getAuthConfig();
  let url = config.activeUrl + '?action=' + action;
  params = params || {};
  for (const k in params) {
    if (params[k] !== undefined && params[k] !== null) {
      url += '&' + k + '=' + encodeURIComponent(params[k]);
    }
  }
  const res = await fetchWithTimeout(url, {}, 10000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// === CONTENT FETCH (internal) ===
async function contentFetch(action, params) {
  params = params || {};
  let url = GAS_CONTENT_URL + '?action=' + action;
  for (const k in params) {
    if (params[k] !== undefined && params[k] !== null) {
      url += '&' + k + '=' + encodeURIComponent(params[k]);
    }
  }
  const res = await fetchWithTimeout(url, {}, 10000);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// === CONTENT API (internal-specific) ===
const API = {
  async getKasMonthly(tahun, bulan) {
    return contentFetch('getKasMonthly', { tahun, bulan });
  },
  async getKasHistory(limit) {
    return contentFetch('getKasHistory', { limit });
  },
  async getTotalKas() {
    return contentFetch('getTotalKas');
  },
  async getAvailableMonths() {
    return contentFetch('getAvailableMonths');
  },
  async getCrysta() {
    return contentFetch('getCrysta');
  }
};

window.API = API;
window.authFetch = authFetch;
window.authGet = authGet;
window.contentFetch = contentFetch;
window.getAuthConfig = getAuthConfig;
window.fetchWithTimeout = fetchWithTimeout;
window.reportAuthIssue = reportAuthIssue;

console.log('✅ config.js loaded (internal — no backward compat)');

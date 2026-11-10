/**
 * config.js — Konfigurasi Global Web Internal
 * 
 * Di-load PERTAMA sebelum file JS lain.
 * 
 * V2: Hapus API_KEY — pakai UID validation (via GAS5 isValidMemberUid).
 */

const UM_CONFIG = {
  GAS5_URL: 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec'
};

// Helper: bangun URL GAS 5 dengan UID
function buildGas5Url(action, params) {
  const uid = localStorage.getItem('u_uid') || '';
  
  let url = `${UM_CONFIG.GAS5_URL}?action=${action}`;
  
  if (uid) {
    url += `&uid=${encodeURIComponent(uid)}`;
  }
  
  if (params) {
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        url += `&${key}=${encodeURIComponent(params[key])}`;
      }
    }
  }
  
  return url;
}

// Helper: bangun body POST untuk GAS5
function buildGas5PostBody(action, payload = {}) {
  const token = localStorage.getItem('umbrella_session_token') || '';
  return {
    action: action,
    token: token,
    ...payload
  };
}

// Helper: POST ke GAS5
async function fetchGas5Post(action, payload = {}) {
  const body = buildGas5PostBody(action, payload);
  const res = await fetch(UM_CONFIG.GAS5_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return res.json();
}

window.buildGas5PostBody = buildGas5PostBody;
window.fetchGas5Post = fetchGas5Post;

console.log('✅ config.js loaded (V2 — UID-based auth)');

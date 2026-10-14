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

console.log('✅ config.js loaded (V2 — UID-based auth)');

/**
 * config.js — Konfigurasi Global Web Internal
 * 
 * Di-load PERTAMA sebelum file JS lain.
 */

const UM_CONFIG = {
  GAS5_URL: 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec',
  GAS5_API_KEY: 'umbrella_2026_x7k9mPqR3nL8vW2yH5tZ4bC1dF6gJ0a'
};

// Helper: bangun URL GAS 5 dengan API key + UID
function buildGas5Url(action, params) {
  const uid = localStorage.getItem('u_uid') || '';
  
  let url = `${UM_CONFIG.GAS5_URL}?action=${action}&key=${encodeURIComponent(UM_CONFIG.GAS5_API_KEY)}`;
  
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

console.log('✅ config.js loaded');

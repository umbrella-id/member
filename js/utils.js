/**
 * utils.js — Utility helpers (single source of truth)
 * Load SETELAH config.js, SEBELUM file JS lain.
 */
(function() {
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      if (m === '"') return '&quot;';
      if (m === "'") return '&#39;';
      return m;
    });
  }

  function escapeJs(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  window.getFriendlyErrorMessage = function(err, fallback) {
    if (!err) return fallback || 'Terjadi kesalahan';
    const msg = String(err.message || '');
    
    if (msg.includes('Server sedang sibuk') || msg.includes('Gagal resolve auth URL')) {
      return '⚠️ Server sedang sibuk. Coba lagi sebentar lagi.';
    }
    if (msg.includes('Timeout') || msg.includes('Failed to fetch') || 
        msg.includes('NetworkError') || msg.includes('Load failed')) {
      return '⚠️ Koneksi lambat. Periksa internet Anda.';
    }
    return fallback || 'Terjadi kesalahan';
  };
  
  window.escapeHtml = escapeHtml;
  window.escapeJs = escapeJs;

  console.log('✅ utils.js loaded');
})();

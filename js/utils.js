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

  function escapeJs(text) {
    if (!text) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  window.escapeHtml = escapeHtml;
  window.escapeJs = escapeJs;

  console.log('✅ utils.js loaded');
})();

// ==========================================
// EVENT.JS — Deteksi event.html + Load
// ==========================================

let isEventAvailable = false;
let _eventCheckPromise = null;

// ==========================================
// DETEKSI — dedup, single network call
// ==========================================
function checkEventAvailability() {
  if (_eventCheckPromise) return _eventCheckPromise;
  
  console.log('🔍 [EVENT] cek event.html...');
  
  _eventCheckPromise = fetch('event.html', { method: 'HEAD', cache: 'no-cache' })
    .then(response => {
      isEventAvailable = response.ok;
      window.isEventAvailable = isEventAvailable;
      console.log(isEventAvailable 
        ? '✅ [EVENT] event.html tersedia' 
        : '❌ [EVENT] event.html tidak ditemukan');
      return isEventAvailable;
    })
    .catch(() => {
      isEventAvailable = false;
      window.isEventAvailable = false;
      console.log('❌ [EVENT] error fetch');
      return false;
    });
  
  return _eventCheckPromise;
}

// ==========================================
// LOAD EVENT PAGE
// ==========================================
function loadEventPage() {
  if (window.setLastActiveTab) window.setLastActiveTab('event');
  
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  
  mainContent.innerHTML = `
    <div class="event-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:16px;">
      <div class="spinner" style="width:30px;height:30px;border:3px solid var(--border-line);border-top:3px solid var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      <p>Memuat halaman Event...</p>
    </div>
  `;
  
  fetch('event.html', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      let content = doc.body.innerHTML;
      const mainContentEvent = doc.querySelector('.main-content-event');
      if (mainContentEvent) content = mainContentEvent.outerHTML;
      
      // Inject style
      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach(style => {
        const existing = document.querySelector('style[data-event-style]');
        if (existing) existing.remove();
        const newStyle = document.createElement('style');
        newStyle.setAttribute('data-event-style', 'true');
        newStyle.textContent = style.textContent;
        document.head.appendChild(newStyle);
      });
      
      mainContent.innerHTML = content;
      
      // Inject script (tanpa eval — pakai script tag)
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.src) {
          const existing = document.querySelector(`script[data-event-script][src="${script.src}"]`);
          if (!existing) {
            const newScript = document.createElement('script');
            newScript.setAttribute('data-event-script', 'true');
            newScript.src = script.src;
            document.body.appendChild(newScript);
          }
        } else {
          try {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
          } catch(e) {
            console.warn('Inline script error:', e);
          }
        }
      });
      
      console.log('✅ Event page loaded');
    })
    .catch(err => {
      console.error('❌ Gagal load event.html:', err);
      mainContent.innerHTML = `
        <div class="event-error" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:16px;">
          <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#f87171;"></i>
          <h2 style="color:#f87171;">Gagal memuat Event</h2>
          <p>${err.message}</p>
          <button onclick="window.navigateToPage('laporan')" style="background:var(--color-primary);border:none;color:#fff;padding:8px 24px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;">Kembali ke Kas</button>
        </div>
      `;
    });
}

// ==========================================
// EXPOSE
// ==========================================
window.isEventAvailable = isEventAvailable;
window.checkEventAvailability = checkEventAvailability;
window.loadEventPage = loadEventPage;

// ⚠️ TIDAK ADA auto-call di sini.
// checkEventAvailability dipanggil dari gate.js (checkGateStatus)
// untuk paralel dengan getAuthConfig.

console.log('✅ event.js loaded (no auto-call)');

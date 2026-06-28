// ==========================================
// EVENT.JS - HANYA DETEKSI EVENT.HTML
// ==========================================

// ==================== STATE ====================
let isEventAvailable = false;

// ==================== DETEKSI EVENT.HTML ====================
function checkEventAvailability() {
    console.log('🔍 [EVENT] Mengecek event.html...');
    fetch('event.html', { method: 'HEAD', cache: 'no-cache' })
        .then(response => {
            if (response.ok) {
                console.log('✅ [EVENT] event.html ditemukan!');
                isEventAvailable = true;
                window.isEventAvailable = true;
            } else {
                console.log('❌ [EVENT] event.html tidak ditemukan.');
                isEventAvailable = false;
                window.isEventAvailable = false;
            }
            // 🔥 Beri tahu app.js untuk rebuild menu
            if (typeof window.buildMenu === 'function') {
                window.buildMenu();
            }
        })
        .catch(() => {
            console.log('❌ [EVENT] event.html tidak ditemukan (error).');
            isEventAvailable = false;
            window.isEventAvailable = false;
            if (typeof window.buildMenu === 'function') {
                window.buildMenu();
            }
        });
}

// ==================== LOAD EVENT PAGE ====================
function loadEventPage() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    // Tampilkan loading
    mainContent.innerHTML = `
        <div class="event-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:16px;">
            <div class="spinner" style="width:30px;height:30px;border:3px solid var(--border-line);border-top:3px solid var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <p>Memuat halaman Event...</p>
        </div>
    `;
    
    // 🔥 LOAD event.html LENGKAP
    fetch('event.html', { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // 🔥 Ambil konten BODY
            let content = doc.body.innerHTML;
            
            // 🔥 Jika ada container khusus, ambil itu
            const mainContentEvent = doc.querySelector('.main-content-event');
            if (mainContentEvent) {
                content = mainContentEvent.outerHTML;
            }
            
            // 🔥 Inject style dari event.html ke head
            const styleTags = doc.querySelectorAll('style');
            styleTags.forEach(style => {
                const existing = document.querySelector('style[data-event-style]');
                if (existing) existing.remove();
                const newStyle = document.createElement('style');
                newStyle.setAttribute('data-event-style', 'true');
                newStyle.textContent = style.textContent;
                document.head.appendChild(newStyle);
            });
            
            // 🔥 Masukkan konten
            mainContent.innerHTML = content;
            
            // 🔥 Jalankan script dari event.html
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => {
                if (script.src) {
                    // Script eksternal
                    const existing = document.querySelector(`script[data-event-script][src="${script.src}"]`);
                    if (!existing) {
                        const newScript = document.createElement('script');
                        newScript.setAttribute('data-event-script', 'true');
                        newScript.src = script.src;
                        document.body.appendChild(newScript);
                    }
                } else {
                    // Script inline
                    try {
                        eval(script.textContent);
                    } catch(e) {
                        console.warn('Inline script error:', e);
                    }
                }
            });
            
            console.log('✅ Event page loaded successfully');
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

// ==================== EXPOSE ====================
window.isEventAvailable = isEventAvailable;
window.loadEventPage = loadEventPage;

// ==================== AUTO DETEKSI ====================
// Jalankan deteksi saat event.js di-load
checkEventAvailability();

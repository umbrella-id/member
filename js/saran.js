// ==================== KONFIGURASI SARAN ====================

var isSendingSaran = false;
var saranPopupHistory = [];

// ==================== RENDER SARAN ====================
function renderSaran() {
    // Cek apakah popup sudah ada
    if (document.getElementById('saranPopupOverlay')) {
        var popup = document.getElementById('saranPopupOverlay');
        popup.style.display = 'flex';
        return;
    }

    // Buat popup overlay di atas konten yang ada
    var popupHTML = '';
    popupHTML += '<div class="saran-popup-overlay" id="saranPopupOverlay">';
    popupHTML += '  <div class="saran-popup-container">';
    popupHTML += '    <div class="saran-popup-header">';
    popupHTML += '      <button class="saran-popup-close" id="saranCloseBtn">';
    popupHTML += '        <i class="fas fa-times"></i>';
    popupHTML += '      </button>';
    popupHTML += '      <h2><i class="fas fa-envelope"></i> KIRIM SARAN</h2>';
    popupHTML += '      <p>Kritik, saran, atau aspirasi Anda sangat berharga</p>';
    popupHTML += '    </div>';
    popupHTML += '    <div class="saran-popup-body">';
    popupHTML += '      <div class="input-group">';
    popupHTML += '        <label><i class="fas fa-pen"></i> PESAN ANDA</label>';
    popupHTML += '        <textarea id="saranMessage" placeholder="Tulis saran, kritik, atau aspirasi Anda untuk perkembangan guild Umbrella..."></textarea>';
    popupHTML += '      </div>';
    popupHTML += '      <button class="send-btn" id="saranSendBtn">';
    popupHTML += '        <i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
    popupHTML += '      </button>';
    popupHTML += '    </div>';
    popupHTML += '  </div>';
    popupHTML += '</div>';

    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // SET STATE POPUP TERBUKA
    if (window.setSaranPopupOpen) {
        window.setSaranPopupOpen(true);
    }
    
    saranPopupHistory.push('saran');
    history.pushState({ saran: true }, null, '#saran');

    // SEMBUNYIKAN HEADER KAS
    var headerKas = document.querySelector('.header-kas');
    if (headerKas) headerKas.style.display = 'none';

    initSaranEvents();
}

// ==================== CLOSE SARAN ====================
function closeSaran() {
    // Hapus popup dari body
    var popup = document.getElementById('saranPopupOverlay');
    if (popup) {
        popup.remove();
    }

    // SET STATE POPUP TERTUTUP
    if (window.setSaranPopupOpen) {
        window.setSaranPopupOpen(false);
    }
    if (saranPopupHistory.length > 0) {
        saranPopupHistory.pop();
        if (saranPopupHistory.length === 0) {
            history.replaceState(null, null, ' ');
        }
    }

    // 🔥 AMBIL TAB SEBELUMNYA DARI lastActiveTab
    var lastTab = window.getLastActiveTab ? window.getLastActiveTab() : 'laporan';
    
    // 🔥 JIKA lastTab ADALAH 'saran', GUNAKAN FALLBACK
    if (lastTab === 'saran') {
        // Cek apakah event tersedia
        if (window.isEventAvailable) {
            lastTab = 'event';
        } else {
            lastTab = 'laporan';
        }
    }
    
    // UPDATE MENU AKTIF DI FLOATING PANEL
    var menuItems = document.querySelectorAll('.menu-panel ul li');
    for (var i = 0; i < menuItems.length; i++) {
        menuItems[i].classList.remove('active');
    }
    var menuItem = document.querySelector('.menu-panel ul li[data-page="' + lastTab + '"]');
    if (menuItem) {
        menuItem.classList.add('active');
    } else {
        // Fallback: cari laporan atau event
        var fallbackMenu = document.querySelector('.menu-panel ul li[data-page="laporan"]');
        if (!fallbackMenu && window.isEventAvailable) {
            fallbackMenu = document.querySelector('.menu-panel ul li[data-page="event"]');
        }
        if (fallbackMenu) fallbackMenu.classList.add('active');
        if (fallbackMenu) lastTab = fallbackMenu.dataset.page;
    }

    // RENDER TAB YANG SESUAI
    if (window.navigateToPage) {
        window.navigateToPage(lastTab);
    } else {
        if (lastTab === 'laporan') {
            if (typeof renderLaporan === 'function') {
                renderLaporan();
            }
        } else if (lastTab === 'crysta') {
            if (typeof renderCrysta === 'function') {
                renderCrysta();
            }
        } else if (lastTab === 'event') {
            if (typeof window.loadEventPage === 'function') {
                window.loadEventPage();
            }
        } else {
            if (typeof renderLaporan === 'function') {
                renderLaporan();
            }
        }
    }
}

// ==================== RESET SARAN FORM ====================
function resetSaranForm() {
    var msgEl = document.getElementById('saranMessage');
    if (msgEl) msgEl.value = '';
}

// ==================== INIT SARAN EVENTS ====================
function initSaranEvents() {
    var messageEl = document.getElementById('saranMessage');
    var sendBtn = document.getElementById('saranSendBtn');
    var closeBtn = document.getElementById('saranCloseBtn');
    var toast = document.getElementById('toastMessage');

    function showToastSaran(msg, isError) {
        isError = isError || false;
        toast.innerText = msg;
        toast.style.borderColor = isError ? '#ff4444' : '#a855f7';
        toast.classList.add('show');
        setTimeout(function() { toast.classList.remove('show'); }, 3000);
    }

    function sendSaran() {
        if (isSendingSaran) return;

        var pesan = messageEl.value.trim();
        if (!pesan) {
            showToastSaran('⚠️ Pesan tidak boleh kosong!', true);
            messageEl.focus();
            return;
        }

        // Validasi session
        var uid = localStorage.getItem('u_uid') || '';
        var token = localStorage.getItem('umbrella_session_token') || '';
        
        if (!uid || !token) {
            showToastSaran('⚠️ Sesi tidak valid. Muat ulang halaman.', true);
            return;
        }

        isSendingSaran = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';

        window.authFetch('submitSaran', { uid, token, message: pesan })
            .then(function(data) {
                if (data.status === 'success') {
                    showToastSaran('✅ Saran terkirim. Terima kasih.');
                    setTimeout(function() {
                        resetSaranForm();
                        closeSaran();
                        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
                        sendBtn.disabled = false;
                        isSendingSaran = false;
                    }, 1000);
                } else if (data.status === 'rate_limited') {
                    showToastSaran('⚠️ ' + (data.message || 'Terlalu banyak permintaan.'), true);
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
                    sendBtn.disabled = false;
                    isSendingSaran = false;
                } else {
                    showToastSaran('⚠️ ' + (data.message || 'Gagal mengirim'), true);
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
                    sendBtn.disabled = false;
                    isSendingSaran = false;
                }
            })
            .catch(function(e) {
              showToastSaran(getFriendlyErrorMessage(e, '🚨 Koneksi gagal! Coba lagi.'), true);
              sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
              sendBtn.disabled = false;
              isSendingSaran = false;
              console.error(e);
            });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeSaran);
    if (sendBtn) sendBtn.addEventListener('click', sendSaran);
    if (messageEl) {
        messageEl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendSaran();
            }
        });
    }

    console.log("✅ Kotak Saran terintegrasi (GAS5)");
}

// ==================== EXPOSE ====================
window.renderSaran = renderSaran;
window.closeSaran = closeSaran;
window.resetSaranForm = resetSaranForm;

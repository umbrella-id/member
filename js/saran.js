// ==================== KONFIGURASI SARAN ====================
const GAS_MAIL_URL = "https://script.google.com/macros/s/AKfycbyv6cBEWlT9JsprJqdRVG2EiqRYrNlyu6uHxH6xuFG9PRXSwkO6aKi8-EHXm99puRQX/exec";

// ==================== STATE SARAN ====================
let isSendingSaran = false;
let myUID = localStorage.getItem('u_uid_saran');
if (!myUID) {
    myUID = 'SARAN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('u_uid_saran', myUID);
}

// ==================== RENDER SARAN ====================
function renderSaran() {
    // 🔥 CEK APAKAH POPUP SUDAH ADA
    if (document.getElementById('saranPopupOverlay')) {
        // Jika sudah ada, tampilkan saja
        const popup = document.getElementById('saranPopupOverlay');
        popup.style.display = 'flex';
        return;
    }

    // 🔥 BUAT POPUP OVERLAY DI ATAS KONTEN YANG ADA
    const popupHTML = `
        <div class="saran-popup-overlay" id="saranPopupOverlay">
            <div class="saran-popup-container">
                <div class="saran-popup-header">
                    <button class="saran-popup-close" id="saranCloseBtn">
                        <i class="fas fa-times"></i>
                    </button>
                    <h2><i class="fas fa-envelope"></i> KIRIM SARAN</h2>
                    <p>Kritik, saran, atau aspirasi Anda sangat berharga</p>
                </div>
                <div class="saran-popup-body">
                    <div class="input-group">
                        <label><i class="fas fa-pen"></i> PESAN ANDA</label>
                        <textarea id="saranMessage" placeholder="Tulis saran, kritik, atau aspirasi Anda untuk perkembangan guild Umbrella..."></textarea>
                    </div>
                    <button class="send-btn" id="saranSendBtn">
                        <i class="fas fa-paper-plane"></i> KIRIM SEKARANG
                    </button>
                </div>
            </div>
        </div>
    `;

    // 🔥 TAMBAHKAN POPUP KE BODY, BUKAN MAIN CONTENT
    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // 🔥 SEMBUNYIKAN HEADER KAS SAAT POPUP TERBUKA
    const headerKas = document.querySelector('.header-kas');
    if (headerKas) headerKas.style.display = 'none';

    initSaranEvents();
}

// ==================== CLOSE SARAN ====================
function closeSaran() {
    // 🔥 HAPUS POPUP DARI BODY
    const popup = document.getElementById('saranPopupOverlay');
    if (popup) {
        popup.remove();
    }

    // 🔥 TAMPILKAN KEMBALI HEADER KAS
    const headerKas = document.querySelector('.header-kas');
    if (headerKas) headerKas.style.display = 'flex';

    // 🔥 KEMBALI KE TAB SEBELUMNYA
    const lastTab = window.getLastActiveTab ? window.getLastActiveTab() : 'laporan';
    
    document.querySelectorAll('.menu-panel ul li').forEach(function(i) {
        i.classList.remove('active');
    });
    const menuItem = document.querySelector('.menu-panel ul li[data-page="' + lastTab + '"]');
    if (menuItem) menuItem.classList.add('active');

    if (lastTab === 'laporan') {
        if (typeof renderLaporan === 'function') {
            renderLaporan();
        }
    } else if (lastTab === 'segera') {
        if (typeof renderSegera === 'function') {
            renderSegera();
        }
    } else {
        if (typeof renderLaporan === 'function') {
            renderLaporan();
        }
    }
}

// ==================== RESET SARAN FORM ====================
function resetSaranForm() {
    const msgEl = document.getElementById('saranMessage');
    if (msgEl) msgEl.value = '';
}

// ==================== INIT SARAN EVENTS ====================
function initSaranEvents() {
    const messageEl = document.getElementById('saranMessage');
    const sendBtn = document.getElementById('saranSendBtn');
    const closeBtn = document.getElementById('saranCloseBtn');
    const toast = document.getElementById('toastMessage');

    function showToastSaran(msg, isError) {
        isError = isError || false;
        toast.innerText = msg;
        toast.style.borderColor = isError ? '#ff4444' : '#a855f7';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function sendSaran() {
        if (isSendingSaran) return;

        const pesan = messageEl.value.trim();

        if (!pesan) {
            showToastSaran('⚠️ Pesan tidak boleh kosong!', true);
            messageEl.focus();
            return;
        }

        isSendingSaran = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MENGIRIM...';

        const kategori = 'Saran';
        const url = GAS_MAIL_URL + '?uid=' + encodeURIComponent(myUID) + '&ign=Member&msg=' + encodeURIComponent(pesan) + '&category=' + encodeURIComponent(kategori) + '&type=mail';

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    showToastSaran('✅ Surat berhasil dikirim! Terima kasih.');
                    setTimeout(() => {
                        resetSaranForm();
                        closeSaran();
                        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
                        sendBtn.disabled = false;
                        isSendingSaran = false;
                    }, 1000);
                } else {
                    showToastSaran('⚠️ Gagal: ' + (data.message || 'Sistem error'), true);
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> KIRIM SEKARANG';
                    sendBtn.disabled = false;
                    isSendingSaran = false;
                }
            })
            .catch(e => {
                showToastSaran('🚨 Koneksi gagal! Coba lagi.', true);
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

    console.log("✅ Kotak Saran terintegrasi");
}

// ==================== RENDER SEGERA ====================
function renderSegera() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="segera-hadir">
            <i class="fas fa-tools"></i>
            <h2>Segera Hadir</h2>
            <p>Fitur ini sedang dalam pengembangan</p>
        </div>
    `;
}

// ==================== EXPOSE ====================
window.renderSaran = renderSaran;
window.closeSaran = closeSaran;
window.resetSaranForm = resetSaranForm;
window.renderSegera = renderSegera;

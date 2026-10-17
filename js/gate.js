/**
 * gate.js — Gate Verifikasi Member
 * 
 * Alur:
 * 1. Cek `u_uid` di localStorage.
 * 2. Kalau ada → fetch GAS 5 checkUidType → tahu tipenya.
 * 3. Kalau member → langsung masuk.
 * 4. Kalau bukan → tampilkan gate.
 * 5. Gate input kode akses → GAS 5 checkAccessCode → return UID M-xxx.
 * 6. Simpan UID + set class member.
 * 
 * Perubahan dari Fase 1:
 * - Hapus 6 digit WA
 * - Ganti ke kode akses
 * - Pertanyaan dari GAS 5 getGateQuestion
 * 
 * DEPENDENSI: config.js (UM_CONFIG)
 */

// ==========================================
// CEK STATUS GATE SAAT LOAD + VERIFIKASI BACKGROUND
// ==========================================
async function checkGateStatus() {
  const uUid = localStorage.getItem('u_uid') || '';
  
  // 1. Tidak ada UID → tampilkan gate
  if (!uUid) {
    console.log('🔒 Tidak ada UID → tampilkan gate');
    await loadGateQuestion();
    showGate();
    return false;
  }
  
  // 2. Cek tipe ke GAS 5 (sekaligus validasi)
  console.log('🔍 Cek tipe UID:', uUid);
  
  // 🕐 Timeout 10 detik biar tidak stuck
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const url = buildGas5Url('checkUidType', { uid: uUid });
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    console.log('📡 GAS 5 response:', data);
    
    // 🆕 Kalau GAS5 return error Unauthorized (UID tidak valid)
    if (data.error && data.error.indexOf('Unauthorized') !== -1) {
      console.log('🔒 UID ditolak server → hapus & tampilkan gate');
      localStorage.removeItem('u_uid');
      await loadGateQuestion();
      showGate();
      return false;
    }
    
    if (data.success && data.type === 'member' && data.valid === true) {
      // Member aktif → langsung masuk
      console.log('✅ Tipe member valid → masuk');
      hideGate();
      return true;
    } else {
      // Guest / UID tidak valid / member nonaktif → hapus UID & tampilkan gate
      console.log('🔒 Tidak valid → hapus UID & tampilkan gate');
      localStorage.removeItem('u_uid');
      await loadGateQuestion();
      showGate();
      return false;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    
    // Kalau timeout / abort
    if (e.name === 'AbortError') {
      console.warn('⏰ Timeout cek UID (10s) — fail open');
      if (uUid) {
        hideGate();
        return true;
      }
    }
    
    console.error('❌ Error cek tipe UID:', e);
    // 🔓 FAIL OPEN: kalau error koneksi, cek dulu apakah UID ada
    // Kalau ada → biarkan akses (jangan ganggu user karena server error)
    // Kalau tidak ada → tampilkan gate
    if (uUid) {
      console.log('⚠️ Koneksi error, fail open — pakai UID existing');
      hideGate();
      return true;
    }
    await loadGateQuestion();
    showGate();
    return false;
  }
}

// ==========================================
// LOAD PERTANYAAN GATE DARI GAS 5
// ==========================================
async function loadGateQuestion() {
  try {
    const url = `${UM_CONFIG.GAS5_URL}?action=getGateQuestion`;
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 Gate question response:', data);
    
    if (data.success && data.question) {
      const label = document.getElementById('gateQuestion');
      if (label) label.textContent = data.question;
    } else {
      const label = document.getElementById('gateQuestion');
      if (label) label.textContent = 'Masukkan Kode Akses';
    }
  } catch(e) {
    console.error('❌ Load gate question error:', e);
    const label = document.getElementById('gateQuestion');
    if (label) label.textContent = 'Masukkan Kode Akses';
  }
}

// ==========================================
// VERIFIKASI BACKGROUND (Tiap 5 Menit + Balik Tab)
// ==========================================
async function verifyMemberBackground() {
  const uUid = localStorage.getItem('u_uid') || '';
  if (!uUid) return;
  
  // Throttle 5 menit
  const lastCheck = parseInt(localStorage.getItem('u_last_verify') || '0');
  if (Date.now() - lastCheck < 5 * 60 * 1000) {
    console.log('⏭️ Skip verifikasi (baru < 5 menit)');
    return;
  }
  
  try {
    const url = buildGas5Url('checkUidType', { uid: uUid });
    const res = await fetch(url);
    const data = await res.json();
    
    localStorage.setItem('u_last_verify', Date.now().toString());
    
    if (data.success && data.type === 'member' && data.valid === true) {
      console.log('✅ Verifikasi background: masih valid');
    } else {
      console.log('🔴 Verifikasi background: tidak valid — logout');
      localStorage.removeItem('u_uid');
      localStorage.removeItem('u_last_verify');
      await loadGateQuestion();
      showGate();
      // Reload biar bersih
      setTimeout(() => location.reload(), 1500);
    }
  } catch(e) {
    console.log('⚠️ Verifikasi background error (fail open):', e);
  }
}

// Panggil saat balik ke tab
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    verifyMemberBackground();
  }
});

// Panggil saat window focus (PC)
window.addEventListener('focus', () => {
  verifyMemberBackground();
});

// ==========================================
// TAMPILKAN GATE
// ==========================================
function showGate() {
  const gate = document.getElementById('internalGate');
  const mainContent = document.getElementById('mainContent');
  const menuFloat = document.querySelector('.menu-float');
  
  if (gate) gate.style.display = 'flex';
  if (mainContent) mainContent.style.display = 'none';
  if (menuFloat) menuFloat.style.display = 'none';
}

// ==========================================
// SEMBUNYIKAN GATE
// ==========================================
function hideGate() {
  const gate = document.getElementById('internalGate');
  const mainContent = document.getElementById('mainContent');
  const menuFloat = document.querySelector('.menu-float');
  
  if (gate) gate.style.display = 'none';
  if (mainContent) mainContent.style.display = 'flex';
  if (menuFloat) menuFloat.style.display = 'flex';
  
  // Build menu setelah gate terbuka
  if (typeof buildMenu === 'function') {
    console.log('🎨 Build menu setelah gate terbuka');
    buildMenu();
  }
}

// ==========================================
// SUBMIT KODE AKSES
// ==========================================
async function submitGate() {
  const input = document.getElementById('gateCodeInput');
  const messageEl = document.getElementById('gateMessage');
  const btn = document.getElementById('gateSubmitBtn');
  
  if (!input || !messageEl || !btn) return;
  
  const code = input.value.trim();
  
  // Validasi
  if (!code || code.length < 3) {
    showGateMessage('Masukkan kode akses (minimal 3 karakter)', true);
    return;
  }
  
  // Disable button
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMVERIFIKASI...';
  showGateMessage('');
  
  console.log('📡 Verifikasi kode akses:', code);
  
  try {
    const url = `${UM_CONFIG.GAS5_URL}?action=checkAccessCode&code=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 Response:', data);
    
    if (data.success) {
      // Sukses → simpan UID member
      saveMemberIdentity(data.uid);
      showGateMessage('✅ Verifikasi berhasil!', false, true);
      
      setTimeout(() => {
        hideGate();
        if (typeof navigateToPage === 'function') {
          navigateToPage('laporan');
        }
      }, 800);
      
    } else {
      // Gagal
      showGateMessage(data.message || 'Kode akses salah', true);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-shield-alt"></i> VERIFIKASI';
    }
    
  } catch (e) {
    console.error('❌ Error submit gate:', e);
    showGateMessage('Koneksi gagal. Coba lagi.', true);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-shield-alt"></i> VERIFIKASI';
  }
}

// ==========================================
// SIMPAN IDENTITY MEMBER
// ==========================================
function saveMemberIdentity(uid) {
  // Update UID ke M-xxx dari GAS
  localStorage.setItem('u_uid', uid);
  localStorage.setItem('u_class', 'member');
  
  // Update window.myUID (untuk sesi ini)
  if (typeof window !== 'undefined') {
    window.myUID = uid;
  }
  
  // 🎯 IGN KOSONGKAN — user isi manual di web publik
  localStorage.setItem('u_ign', '');
  if (typeof window !== 'undefined') {
    window.myIGN = '';
  }
  
  console.log('✅ Member identity tersimpan:', uid);
  console.log('ℹ️ IGN kosong — user isi di web publik');
}

// ==========================================
// TAMPILKAN PESAN
// ==========================================
function showGateMessage(msg, isError = false, isSuccess = false) {
  const el = document.getElementById('gateMessage');
  if (!el) return;
  
  el.innerText = msg || '';
  el.classList.remove('error', 'success');
  
  if (isError) el.classList.add('error');
  if (isSuccess) el.classList.add('success');
}

// ==========================================
// INIT SAAT LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚪 Gate check dimulai...');
  checkGateStatus();
});

// ==========================================
// ENTER KEY HANDLER
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('gateCodeInput');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitGate();
      }
    });
  }
});

// ==========================================
// EXPOSE
// ==========================================
window.submitGate = submitGate;
window.checkGateStatus = checkGateStatus;
window.loadGateQuestion = loadGateQuestion;

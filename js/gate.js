/**
 * gate.js — Gate Verifikasi Member (Fase 1)
 * 
 * Alur:
 * 1. Cek `u_uid` di localStorage.
 * 2. Kalau ada → fetch GAS 5 checkUidType → tahu tipenya.
 * 3. Kalau member → langsung masuk.
 * 4. Kalau bukan → tampilkan gate.
 * 5. Gate input 6 digit WA → GAS 5 checkMember → return UID M-xxx.
 * 6. Simpan UID + set class member.
 * 
 * DEPENDENSI: config.js (UM_CONFIG)
 */

// ==========================================
// CEK STATUS GATE SAAT LOAD
// ==========================================
// ==========================================
// CEK STATUS GATE SAAT LOAD + VERIFIKASI BACKGROUND
// ==========================================
async function checkGateStatus() {
  const uUid = localStorage.getItem('u_uid') || '';
  
  // 1. Tidak ada UID → tampilkan gate
  if (!uUid) {
    console.log('🔒 Tidak ada UID → tampilkan gate');
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
    showGate();
    return false;
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
// SUBMIT 6 DIGIT WA
// ==========================================
// ==========================================
// 🚨 DARURAT: Submit Gate via Nama Leader (FLAT)
// ==========================================
async function submitGate() {
  const input = document.getElementById('gateWaInput');
  const messageEl = document.getElementById('gateMessage');
  const btn = document.getElementById('gateSubmitBtn');
  
  if (!input || !messageEl || !btn) return;
  
  const leaderName = input.value.trim();
  
  // 🚨 DARURAT: Nama leader flat
  const LEADER_NAME = "Veer'";
  
  // Validasi kosong
  if (!leaderName) {
    showGateMessage('Masukkan nama leader', true);
    return;
  }
  
  // Cek nama leader (case-insensitive)
  if (leaderName.toLowerCase() !== LEADER_NAME.toLowerCase()) {
    showGateMessage('Nama leader salah', true);
    return;
  }
  
  // ✅ Nama cocok → langsung masuk (tanpa GAS)
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMVERIFIKASI...';
  showGateMessage('');
  
  // Generate UID session darurat (M-xxx, format sama seperti GAS)
  const emergencyUid = 'M-' + generateRandomString(9);
  
  // Simpan sebagai member identity
  saveMemberIdentity(emergencyUid);
  showGateMessage('✅ Verifikasi berhasil!', false, true);
  
  setTimeout(() => {
    hideGate();
    if (typeof navigateToPage === 'function') {
      navigateToPage('laporan');
    }
  }, 800);
}

// ==========================================
// 🚨 HELPER: Generate Random String (untuk UID darurat)
// ==========================================
function generateRandomString(length) {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ==========================================
// SUBMIT NOMOR LENGKAP (KALAU KEMBAR)
// ==========================================
async function submitGateFull() {
  const input = document.getElementById('gateWaFullInput');
  const messageEl = document.getElementById('gateMessage');
  const btn = document.getElementById('gateSubmitFullBtn');
  
  if (!input || !messageEl || !btn) return;
  
  const wa = input.value.trim().replace(/\D/g, '');
  
  if (!wa || wa.length < 10) {
    showGateMessage('Masukkan nomor WA lengkap (min 10 digit)', true);
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMVERIFIKASI...';
  showGateMessage('');
  
  console.log('📡 Verifikasi nomor lengkap:', wa);
  
  try {
    // verifyMemberFull = pintu masuk, TIDAK perlu API key
    const url = `${UM_CONFIG.GAS5_URL}?action=verifyMemberFull&wa=${encodeURIComponent(wa)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 Response:', data);
    
    if (data.success) {
      saveMemberIdentity(data.uid);
      showGateMessage('✅ Verifikasi berhasil!', false, true);
      
      setTimeout(() => {
        hideGate();
        if (typeof navigateToPage === 'function') {
          navigateToPage('laporan');
        }
      }, 800);
      
    } else {
      showGateMessage(data.message || 'Verifikasi gagal', true);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-shield-alt"></i> VERIFIKASI';
    }
    
  } catch (e) {
    console.error('❌ Error submit gate full:', e);
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
// TAMPILKAN INPUT NOMOR LENGKAP
// ==========================================
function showFullWaInput() {
  const formNormal = document.getElementById('gateFormNormal');
  const formFull = document.getElementById('gateFormFull');
  
  if (formNormal) formNormal.style.display = 'none';
  if (formFull) formFull.style.display = 'block';
  
  showGateMessage('Nomor kembar terdeteksi. Masukkan nomor lengkap.', true);
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
// EXPOSE
// ==========================================
window.submitGate = submitGate;
window.submitGateFull = submitGateFull;
window.checkGateStatus = checkGateStatus;

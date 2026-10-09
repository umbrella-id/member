/**
 * gate.js — Gate Verifikasi Member (Fase 1)
 * 
 * Tujuan:
 * - Verifikasi member via 6 digit WA.
 * - Set u_class = 'member' (HANYA INI).
 * - Tidak ubah u_uid / u_ign / apapun.
 * 
 * DEPENDENSI: config.js (UM_CONFIG)
 */

// ==========================================
// CEK STATUS GATE SAAT LOAD
// ==========================================
function checkGateStatus() {
  const uClass = localStorage.getItem('u_class');
  
  // 1. Guest (belum pernah gate) → tampilkan gate
  if (uClass !== 'member') {
    console.log('🔒 Belum member → tampilkan gate');
    showGate();
    return false;
  }
  
  // 2. Sudah member → langsung masuk
  console.log('✅ Sudah member → masuk');
  hideGate();
  return true;
}

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
async function submitGate() {
  const input = document.getElementById('gateWaInput');
  const messageEl = document.getElementById('gateMessage');
  const btn = document.getElementById('gateSubmitBtn');
  
  if (!input || !messageEl || !btn) return;
  
  const wa6 = input.value.trim();
  
  // Validasi
  if (!wa6 || wa6.length !== 6 || !/^\d{6}$/.test(wa6)) {
    showGateMessage('Masukkan 6 digit terakhir nomor WA', true);
    return;
  }
  
  // Disable button
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> MEMVERIFIKASI...';
  showGateMessage('');
  
  console.log('📡 Verifikasi 6 digit:', wa6);
  
  try {
    // checkMember = pintu masuk, TIDAK perlu API key
    const url = `${UM_CONFIG.GAS5_URL}?action=checkMember&wa6=${encodeURIComponent(wa6)}`;
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 Response:', data);
    
    if (data.success) {
      // Sukses → set u_class = 'member'
      localStorage.setItem('u_class', 'member');
      console.log('✅ u_class = member tersimpan');
      
      showGateMessage('✅ Verifikasi berhasil!', false, true);
      
      setTimeout(() => {
        hideGate();
        if (typeof navigateToPage === 'function') {
          navigateToPage('laporan');
        }
      }, 800);
      
    } else if (data.requireFull) {
      // Kembar → minta nomor lengkap
      console.log('⚠️ Nomor kembar → minta nomor lengkap');
      showFullWaInput();
      
    } else {
      // Gagal
      showGateMessage(data.message || 'Verifikasi gagal', true);
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
      localStorage.setItem('u_class', 'member');
      console.log('✅ u_class = member tersimpan');
      
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

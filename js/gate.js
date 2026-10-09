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
async function checkGateStatus() {
  const uUid = localStorage.getItem('u_uid') || '';
  
  // 1. Tidak ada UID → tampilkan gate
  if (!uUid) {
    console.log('🔒 Tidak ada UID → tampilkan gate');
    showGate();
    return false;
  }
  
  // 2. Ada UID → cek tipe ke GAS 5
  console.log('🔍 Cek tipe UID:', uUid);
  
  try {
    const url = buildGas5Url('checkUidType', { uid: uUid });
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 GAS 5 response:', data);
    
    if (data.success && data.type === 'member') {
      // Member → langsung masuk
      console.log('✅ Tipe member → masuk');
      hideGate();
      return true;
    } else if (data.success && data.type === 'admin') {
      // Admin (login web admin) → juga bisa akses web internal
      console.log('✅ Tipe admin → masuk');
      hideGate();
      return true;
    } else {
      // Guest / UID tidak valid → tampilkan gate
      console.log('🔒 Tipe guest → tampilkan gate');
      showGate();
      return false;
    }
  } catch (e) {
    console.error('❌ Error cek tipe UID:', e);
    // Koneksi gagal → aman: tampilkan gate
    showGate();
    return false;
  }
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
      // Sukses → simpan UID member
      saveMemberIdentity(data.uid);
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
  
  // IGN: kalau belum ada, set random
  const existingIgn = localStorage.getItem('u_ign');
  if (!existingIgn || existingIgn.trim() === '') {
    const randomIgn = 'Member-' + Math.random().toString(36).substring(2, 6);
    localStorage.setItem('u_ign', randomIgn);
    if (typeof window !== 'undefined') {
      window.myIGN = randomIgn;
    }
    console.log('✅ IGN random:', randomIgn);
  }
  
  console.log('✅ Member identity tersimpan:', uid);
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

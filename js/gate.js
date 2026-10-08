/**
 * gate.js — Gate Verifikasi Member (6 Digit WA)
 * 
 * Alur:
 * 1. Cek `umbrella_uid_member` di localStorage
 * 2. Kalau ada → verifikasi ke GAS 5 (checkMemberById)
 * 3. Kalau valid → langsung masuk
 * 4. Kalau tidak ada / tidak valid → tampilkan gate
 * 5. User input 6 digit WA → fetch GAS 5 (checkMember)
 * 6. Sukses → simpan identity + masuk
 * 7. Gagal → tampilkan error
 * 
 * DEPENDENSI: config.js (UM_CONFIG, buildGas5Url)
 */

// ==========================================
// CEK STATUS GATE SAAT LOAD
// ==========================================
async function checkGateStatus() {
  const uidMember = localStorage.getItem('umbrella_uid_member');
  
  // 1. Tidak ada kunci → tampilkan gate
  if (!uidMember) {
    console.log('🔒 Tidak ada umbrella_uid_member → tampilkan gate');
    showGate();
    return false;
  }
  
  // 2. Ada kunci → verifikasi ke GAS 5
  console.log('🔍 Verifikasi UID member:', uidMember);
  
  try {
    const url = buildGas5Url('checkMemberById', { uid: uidMember });
    const res = await fetch(url);
    const data = await res.json();
    
    console.log('📡 GAS 5 response:', data);
    
    if (data.success && data.valid) {
      // Valid → masuk
      console.log('✅ Member valid → masuk');
      hideGate();
      return true;
    } else {
      // Tidak valid → hapus kunci, tampilkan gate
      console.log('❌ Member tidak valid → hapus kunci, tampilkan gate');
      localStorage.removeItem('umbrella_uid_member');
      localStorage.removeItem('u_class');
      showGate();
      return false;
    }
  } catch (e) {
    console.error('❌ Error cek gate:', e);
    // Koneksi gagal → tetap tampilkan gate (aman)
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
  
  // Trigger app init setelah gate terbuka
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
      // Sukses → simpan identity
      saveMemberIdentity(data.uid, data.ign);
      showGateMessage('✅ Verifikasi berhasil!', false, true);
      
      setTimeout(() => {
        hideGate();
        // Load halaman pertama
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
      saveMemberIdentity(data.uid, data.ign);
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
function saveMemberIdentity(uid, ign) {
  localStorage.setItem('u_uid', uid);
  localStorage.setItem('u_ign', ign);
  localStorage.setItem('u_class', 'member');
  localStorage.setItem('umbrella_uid_member', uid);
  localStorage.setItem('umbrella_verified_at', Date.now().toString());
  
  console.log('✅ Member identity tersimpan:', uid, ign);
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
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚪 Gate check dimulai...');
  await checkGateStatus();
});

// ==========================================
// EXPOSE
// ==========================================
window.submitGate = submitGate;
window.submitGateFull = submitGateFull;
window.checkGateStatus = checkGateStatus;

// ==================== KONFIGURASI ====================
// Ganti dengan URL Apps Script Anda setelah deploy
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzzYiVd0aqzdzmohQnBfvZJRdnwyeSNb-75H_pO5Fxh2-S3aU111rdW8w9aQ0306MNR/exec';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// ==================== API CALLS ====================
async function callApi(action, params = {}) {
  const url = new URL(API_BASE_URL);
  url.searchParams.append('action', action);
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== '') {
      url.searchParams.append(key, params[key]);
    }
  });
  
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

// ==================== LOAD MONTHLY TABLE ====================
async function loadMonthly(tahun = currentYear, bulan = currentMonth) {
  const container = document.getElementById('monthlyContent');
  container.innerHTML = '<div class="loading">Memuat data...</div>';
  
  const result = await callApi('getMonthlyTable', { tahun: tahun, bulan: bulan });
  
  if (!result.success) {
    container.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
    return;
  }
  
  if (result.data.length === 0) {
    container.innerHTML = '<div class="loading">✨ Tidak ada member aktif</div>';
    return;
  }
  
  let html = '<div class="scroll-hint">← Geser ke kanan untuk lihat semua →</div>';
  
  // ===== HEADER 2 TINGKAT =====
  html += '<table>';
  
  // Baris 1: Info Kas + Bulan + Tarif
  html += `<thead><tr>`;
  html += `<th colspan="1" style="text-align:left; font-weight:bold; color:#22c55e;">Saldo Kas: ${formatRupiah(result.saldoKas)}</th>`;
  html += `<th colspan="${result.totalMinggu}" style="text-align:center; font-size:1.1rem; color:#f1f5f9; cursor:pointer;" onclick="toggleBulanDropdown(event, ${tahun}, ${bulan})">${result.bulanNama}</th>`;
  html += `<th colspan="2" style="text-align:right; font-weight:bold; color:#94a3b8;">${formatRupiah(result.tarif)} / Minggu</th>`;
  html += `</tr>`;
  
  // Baris 2: Label Kolom
  html += `<tr>`;
  html += `<th style="text-align:left;">IGN</th>`;
  for (const sabtu of result.sabtuList) {
    html += `<th>${sabtu}</th>`;
  }
  html += `<th>Deposit</th>`;
  html += `<th>Estimasi</th>`;
  html += `</tr></thead>`;
  
  // ===== BODY TABEL =====
  html += `<tbody>`;
  
  for (const row of result.data) {
    html += '<tr>';
    html += `<td class="member-col">${escapeHtml(row.ign)}</td>`;
    for (const c of row.centang) {
      html += `<td>${c ? '<span class="centang">✅</span>' : ''}</td>`;
    }
    html += `<td class="deposit">${formatRupiah(row.deposit)}</td>`;
    html += `<td class="estimasi">${row.estimasi}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  
  // ===== DROPDOWN BULAN =====
  html += `<div id="bulanDropdown" class="bulan-dropdown" style="display:none;"></div>`;
  
  container.innerHTML = html;
}

// ==================== DROPDOWN BULAN ====================
function toggleBulanDropdown(event, tahun, bulan) {
  const dropdown = document.getElementById('bulanDropdown');
  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    return;
  }
  
  // Posisi dropdown di bawah nama bulan
  const rect = event.target.getBoundingClientRect();
  dropdown.style.position = 'fixed';
  dropdown.style.top = (rect.bottom + 4) + 'px';
  dropdown.style.left = (rect.left) + 'px';
  dropdown.style.display = 'block';
  dropdown.innerHTML = '';
  
  // Generate 12 bulan terakhir
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bulanNama = getNamaBulan(d.getMonth() + 1);
    const tahunNama = d.getFullYear();
    const isActive = (d.getMonth() + 1 === bulan && d.getFullYear() === tahun);
    
    const item = document.createElement('div');
    item.className = 'item' + (isActive ? ' active' : '');
    item.textContent = `${bulanNama} ${tahunNama}`;
    item.onclick = (function(t, b) {
      return function() {
        currentYear = t;
        currentMonth = b;
        loadMonthly(t, b);
        dropdown.style.display = 'none';
      };
    })(d.getFullYear(), d.getMonth() + 1);
    dropdown.appendChild(item);
  }
}

function getNamaBulan(bulan) {
  const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return nama[bulan - 1];
}

// ==================== HELPERS ====================
function formatRupiah(angka) {
  if (angka === 0 || !angka) return 'Rp0';
  return 'Rp' + angka.toLocaleString('id-ID');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
  loadMonthly();
  
  // Close dropdown on click outside
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('bulanDropdown');
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.bulan')) {
      dropdown.style.display = 'none';
    }
  });
});

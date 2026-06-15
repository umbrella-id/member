// ==================== KONFIGURASI ====================
// Ganti dengan URL Apps Script Anda setelah deploy
const API_BASE_URL = 'https://script.google.com/macros/s/REPLACE_THIS_WITH_YOUR_SCRIPT_ID/exec';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let currentTab = 'monthly';

// ==================== INITIALIZATION ====================
function initYearSelect() {
  const select = document.getElementById('tahunFilter');
  const year = new Date().getFullYear();
  select.innerHTML = '';
  for (let y = year - 2; y <= year + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    select.appendChild(option);
  }
}

function initMonthSelect() {
  const select = document.getElementById('bulanFilter');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  select.innerHTML = '';
  months.forEach((m, i) => {
    const option = document.createElement('option');
    option.value = i + 1;
    option.textContent = m;
    if (i + 1 === currentMonth) option.selected = true;
    select.appendChild(option);
  });
}

// ==================== EVENT HANDLERS ====================
function changeYear() {
  currentYear = parseInt(document.getElementById('tahunFilter').value);
  if (currentTab === 'monthly') loadMonthly();
  else loadHistory();
}

function changeMonth() {
  currentMonth = parseInt(document.getElementById('bulanFilter').value);
  if (currentTab === 'monthly') loadMonthly();
  else loadHistory();
}

function filterHistory() {
  loadHistory();
}

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
  currentTab = tab;
  const monthlyTab = document.getElementById('monthlyTab');
  const historyTab = document.getElementById('historyTab');
  const ignFilterGroup = document.getElementById('ignFilterGroup');
  
  if (tab === 'monthly') {
    monthlyTab.style.display = 'block';
    historyTab.style.display = 'none';
    ignFilterGroup.style.display = 'none';
    loadMonthly();
  } else {
    monthlyTab.style.display = 'none';
    historyTab.style.display = 'block';
    ignFilterGroup.style.display = 'flex';
    loadHistory();
  }
  
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
}

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
async function loadMonthly() {
  const container = document.getElementById('monthlyContent');
  container.innerHTML = '<div class="loading">Memuat data tabel bulanan...</div>';
  
  const result = await callApi('getMonthlyTable', { tahun: currentYear, bulan: currentMonth });
  
  if (!result.success) {
    container.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
    return;
  }
  
  if (result.data.length === 0) {
    container.innerHTML = '<div class="loading">✨ Tidak ada member aktif</div>';
    return;
  }
  
  let html = '<div class="scroll-hint">← Geser ke kanan untuk lihat semua kolom →</div>';
  html += '</table><thead>';
  html += '<tr><th class="member-col">IGN</th>';
  for (const sabtu of result.sabtuList) {
    html += `<th>${sabtu}</th>`;
  }
  html += '<th>Deposit</th><th>Estimasi</th>';
  html += '</thead><tbody>';
  
  for (const row of result.data) {
    html += '<tr>';
    html += `<td class="member-col">${escapeHtml(row.ign)}</td>`;
    for (const c of row.centang) {
      html += `<td>${c ? '<span class="centang">✅</span>' : '<span class="kosong">-</span>'}</td>`;
    }
    html += `<td class="deposit">${formatRupiah(row.deposit)}</td>`;
    html += `<td class="estimasi">${row.estimasi}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody>赶';
  container.innerHTML = html;
}

// ==================== LOAD HISTORY ====================
async function loadHistory() {
  const container = document.getElementById('historyContent');
  container.innerHTML = '<div class="loading">Memuat history kas...</div>';
  
  const ignFilter = document.getElementById('ignFilter').value;
  const result = await callApi('getHistoryKas', { 
    tahun: currentYear, 
    bulan: currentMonth, 
    ignFilter: ignFilter 
  });
  
  if (!result.success) {
    container.innerHTML = `<div class="error">❌ Error: ${result.error}</div>`;
    return;
  }
  
  if (result.data.length === 0) {
    container.innerHTML = '<div class="loading">📭 Tidak ada transaksi</div>';
    return;
  }
  
  let html = ' <thead>';
  html += '<tr><th>Tanggal</th><th>IGN</th><th>Nominal</th><th>Keterangan</th><th>Bendahara</th></tr>';
  html += '</thead><tbody>';
  
  for (const tx of result.data) {
    const nominalClass = tx.spina > 0 ? 'positive' : 'negative';
    const nominal = tx.spina > 0 ? `+${formatRupiah(tx.spina)}` : formatRupiah(tx.spina);
    html += '<tr>';
    html += `<td>${formatDate(tx.date)}</td>`;
    html += `<td>${escapeHtml(tx.ign)}</td>`;
    html += `<td class="${nominalClass}">${nominal}</td>`;
    html += `<td>${escapeHtml(tx.notes || '-')}</td>`;
    html += `<td>${escapeHtml(tx.adm || '-')}</td>`;
    html += '</tr>';
  }
  
  html += '</tbody><tr>';
  container.innerHTML = html;
}

// ==================== HELPER FUNCTIONS ====================
function formatRupiah(angka) {
  if (angka === 0 || !angka) return 'Rp0';
  return 'Rp' + angka.toLocaleString('id-ID');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
  initYearSelect();
  initMonthSelect();
  loadMonthly();
  
  document.getElementById('tahunFilter').addEventListener('change', changeYear);
  document.getElementById('bulanFilter').addEventListener('change', changeMonth);
  document.getElementById('ignFilter').addEventListener('keyup', filterHistory);
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

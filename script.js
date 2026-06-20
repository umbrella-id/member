// ==================== KONFIGURASI ====================
const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec';
const CACHE_KEY = 'kas_data';
const CACHE_KEY_HISTORY = 'kas_history';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 jam (cache bisa lebih lama karena selalu diupdate)
const START_YEAR = 2025;
const START_MONTH = 6;

// ==================== STATE ====================
let currentTahun = new Date().getFullYear();
let currentBulan = new Date().getMonth() + 1;
let availableMonths = [];
let allHistoryData = [];
let historyLoaded = false;
let isFetching = false; // Mencegah fetch ganda
let isFetchingHistory = false;

// ==================== DOM REFS ====================
const $ = (id) => document.getElementById(id);
const monthLabel = $('monthLabel');
const prevBtn = $('prevMonth');
const nextBtn = $('nextMonth');
const searchInput = $('searchInput');
const tableHead = $('tableHead');
const tableBody = $('tableBody');
const tableContainer = $('tableContainer');
const skeletonContainer = $('skeletonContainer');
const skeletonBody = $('skeletonBody');
const historySearch = $('historySearch');
const historyBody = $('historyBody');
const historyContainer = $('historyContainer');
const loadingHistory = $('loadingHistory');

// ==================== CACHE ====================
function getCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_KEY + '_' + key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        // Cache tetap valid, tidak perlu cek expiry untuk load
        // Tapi kita tetap simpan timestamp untuk info
        return data.value;
    } catch (e) { return null; }
}

function setCache(key, value) {
    try {
        localStorage.setItem(CACHE_KEY + '_' + key, JSON.stringify({
            timestamp: Date.now(),
            value: value
        }));
    } catch (e) { /* ignore */ }
}

// ==================== CACHE HISTORY ====================
function getHistoryCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY_HISTORY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.value;
    } catch (e) { return null; }
}

function setHistoryCache(value) {
    try {
        localStorage.setItem(CACHE_KEY_HISTORY, JSON.stringify({
            timestamp: Date.now(),
            value: value
        }));
    } catch (e) { /* ignore */ }
}

// ==================== GENERATE MONTHS ====================
function generateMonthList() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const months = [];
    let year = START_YEAR;
    let month = START_MONTH;

    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
        months.push({
            tahun: year,
            bulan: month,
            label: getNamaBulan(month) + ' ' + year
        });
        month++;
        if (month > 12) { month = 1;
            year++; }
    }
    return months;
}

// ==================== SKELETON ====================
function showSkeleton(count) {
    count = count || 30;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += '<tr class="skeleton-row">';
        html += '<td></td><td></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="centang-cell"></td>';
        html += '<td class="deposit"></td>';
        html += '<td class="estimasi"></td>';
        html += '</tr>';
    }
    skeletonBody.innerHTML = html;
    skeletonContainer.style.display = 'block';
    tableContainer.style.display = 'none';
}

function hideSkeleton() {
    skeletonContainer.style.display = 'none';
}

// ==================== FORMAT SPINA ====================
function formatSpina(angka) {
    if (angka === undefined || angka === null) return '0 S';
    return Math.round(angka).toLocaleString('id-ID') + ' S';
}

function formatSpinaRaw(angka) {
    if (angka === undefined || angka === null) return '0';
    return Math.round(angka).toLocaleString('id-ID');
}

// ==================== MENU (FLOATING) ====================
const menuToggle = $('menuToggle');
const menuOverlay = $('menuOverlay');
const menuPanel = $('menuPanel');
const menuClose = $('menuClose');

function toggleMenu(open) {
    menuOverlay.classList.toggle('open', open);
    menuPanel.classList.toggle('open', open);
}
menuToggle.addEventListener('click', () => toggleMenu(true));
menuClose.addEventListener('click', () => toggleMenu(false));
menuOverlay.addEventListener('click', () => toggleMenu(false));

// ==================== FLOATING MENU NAVIGATION ====================
document.querySelectorAll('.menu-panel ul li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-panel ul li').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        const page = this.dataset.page;
        toggleMenu(false);

        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.querySelector('.header-kas').style.display = 'flex';

        if (page === 'segera') {
            document.querySelector('.header-kas').style.display = 'none';
            document.querySelector('.tab-selector').style.display = 'none';
            document.querySelector('.dual-panel').style.display = 'none';
            $('pageSegera').classList.add('active');
        } else {
            document.querySelector('.header-kas').style.display = 'flex';
            document.querySelector('.dual-panel').style.display = 'grid';
            if (window.innerWidth < 900) {
                document.querySelector('.tab-selector').style.display = 'flex';
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                $('panelKas').classList.add('active');
            } else {
                document.querySelector('.tab-selector').style.display = 'none';
                document.querySelectorAll('.panel').forEach(p => p.classList.add('active'));
                if (!historyLoaded && allHistoryData.length === 0) {
                    loadHistory();
                } else if (allHistoryData.length > 0) {
                    renderHistory(allHistoryData);
                    loadingHistory.style.display = 'none';
                    historyContainer.style.display = 'block';
                }
            }
        }
    });
});

// ==================== TAB SELECTOR (layar kecil) ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const target = this.dataset.tab;

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        if (target === 'kas') {
            $('panelKas').classList.add('active');
        } else if (target === 'history') {
            $('panelHistory').classList.add('active');
            if (allHistoryData.length > 0) {
                renderHistory(allHistoryData);
                loadingHistory.style.display = 'none';
                historyContainer.style.display = 'block';
            } else {
                loadHistory();
            }
        }
    });
});

// ==================== WINDOW RESIZE ====================
window.addEventListener('resize', function() {
    const isWide = window.innerWidth >= 900;
    const tabSelector = document.querySelector('.tab-selector');
    const panels = document.querySelectorAll('.panel');

    if (isWide) {
        tabSelector.style.display = 'none';
        panels.forEach(p => p.classList.add('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
        if (!historyLoaded && allHistoryData.length === 0) {
            loadHistory();
        } else if (allHistoryData.length > 0) {
            renderHistory(allHistoryData);
            loadingHistory.style.display = 'none';
            historyContainer.style.display = 'block';
        }
    } else {
        tabSelector.style.display = 'flex';
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab) {
            const target = activeTab.dataset.tab;
            panels.forEach(p => p.classList.remove('active'));
            if (target === 'kas') {
                $('panelKas').classList.add('active');
            } else if (target === 'history') {
                $('panelHistory').classList.add('active');
                if (!historyLoaded && allHistoryData.length === 0) {
                    loadHistory();
                } else if (allHistoryData.length > 0) {
                    renderHistory(allHistoryData);
                    loadingHistory.style.display = 'none';
                    historyContainer.style.display = 'block';
                }
            }
        }
    }
});

// ==================== RENDER TABLE ====================
function renderTable(data) {
    const totalMinggu = data.totalMinggu || 0;
    const sabtuList = data.sabtuList || [];

    let headerHtml = '<tr><th>#</th><th>IGN</th>';
    for (let i = 0; i < totalMinggu; i++) {
        const tgl = sabtuList[i] || '';
        headerHtml += '<th class="centang-header">' + tgl + '</th>';
    }
    headerHtml += '<th class="deposit-header">Deposit</th><th class="estimasi-header">Estimasi</th></tr>';
    tableHead.innerHTML = headerHtml;

    let bodyHtml = '';
    let index = 1;
    const members = data.data || [];

    for (const member of members) {
        const centang = member.centang || [];
        const deposit = member.deposit || 0;
        const tarif = data.tarif || 0;

        let estimasi = '-';
        if (deposit > 0 && tarif > 0) {
            const mingguTambahan = Math.floor(deposit / tarif);
            if (mingguTambahan > 0 && sabtuList.length > 0) {
                const lastSabtu = new Date(currentTahun, currentBulan - 1, sabtuList[sabtuList.length - 1]);
                lastSabtu.setDate(lastSabtu.getDate() + (mingguTambahan * 7));
                estimasi = formatTanggalEstimasi(lastSabtu);
            } else {
                estimasi = 's/d akhir bulan';
            }
        }

        bodyHtml += '<tr>';
        bodyHtml += '<td style="color:#5a6488;">' + (index++) + '</td>';
        bodyHtml += '<td class="ign">' + (member.ign || '-') + '</td>';

        for (let i = 0; i < totalMinggu; i++) {
            const status = centang[i];
            let icon = '';
            let cls = 'empty';
            if (status === true) {
                icon = '<i class="fas fa-check-circle"></i>';
                cls = 'paid';
            } else if (status === false) {
                icon = '<i class="fas fa-times-circle"></i>';
                cls = 'unpaid';
            } else {
                icon = '—';
                cls = 'empty';
            }
            bodyHtml += '<td class="centang-cell"><span class="' + cls + '">' + icon + '</span></td>';
        }

        bodyHtml += '<td class="deposit">' + formatSpina(deposit) + '</td>';
        bodyHtml += '<td class="estimasi">' + estimasi + '</td>';
        bodyHtml += '</tr>';
    }

    tableBody.innerHTML = bodyHtml;
    tableContainer.style.display = 'block';
    hideSkeleton();
    applySearch();
}

// ==================== UPDATE HEADER ====================
function updateHeader(data) {
    if (data.saldoKas !== undefined) {
        $('totalKasHeader').textContent = formatSpina(data.saldoKas);
    }
    if (data.tarif) {
        $('tarifHeader').textContent = Math.round(data.tarif).toLocaleString('id-ID') + ' S';
    }
    if (data.bendahara && data.bendahara.length > 0) {
        let html = '';
        for (const b of data.bendahara) {
            html += '<span>' + b.nama + ': <span class="saldo">' + formatSpina(b.saldo) + '</span></span>';
        }
        $('bendaharaList').innerHTML = html;
    } else {
        $('bendaharaList').innerHTML = '<span>-</span>';
    }
}

// ==================== HISTORY ====================
async function loadHistory() {
    if (isFetchingHistory) return;
    isFetchingHistory = true;

    // Load dari cache dulu
    const cachedHistory = getHistoryCache();
    if (cachedHistory) {
        console.log('✅ Load history dari cache');
        allHistoryData = cachedHistory;
        historyLoaded = true;
        renderHistory(allHistoryData);
        loadingHistory.style.display = 'none';
        historyContainer.style.display = 'block';
    } else {
        loadingHistory.style.display = 'block';
        historyContainer.style.display = 'none';
    }

    // Fetch data baru di background
    try {
        const res = await fetch(BASE_URL + '?action=getHistory&limit=100');
        const data = await res.json();
        if (data.success && data.data) {
            allHistoryData = data.data;
            historyLoaded = true;
            setHistoryCache(allHistoryData);
            console.log('✅ History updated from server');
            // Render ulang dengan data baru
            renderHistory(allHistoryData);
            loadingHistory.style.display = 'none';
            historyContainer.style.display = 'block';
        }
    } catch (e) {
        console.warn('Gagal fetch history:', e);
        if (!cachedHistory) {
            loadingHistory.style.display = 'none';
            historyBody.innerHTML =
                '<tr><td colspan="5" style="text-align:center;padding:20px;color:#f44336;">❌ Gagal memuat history</td></tr>';
            historyContainer.style.display = 'block';
        }
    }
    isFetchingHistory = false;
}

// ==================== RENDER HISTORY ====================
function renderHistory(data) {
    let html = '';
    for (const item of data) {
        const date = new Date(item.date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateStr = String(date.getDate()).padStart(2, '0') + '-' + 
                        months[date.getMonth()] + '-' + 
                        String(date.getFullYear()).slice(-2);
        
        const spina = item.spina || 0;
        const spinaClass = spina >= 0 ? 'spina-positive' : 'spina-negative';
        const spinaFormatted = (spina >= 0 ? '+' : '') + formatSpinaRaw(spina) + ' S';
        
        html += '<tr>';
        html += '<td class="col-date">' + dateStr + '</td>';
        html += '<td class="col-ign">' + (item.ign || '-') + '</td>';
        html += '<td class="col-amount ' + spinaClass + '">' + spinaFormatted + '</td>';
        html += '<td class="col-notes">' + (item.notes || '-') + '</td>';
        html += '<td class="col-admin">' + (item.adm || '-') + '</td>';
        html += '</tr>';
    }
    historyBody.innerHTML = html ||
        '<tr><td colspan="5" style="text-align:center;padding:20px;color:#5a6488;">📭 Tidak ada data</td></tr>';
    historyContainer.style.display = 'block';
    loadingHistory.style.display = 'none';
}

// ==================== SEARCH ====================
function applySearch() {
    const keyword = searchInput.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');
    let visible = 0;
    for (const row of rows) {
        const ignCell = row.querySelector('td.ign');
        if (ignCell) {
            const ign = ignCell.textContent.toLowerCase();
            const match = !keyword || ign.includes(keyword);
            row.style.display = match ? '' : 'none';
            if (match) visible++;
        }
    }
}
searchInput.addEventListener('input', applySearch);

historySearch.addEventListener('input', function() {
    const keyword = this.value.toLowerCase().trim();
    const filtered = allHistoryData.filter(item => {
        const ign = (item.ign || '').toLowerCase();
        return !keyword || ign.includes(keyword);
    });
    renderHistory(filtered);
});

// ==================== NAVIGASI ====================
function updateNavButtons() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    prevBtn.disabled = (idx <= 0);
    nextBtn.disabled = (idx >= availableMonths.length - 1 || idx === -1);
}

prevBtn.addEventListener('click', function() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx > 0) {
        currentTahun = availableMonths[idx - 1].tahun;
        currentBulan = availableMonths[idx - 1].bulan;
        monthLabel.textContent = availableMonths[idx - 1].label;
        loadData();
    }
});

nextBtn.addEventListener('click', function() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx < availableMonths.length - 1 && idx !== -1) {
        currentTahun = availableMonths[idx + 1].tahun;
        currentBulan = availableMonths[idx + 1].bulan;
        monthLabel.textContent = availableMonths[idx + 1].label;
        loadData();
    }
});

// ==================== LOAD DATA (CACHE FIRST, THEN UPDATE) ====================
async function loadData() {
    const key = currentTahun + '-' + currentBulan;
    
    // Cek cache
    const cached = getCache(key);
    
    if (cached) {
        console.log('✅ Load dari cache untuk ' + key);
        renderTable(cached);
        updateHeader(cached);
        monthLabel.textContent = cached.bulanNama || (currentBulan + '/' + currentTahun);
        updateNavButtons();
        hideSkeleton();
    } else {
        // Tidak ada cache, tampilkan skeleton
        showSkeleton(30);
    }

    // Fetch data baru di background (stale-while-revalidate)
    if (!isFetching) {
        isFetching = true;
        try {
            const url = BASE_URL + '?action=getMonthlyTable&tahun=' + currentTahun + '&bulan=' + currentBulan;
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            if (data.success) {
                // Update cache dengan data baru
                setCache(key, data);
                console.log('✅ Data updated from server untuk ' + key);
                
                // Render ulang dengan data baru
                renderTable(data);
                updateHeader(data);
                monthLabel.textContent = data.bulanNama || (currentBulan + '/' + currentTahun);
                updateNavButtons();
                hideSkeleton();
            } else {
                if (!cached) {
                    showError(data.error || 'Gagal memuat data');
                }
            }
        } catch (e) {
            console.error('Error fetch data:', e);
            if (!cached) {
                showError('Error: ' + e.message);
            }
        }
        isFetching = false;
    }

    // Load history di background
    if (!historyLoaded) {
        const cachedHistory = getHistoryCache();
        if (cachedHistory) {
            allHistoryData = cachedHistory;
            historyLoaded = true;
            if (document.querySelector('.panel-history.active') || window.innerWidth >= 900) {
                renderHistory(allHistoryData);
                loadingHistory.style.display = 'none';
                historyContainer.style.display = 'block';
            }
        }
        // Fetch history di background
        setTimeout(() => {
            if (!isFetchingHistory) {
                fetch(BASE_URL + '?action=getHistory&limit=100')
                    .then(r => r.json())
                    .then(data => {
                        if (data.success && data.data) {
                            allHistoryData = data.data;
                            historyLoaded = true;
                            setHistoryCache(allHistoryData);
                            console.log('✅ History updated from server');
                            if (document.querySelector('.panel-history.active') || window.innerWidth >= 900) {
                                renderHistory(allHistoryData);
                                loadingHistory.style.display = 'none';
                                historyContainer.style.display = 'block';
                            }
                        }
                    }).catch(() => {});
            }
        }, 500);
    }
}

// ==================== UTILITY ====================
function formatTanggalEstimasi(date) {
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear();
}

function showError(msg) {
    tableContainer.style.display = 'block';
    tableHead.innerHTML = '';
    tableBody.innerHTML =
        '<tr><td colspan="10" style="text-align:center;padding:30px;color:#f44336;">❌ ' + msg + '</td></tr>';
    hideSkeleton();
}

function getNamaBulan(bulan) {
    const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober',
        'November', 'Desember'
    ];
    return nama[bulan - 1] || bulan;
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    availableMonths = generateMonthList();
    const last = availableMonths[availableMonths.length - 1];
    currentTahun = last.tahun;
    currentBulan = last.bulan;
    monthLabel.textContent = last.label;
    updateNavButtons();

    const isWide = window.innerWidth >= 900;
    if (isWide) {
        document.querySelectorAll('.panel').forEach(p => p.classList.add('active'));
    } else {
        document.querySelector('.tab-selector').style.display = 'flex';
        document.querySelector('.tab-btn[data-tab="kas"]').classList.add('active');
        $('panelKas').classList.add('active');
    }

    // Load data dengan logika cache first
    loadData();
});

// ==================== FORCE REFRESH ====================
window.forceRefresh = function() {
    const key = currentTahun + '-' + currentBulan;
    localStorage.removeItem(CACHE_KEY + '_' + key);
    localStorage.removeItem(CACHE_KEY_HISTORY);
    console.log('🗑️ Cache cleared, reloading...');
    loadData();
};

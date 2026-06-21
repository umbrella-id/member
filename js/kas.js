// ==================== KONFIGURASI ====================
const BASE_URL = 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec';
const CACHE_KEY = 'kas_data';
const CACHE_KEY_HISTORY = 'kas_history';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const START_YEAR = 2025;
const START_MONTH = 6;

// ==================== STATE ====================
let currentTahun = new Date().getFullYear();
let currentBulan = new Date().getMonth() + 1;
let availableMonths = [];
let allHistoryData = [];
let historyLoaded = false;
let isFetching = false;
let isFetchingHistory = false;
let historyRendered = false;
let isNavigating = false;

// ==================== CACHE FUNCTIONS ====================
function getCache(key) {
    try {
        const raw = localStorage.getItem(CACHE_KEY + '_' + key);
        if (!raw) return null;
        const data = JSON.parse(raw);
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
        if (month > 12) { month = 1; year++; }
    }
    return months;
}

function getNamaBulan(bulan) {
    const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober',
        'November', 'Desember'
    ];
    return nama[bulan - 1] || bulan;
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

// ==================== UPDATE MONTH LABEL ====================
function updateMonthLabel(data) {
    if (!monthLabel) return;
    if (data && data.bulanNama) {
        monthLabel.textContent = data.bulanNama;
        return;
    }
    if (currentTahun && currentBulan) {
        monthLabel.textContent = getNamaBulan(currentBulan) + ' ' + currentTahun;
    }
}

// ==================== RENDER HTML LAPORAN ====================
function renderLaporan() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const isWide = window.innerWidth >= 900;

    let html = `
        <div class="header-kas" id="headerKas">
            <div class="saldo-utama">
                <span class="total" id="totalKasHeader">0 S</span>
                <span class="tarif"><span id="tarifHeader">0 S</span>/minggu</span>
            </div>
            <div class="bendahara-list" id="bendaharaList"></div>
        </div>

        <div class="tab-selector" id="tabSelector">
            <button class="tab-btn active" data-tab="kas"><i class="fas fa-file-invoice"></i> Laporan Kas</button>
            <button class="tab-btn" data-tab="history"><i class="fas fa-history"></i> History</button>
        </div>

        <div class="dual-panel" id="dualPanel">
            <div class="panel panel-kas" id="panelKas">
                <div class="panel-header">
                    <span><i class="fas fa-file-invoice"></i> Laporan Kas</span>
                </div>
                <div class="month-nav">
                    <div class="nav-group">
                        <button class="nav-btn" id="prevMonth"><i class="fas fa-chevron-left"></i></button>
                        <span class="month-label" id="monthLabel">${getNamaBulan(currentBulan)} ${currentTahun}</span>
                        <button class="nav-btn" id="nextMonth"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="search-box">
                        <input type="text" id="searchInput" placeholder="🔎 Cari member..." />
                    </div>
                </div>
                <div class="table-wrap">
                    <div id="skeletonContainer">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th><th>IGN</th>
                                    <th class="centang-header">6</th>
                                    <th class="centang-header">13</th>
                                    <th class="centang-header">20</th>
                                    <th class="centang-header">27</th>
                                    <th class="deposit-header">Deposit</th>
                                    <th class="estimasi-header">Estimasi</th>
                                </tr>
                            </thead>
                            <tbody id="skeletonBody"></tbody>
                        </table>
                    </div>
                    <div id="tableContainer" style="display:none;">
                        <table>
                            <thead id="tableHead"></thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="panel panel-history" id="panelHistory">
                <div class="panel-header">
                    <span><i class="fas fa-history"></i> History</span>
                </div>
                <div class="history-search">
                    <input type="text" id="historySearch" placeholder="🔎 Cari member (IGN)..." />
                </div>
                <div class="history-wrap">
                    <div id="loadingHistory" class="loading-state">
                        <div class="spinner"></div>
                    </div>
                    <div id="historyContainer" style="display:none;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Member</th>
                                    <th class="amount-header">Jumlah</th>
                                    <th>Catatan</th>
                                    <th>Admin</th>
                                </tr>
                            </thead>
                            <tbody id="historyBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    mainContent.innerHTML = html;
    initKasDOM();

    const panelKas = document.getElementById('panelKas');
    const panelHistory = document.getElementById('panelHistory');
    const tabSelector = document.getElementById('tabSelector');

    if (isWide) {
        if (panelKas) { panelKas.style.display = 'flex'; panelKas.classList.add('active'); }
        if (panelHistory) { panelHistory.style.display = 'flex'; panelHistory.classList.add('active'); }
        if (tabSelector) tabSelector.style.display = 'none';
    } else {
        if (panelKas) { panelKas.style.display = 'flex'; panelKas.classList.add('active'); }
        if (panelHistory) { panelHistory.style.display = 'none'; panelHistory.classList.remove('active'); }
        if (tabSelector) tabSelector.style.display = 'flex';
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const kasBtn = document.querySelector('.tab-btn[data-tab="kas"]');
        if (kasBtn) kasBtn.classList.add('active');
    }

    loadData();
}

// ==================== DOM REFS ====================
let monthLabel, prevBtn, nextBtn, searchInput, tableHead, tableBody, tableContainer;
let skeletonContainer, skeletonBody, historySearch, historyBody, historyContainer, loadingHistory;

function initKasDOM() {
    monthLabel = document.getElementById('monthLabel');
    prevBtn = document.getElementById('prevMonth');
    nextBtn = document.getElementById('nextMonth');
    searchInput = document.getElementById('searchInput');
    tableHead = document.getElementById('tableHead');
    tableBody = document.getElementById('tableBody');
    tableContainer = document.getElementById('tableContainer');
    skeletonContainer = document.getElementById('skeletonContainer');
    skeletonBody = document.getElementById('skeletonBody');
    historySearch = document.getElementById('historySearch');
    historyBody = document.getElementById('historyBody');
    historyContainer = document.getElementById('historyContainer');
    loadingHistory = document.getElementById('loadingHistory');

    availableMonths = generateMonthList();
    const last = availableMonths[availableMonths.length - 1];
    currentTahun = last.tahun;
    currentBulan = last.bulan;
    if (monthLabel) monthLabel.textContent = last.label;

    initKasEvents();
    initPopup();
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
    if (skeletonBody) skeletonBody.innerHTML = html;
    if (skeletonContainer) skeletonContainer.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
}

function hideSkeleton() {
    if (skeletonContainer) skeletonContainer.style.display = 'none';
}

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
    if (tableHead) tableHead.innerHTML = headerHtml;

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

    if (tableBody) tableBody.innerHTML = bodyHtml;
    if (tableContainer) tableContainer.style.display = 'block';
    hideSkeleton();
    applySearch();
}

// ==================== UPDATE HEADER ====================
function updateHeader(data) {
    const totalKasHeader = document.getElementById('totalKasHeader');
    const tarifHeader = document.getElementById('tarifHeader');
    const bendaharaList = document.getElementById('bendaharaList');

    if (data.saldoKas !== undefined && totalKasHeader) {
        totalKasHeader.textContent = formatSpina(data.saldoKas);
    }
    if (data.tarif && tarifHeader) {
        tarifHeader.textContent = Math.round(data.tarif).toLocaleString('id-ID') + ' S';
    }
    if (data.bendahara && data.bendahara.length > 0 && bendaharaList) {
        let html = '';
        for (const b of data.bendahara) {
            html += '<span>' + b.nama + ': <span class="saldo">' + formatSpina(b.saldo) + '</span></span>';
        }
        bendaharaList.innerHTML = html;
    } else if (bendaharaList) {
        bendaharaList.innerHTML = '<span>-</span>';
    }
}

// ==================== LOAD DATA ====================
function loadData() {
    const key = currentTahun + '-' + currentBulan;

    const cached = getCache(key);

    if (cached) {
        console.log('✅ DATA KAS: Load dari cache untuk ' + key);
        renderTable(cached);
        updateHeader(cached);
        updateMonthLabel(cached);
        updateNavButtons();
        hideSkeleton();
    } else {
        console.log('⏳ DATA KAS: Tidak ada cache, tampilkan skeleton');
        showSkeleton(30);
        updateMonthLabel(null);
    }

    loadHistory();

    // 🔥 LOAD AWAL: SELALU FETCH UNTUK UPDATE CACHE
    if (!isFetching) {
        isFetching = true;
        const url = BASE_URL + '?action=getMonthlyTable&tahun=' + currentTahun + '&bulan=' + currentBulan;
        fetch(url)
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(data => {
                if (data.success) {
                    setCache(key, data);
                    console.log('🔄 DATA KAS: Update dari server untuk ' + key);
                    renderTable(data);
                    updateHeader(data);
                    updateMonthLabel(data);
                    updateNavButtons();
                    hideSkeleton();
                } else {
                    if (!cached) showError(data.error || 'Gagal memuat data');
                }
                isFetching = false;
            })
            .catch(e => {
                console.error('❌ DATA KAS: Error fetch:', e);
                if (!cached) showError('Error: ' + e.message);
                isFetching = false;
            });
    }
}

// ==================== LOAD DATA NAVIGASI (CACHE FIRST, FETCH ONLY IF NO CACHE) ====================
function loadDataNavigation() {
    const key = currentTahun + '-' + currentBulan;
    const cached = getCache(key);

    if (cached) {
        console.log('✅ NAVIGASI: Load dari cache untuk ' + key);
        renderTable(cached);
        updateHeader(cached);
        updateMonthLabel(cached);
        updateNavButtons();
        hideSkeleton();
        isNavigating = false;
        // TIDAK FETCH - karena navigasi hanya pakai cache
        return;
    }

    // Jika tidak ada cache, fetch data
    console.log('⏳ NAVIGASI: Tidak ada cache untuk ' + key + ', fetch dari server');
    showSkeleton(30);
    
    const url = BASE_URL + '?action=getMonthlyTable&tahun=' + currentTahun + '&bulan=' + currentBulan;
    fetch(url)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
            if (data.success) {
                setCache(key, data);
                console.log('🔄 NAVIGASI: Data dari server untuk ' + key);
                renderTable(data);
                updateHeader(data);
                updateMonthLabel(data);
                updateNavButtons();
                hideSkeleton();
            } else {
                showError(data.error || 'Gagal memuat data');
            }
            isNavigating = false;
        })
        .catch(e => {
            console.error('❌ NAVIGASI: Error fetch:', e);
            showError('Error: ' + e.message);
            isNavigating = false;
        });
}

// ==================== HISTORY ====================
function loadHistory() {
    if (isFetchingHistory) return;
    isFetchingHistory = true;

    const cachedHistory = getHistoryCache();

    if (cachedHistory && cachedHistory.length > 0) {
        console.log('✅ HISTORY: Load dari cache, jumlah:', cachedHistory.length);
        allHistoryData = cachedHistory;
        historyLoaded = true;
        renderHistory(allHistoryData);
        if (loadingHistory) loadingHistory.style.display = 'none';
        if (historyContainer) historyContainer.style.display = 'block';
        historyRendered = true;
    } else {
        console.log('⏳ HISTORY: Tidak ada cache, tampilkan spinner');
        if (loadingHistory) loadingHistory.style.display = 'block';
        if (historyContainer) historyContainer.style.display = 'none';
        historyRendered = false;
    }

    fetch(BASE_URL + '?action=getHistory&limit=100')
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                console.log('🔄 HISTORY: Update dari server, jumlah:', data.data.length);
                allHistoryData = data.data;
                historyLoaded = true;
                setHistoryCache(allHistoryData);
                renderHistory(allHistoryData);
                if (loadingHistory) loadingHistory.style.display = 'none';
                if (historyContainer) historyContainer.style.display = 'block';
                historyRendered = true;
            } else if (!cachedHistory || cachedHistory.length === 0) {
                if (loadingHistory) loadingHistory.style.display = 'none';
                if (historyBody) {
                    historyBody.innerHTML =
                        '<tr><td colspan="5" style="text-align:center;padding:20px;color:#5a6488;">📭 Belum ada transaksi</td></tr>';
                }
                if (historyContainer) historyContainer.style.display = 'block';
                historyRendered = true;
            }
            isFetchingHistory = false;
        })
        .catch(err => {
            console.warn('⚠️ HISTORY: Gagal fetch, pakai cache jika ada', err);
            if (!cachedHistory || cachedHistory.length === 0) {
                if (loadingHistory) loadingHistory.style.display = 'none';
                if (historyBody) {
                    historyBody.innerHTML =
                        '<tr><td colspan="5" style="text-align:center;padding:20px;color:#f44336;">❌ Gagal memuat history</td></tr>';
                }
                if (historyContainer) historyContainer.style.display = 'block';
                historyRendered = true;
            }
            isFetchingHistory = false;
        });
}

// ==================== RENDER HISTORY ====================
function renderHistory(data) {
    if (!data || data.length === 0) {
        if (historyBody) {
            historyBody.innerHTML =
                '<tr><td colspan="5" style="text-align:center;padding:20px;color:#5a6488;">📭 Belum ada transaksi</td></tr>';
        }
        if (historyContainer) historyContainer.style.display = 'block';
        if (loadingHistory) loadingHistory.style.display = 'none';
        return;
    }

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

    if (historyBody) historyBody.innerHTML = html;
    if (historyContainer) historyContainer.style.display = 'block';
    if (loadingHistory) loadingHistory.style.display = 'none';
}

// ==================== POPUP DETAIL ====================
function initPopup() {
    if (!document.getElementById('popupOverlay')) {
        const popupHTML = `
            <div class="popup-overlay" id="popupOverlay">
                <div class="popup-content">
                    <button class="popup-close" id="popupClose"><i class="fas fa-times"></i></button>
                    <div class="popup-title">📝 Detail Transaksi</div>
                    <div class="popup-ign" id="popupIgn">-</div>
                    <hr class="popup-divider" />
                    <div class="popup-row">
                        <span class="label">📅 Tanggal</span>
                        <span class="value" id="popupDate">-</span>
                    </div>
                    <div class="popup-row">
                        <span class="label">💰 Jumlah</span>
                        <span class="value" id="popupAmount">-</span>
                    </div>
                    <div class="popup-row">
                        <span class="label">👤 Admin</span>
                        <span class="value" id="popupAdmin">-</span>
                    </div>
                    <hr class="popup-divider" />
                    <div class="popup-title" style="font-size:11px; margin-bottom:6px;">📋 Catatan</div>
                    <div class="popup-notes" id="popupNotes">-</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    }

    const popupOverlay = document.getElementById('popupOverlay');
    const popupClose = document.getElementById('popupClose');
    const popupIgn = document.getElementById('popupIgn');
    const popupDate = document.getElementById('popupDate');
    const popupAmount = document.getElementById('popupAmount');
    const popupAdmin = document.getElementById('popupAdmin');
    const popupNotes = document.getElementById('popupNotes');
    let popupHistory = [];

    function closePopup() {
        if (popupOverlay) popupOverlay.classList.remove('active');
        if (popupHistory.length > 0) {
            popupHistory.pop();
            if (popupHistory.length === 0) history.replaceState(null, null, ' ');
        }
    }

    function openPopup(item) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const date = new Date(item.date);
        const dateStr = String(date.getDate()).padStart(2, '0') + '-' +
            months[date.getMonth()] + '-' +
            String(date.getFullYear()).slice(-2);

        const spina = item.spina || 0;
        const spinaClass = spina >= 0 ? 'positive' : 'negative';
        const spinaFormatted = (spina >= 0 ? '+' : '') + formatSpinaRaw(spina) + ' S';

        if (popupIgn) popupIgn.textContent = item.ign || '-';
        if (popupDate) popupDate.textContent = dateStr;
        if (popupAmount) {
            popupAmount.textContent = spinaFormatted;
            popupAmount.className = 'value ' + spinaClass;
        }
        if (popupAdmin) popupAdmin.textContent = item.adm || '-';
        if (popupNotes) popupNotes.textContent = item.notes || 'Tidak ada catatan';

        if (popupOverlay) popupOverlay.classList.add('active');
        popupHistory.push('popup');
        history.pushState({ popup: true }, null, '#popup');
    }

    if (popupClose) popupClose.addEventListener('click', closePopup);
    if (popupOverlay) {
        popupOverlay.addEventListener('click', function(e) {
            if (e.target === this) closePopup();
        });
    }

    window.addEventListener('popstate', function(e) {
        if (popupOverlay && popupOverlay.classList.contains('active')) {
            closePopup();
            e.preventDefault();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popupOverlay && popupOverlay.classList.contains('active')) {
            closePopup();
        }
    });

    window.openPopup = openPopup;
    window.closePopup = closePopup;

    document.addEventListener('click', function(e) {
        const row = e.target.closest('#historyBody tr');
        if (row) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 5) {
                const item = {
                    date: cells[0].textContent.trim(),
                    ign: cells[1].textContent.trim(),
                    spina: parseFloat(cells[2].textContent.replace(/[^0-9\-]/g, '')) || 0,
                    notes: cells[3].textContent.trim(),
                    adm: cells[4].textContent.trim()
                };

                const parts = item.date.split('-');
                if (parts.length === 3) {
                    const monthMap = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 };
                    const year = 2000 + parseInt(parts[2]);
                    const month = monthMap[parts[1]] || 0;
                    const day = parseInt(parts[0]);
                    item.date = new Date(year, month, day).toISOString();
                }

                if (window.openPopup) window.openPopup(item);
            }
        }
    });
}

// ==================== SEARCH ====================
function applySearch() {
    if (!searchInput || !tableBody) return;
    const keyword = searchInput.value.toLowerCase().trim();
    const rows = tableBody.querySelectorAll('tr');
    for (const row of rows) {
        const ignCell = row.querySelector('td.ign');
        if (ignCell) {
            const ign = ignCell.textContent.toLowerCase();
            const match = !keyword || ign.includes(keyword);
            row.style.display = match ? '' : 'none';
        }
    }
}

// ==================== NAVIGASI BULAN ====================
function updateNavButtons() {
    if (!prevBtn || !nextBtn) return;
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

// ==================== INIT EVENTS ====================
function initKasEvents() {
    if (searchInput) {
        searchInput.addEventListener('input', applySearch);
    }

    if (historySearch) {
        historySearch.addEventListener('input', function() {
            const keyword = this.value.toLowerCase().trim();
            const filtered = allHistoryData.filter(item => {
                const ign = (item.ign || '').toLowerCase();
                return !keyword || ign.includes(keyword);
            });
            renderHistory(filtered);
        });
    }

    // Tab selector
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            this.classList.add('active');
            const target = this.dataset.tab;

            document.querySelectorAll('.panel').forEach(function(p) {
                p.classList.remove('active');
            });

            if (target === 'kas') {
                const panelKas = document.getElementById('panelKas');
                if (panelKas) {
                    panelKas.style.display = 'flex';
                    panelKas.classList.add('active');
                }
                const panelHistory = document.getElementById('panelHistory');
                if (panelHistory) {
                    panelHistory.style.display = 'none';
                    panelHistory.classList.remove('active');
                }
            } else if (target === 'history') {
                const panelKas2 = document.getElementById('panelKas');
                if (panelKas2) {
                    panelKas2.style.display = 'none';
                    panelKas2.classList.remove('active');
                }
                const panelHistory2 = document.getElementById('panelHistory');
                if (panelHistory2) {
                    panelHistory2.style.display = 'flex';
                    panelHistory2.classList.add('active');
                }
                if (allHistoryData.length > 0) {
                    renderHistory(allHistoryData);
                    if (loadingHistory) loadingHistory.style.display = 'none';
                    if (historyContainer) historyContainer.style.display = 'block';
                } else {
                    loadHistory();
                }
            }
        });
    });

    // Window resize
    window.addEventListener('resize', function() {
        const isWide = window.innerWidth >= 900;
        const tabSelector = document.getElementById('tabSelector');
        const panels = document.querySelectorAll('.panel');
        
        if (isWide) {
            if (tabSelector) tabSelector.style.display = 'none';
            panels.forEach(function(p) {
                p.style.display = 'flex';
                p.classList.add('active');
            });
            if (allHistoryData.length > 0) {
                renderHistory(allHistoryData);
                if (loadingHistory) loadingHistory.style.display = 'none';
                if (historyContainer) historyContainer.style.display = 'block';
            }
        } else {
            if (tabSelector) tabSelector.style.display = 'flex';
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const target = activeTab.dataset.tab;
                panels.forEach(function(p) {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
                if (target === 'kas') {
                    const panelKas3 = document.getElementById('panelKas');
                    if (panelKas3) {
                        panelKas3.style.display = 'flex';
                        panelKas3.classList.add('active');
                    }
                } else if (target === 'history') {
                    const panelHistory3 = document.getElementById('panelHistory');
                    if (panelHistory3) {
                        panelHistory3.style.display = 'flex';
                        panelHistory3.classList.add('active');
                    }
                }
            }
        }
    });

    // 🔥 NAVIGASI BULAN - LOGIKA BARU
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (isNavigating) return;
            isNavigating = true;
            
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
                if (monthLabel) monthLabel.textContent = availableMonths[idx - 1].label;
                // 🔥 PAKAI loadDataNavigation - TIDAK FETCH JIKA ADA CACHE
                loadDataNavigation();
            } else {
                isNavigating = false;
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (isNavigating) return;
            isNavigating = true;
            
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
                if (monthLabel) monthLabel.textContent = availableMonths[idx + 1].label;
                // 🔥 PAKAI loadDataNavigation - TIDAK FETCH JIKA ADA CACHE
                loadDataNavigation();
            } else {
                isNavigating = false;
            }
        });
    }
}

// ==================== UTILITY ====================
function formatTanggalEstimasi(date) {
    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return date.getDate() + ' ' + bulan[date.getMonth()] + ' ' + date.getFullYear();
}

function showError(msg) {
    if (tableContainer) tableContainer.style.display = 'block';
    if (tableHead) tableHead.innerHTML = '';
    if (tableBody) {
        tableBody.innerHTML =
            '<tr><td colspan="10" style="text-align:center;padding:30px;color:#f44336;">❌ ' + msg + '</td></tr>';
    }
    hideSkeleton();
}

// ==================== PRELOAD ====================
function preloadPrevMonth() {
    let idx = -1;
    for (let i = 0; i < availableMonths.length; i++) {
        if (availableMonths[i].tahun === currentTahun && availableMonths[i].bulan === currentBulan) {
            idx = i;
            break;
        }
    }
    if (idx > 0) {
        const prev = availableMonths[idx - 1];
        const key = prev.tahun + '-' + prev.bulan;
        if (!getCache(key)) {
            const url = BASE_URL + '?action=getMonthlyTable&tahun=' + prev.tahun + '&bulan=' + prev.bulan;
            fetch(url).then(r => r.json()).then(data => {
                if (data.success) setCache(key, data);
            }).catch(() => {});
        }
    }
}

// ==================== EXPOSE ====================
window.renderLaporan = renderLaporan;
window.loadData = loadData;
window.loadHistory = loadHistory;
window.renderHistory = renderHistory;
window.allHistoryData = allHistoryData;
window.currentTahun = currentTahun;
window.currentBulan = currentBulan;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(preloadPrevMonth, 500);
});

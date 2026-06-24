// ==================== STATE ====================
var crystaRawData = [];
var isDataLoaded = false;
var currentFilter = 'all';
var searchKeyword = '';
var isRendering = false;

// ==================== KONFIGURASI ====================
var CRYSTA_API_URL = 'https://script.google.com/macros/s/AKfycbzTP1-9KuQ2iz4ffTfhujqkSIQqQxXWMXY-BHljCVU_Zzm0Ept8j4AJUCBHqB-ZSZk/exec?action=getCrysta';
var CRYSTA_CACHE_KEY = 'crysta_data';
var CRYSTA_CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// ==================== TIPE WARNA & LABEL ====================
var TYPE_COLORS = {
    weapon: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444', label: 'Weapon' },
    armor: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#22c55e', label: 'Armor' },
    additional: { bg: 'rgba(234, 179, 8, 0.15)', border: '#eab308', text: '#eab308', label: 'Additional' },
    special: { bg: 'rgba(200, 0, 255, 0.15)', border: '#C800FF', text: '#C800FF', label: 'Special' },
    normal: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6', label: 'Normal' }
};

var TYPE_OPTIONS = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'weapon', label: 'Weapon' },
    { value: 'armor', label: 'Armor' },
    { value: 'additional', label: 'Additional' },
    { value: 'special', label: 'Special' },
    { value: 'normal', label: 'Normal' }
];

// ==================== CACHE ====================
function getCrystaCache() {
    try {
        var raw = localStorage.getItem(CRYSTA_CACHE_KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (Date.now() - data.timestamp > CRYSTA_CACHE_EXPIRY) {
            localStorage.removeItem(CRYSTA_CACHE_KEY);
            return null;
        }
        return data.value;
    } catch (e) { return null; }
}

function setCrystaCache(value) {
    try {
        localStorage.setItem(CRYSTA_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            value: value
        }));
    } catch (e) { /* ignore */ }
}

// ==================== LOAD CRYSTA DATA ====================
function loadCrystaData(callback) {
    console.log('🚀 loadCrystaData() dipanggil');
    
    var cached = getCrystaCache();
    
    if (cached && cached.length > 0) {
        console.log('✅ CRYSTA: Load cache, jumlah:', cached.length);
        crystaRawData = cached;
        isDataLoaded = true;
        renderCrysta();
        if (callback) callback();
    } else {
        console.log('⏳ CRYSTA: Tidak ada cache, tampilkan loading');
        isDataLoaded = false;
        var mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.innerHTML = '<div class="crysta-loading"><div class="spinner"></div><p>Memuat data crysta...</p></div>';
        }
    }
    
    console.log('🌐 Fetching data dari API...');
    fetch(CRYSTA_API_URL)
        .then(function(r) {
            console.log('📡 Response status:', r.status);
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function(data) {
            console.log('📦 Data dari server:', data);
            if (data.success && data.data && data.data.length > 0) {
                console.log('🔄 CRYSTA: Update server, jumlah:', data.data.length);
                crystaRawData = data.data;
                setCrystaCache(crystaRawData);
                isDataLoaded = true;
                renderCrysta();
            } else {
                console.warn('⚠️ CRYSTA: Data dari server kosong atau gagal');
                if (!cached || cached.length === 0) {
                    crystaRawData = [];
                    isDataLoaded = true;
                    renderCrysta();
                    if (callback) callback();
                }
            }
        })
        .catch(function(err) {
            console.error('❌ CRYSTA: Error fetch:', err);
            if (!cached || cached.length === 0) {
                crystaRawData = [];
                isDataLoaded = true;
                renderCrysta();
                if (callback) callback();
            }
        });
}

// ==================== GET MAX NODES ====================
function getMaxNodes() {
    var upgradeTargets = {};
    for (var i = 0; i < crystaRawData.length; i++) {
        var item = crystaRawData[i];
        if (item.upgrade_for && item.upgrade_for !== '-') {
            upgradeTargets[item.upgrade_for] = true;
        }
    }
    
    var maxNodes = [];
    for (var i = 0; i < crystaRawData.length; i++) {
        var item = crystaRawData[i];
        if (!upgradeTargets[item.crysta_name]) {
            maxNodes.push(item);
        }
    }
    return maxNodes;
}

// ==================== GET BASE NODES ====================
function getBaseNodes() {
    var baseNodes = [];
    for (var i = 0; i < crystaRawData.length; i++) {
        var item = crystaRawData[i];
        if (!item.upgrade_for || item.upgrade_for === '-') {
            baseNodes.push(item);
        }
    }
    return baseNodes;
}

// ==================== GET UPGRADE PATH ====================
function getUpgradePath(crystaName) {
    var path = [];
    var current = null;
    
    for (var i = 0; i < crystaRawData.length; i++) {
        if (crystaRawData[i].crysta_name === crystaName) {
            current = crystaRawData[i];
            break;
        }
    }
    if (!current) return path;
    
    while (current) {
        path.push(current);
        if (!current.upgrade_for || current.upgrade_for === '-') {
            break;
        }
        var found = false;
        for (var i = 0; i < crystaRawData.length; i++) {
            if (crystaRawData[i].crysta_name === current.upgrade_for) {
                current = crystaRawData[i];
                found = true;
                break;
            }
        }
        if (!found) break;
    }
    
    return path;
}

// ==================== BUILD CARDS ====================
function buildCards() {
    if (crystaRawData.length === 0) return [];
    
    var upgradeTargets = {};
    for (var i = 0; i < crystaRawData.length; i++) {
        var item = crystaRawData[i];
        if (item.upgrade_for && item.upgrade_for !== '-') {
            upgradeTargets[item.upgrade_for] = true;
        }
    }
    
    var maxNodes = [];
    for (var i = 0; i < crystaRawData.length; i++) {
        var item = crystaRawData[i];
        if (!upgradeTargets[item.crysta_name]) {
            maxNodes.push(item);
        }
    }
    
    var cards = [];
    for (var i = 0; i < maxNodes.length; i++) {
        var maxNode = maxNodes[i];
        var path = [];
        var current = maxNode;
        
        while (current) {
            path.push(current);
            if (!current.upgrade_for || current.upgrade_for === '-') {
                break;
            }
            var found = false;
            for (var j = 0; j < crystaRawData.length; j++) {
                if (crystaRawData[j].crysta_name === current.upgrade_for) {
                    current = crystaRawData[j];
                    found = true;
                    break;
                }
            }
            if (!found) break;
        }
        
        if (path.length === 0) continue;
        
        cards.push({
            header: path[0],
            body: path.slice(1),
            type: path[0].type
        });
    }
    
    return cards;
}

// ==================== IS BASE ====================
function isBaseNode(crystaName) {
    for (var i = 0; i < crystaRawData.length; i++) {
        if (crystaRawData[i].crysta_name === crystaName) {
            return (!crystaRawData[i].upgrade_for || crystaRawData[i].upgrade_for === '-');
        }
    }
    return false;
}

// ==================== RENDER CRYSTA ====================
function renderCrysta() {
    console.log('🎨 renderCrysta() dipanggil, data length:', crystaRawData.length);
    
    if (isRendering) return;
    isRendering = true;
    
    // UPDATE LAST ACTIVE TAB
    if (window.setLastActiveTab) {
        window.setLastActiveTab('crysta');
    }
    if (typeof lastActiveTab !== 'undefined') {
        lastActiveTab = 'crysta';
    }
    if (typeof window.lastActiveTab !== 'undefined') {
        window.lastActiveTab = 'crysta';
    }
    
    var mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        isRendering = false;
        return;
    }

    if (!isDataLoaded || crystaRawData.length === 0) {
        console.log('⏳ Data belum siap, tampilkan loading');
        mainContent.innerHTML = '<div class="crysta-loading"><div class="spinner"></div><p>Memuat data crysta...</p></div>';
        loadCrystaData(function() {
            isRendering = false;
            renderCrysta();
        });
        return;
    }

    var allCards = buildCards();
    console.log('📊 All cards:', allCards.length);
    
    var cards = allCards;
    if (currentFilter !== 'all') {
        var filtered = [];
        for (var i = 0; i < allCards.length; i++) {
            if (allCards[i].type === currentFilter) {
                filtered.push(allCards[i]);
            }
        }
        cards = filtered;
    }
    
    if (searchKeyword) {
        var keyword = searchKeyword.toLowerCase().trim();
        var searched = [];
        for (var i = 0; i < cards.length; i++) {
            var match = false;
            
            if (cards[i].header.crysta_name.toLowerCase().indexOf(keyword) !== -1) {
                match = true;
            }
            
            if (!match) {
                for (var j = 0; j < cards[i].body.length; j++) {
                    if (cards[i].body[j].crysta_name.toLowerCase().indexOf(keyword) !== -1) {
                        match = true;
                        break;
                    }
                }
            }
            
            if (!match) {
                if (cards[i].header.stat && cards[i].header.stat.toLowerCase().indexOf(keyword) !== -1) {
                    match = true;
                }
            }
            
            if (!match) {
                for (var j = 0; j < cards[i].body.length; j++) {
                    if (cards[i].body[j].stat && cards[i].body[j].stat.toLowerCase().indexOf(keyword) !== -1) {
                        match = true;
                        break;
                    }
                }
            }
            
            if (match) {
                searched.push(cards[i]);
            }
        }
        cards = searched;
    }

    var typeOrder = ['weapon', 'armor', 'additional', 'special', 'normal'];
    cards.sort(function(a, b) {
        var indexA = typeOrder.indexOf(a.type);
        var indexB = typeOrder.indexOf(b.type);
        if (indexA !== indexB) return indexA - indexB;
        return a.header.crysta_name.localeCompare(b.header.crysta_name);
    });

    var totalCrysta = 0;
    var maxNodes = getMaxNodes();
    var maxNames = {};
    for (var i = 0; i < maxNodes.length; i++) {
        maxNames[maxNodes[i].crysta_name] = true;
    }
    for (var i = 0; i < crystaRawData.length; i++) {
        if (!maxNames[crystaRawData[i].crysta_name]) {
            totalCrysta++;
        }
    }

    var isFirstRender = (mainContent.innerHTML === '' || mainContent.innerHTML.indexOf('crysta-container') === -1);
    
    if (isFirstRender) {
        var html = '';
        html += '<div class="crysta-container">';
        html += '  <div class="crysta-header">';
        html += '    <h2><span class="crysta-header-icon-wrapper">' + ciHeader() + '</span> Daftar Crysta <br>(Pinjam Dengan Jaminan)</h2>';
        html += '    <div class="crysta-stats">';
        html += '      <span id="crystaTotalStat">Saat ini tersedia ' + totalCrysta + ' Crysta Dasar dengan list sebagai berikut</span>';
        html += '    </div>';
        html += '  </div>';
        
        html += '  <div class="crysta-controls">';
        html += '    <div class="crysta-search">';
        html += '      <input type="text" id="crystaSearchInput" placeholder="🔎 Cari..." value="' + (searchKeyword || '') + '" />';
        html += '    </div>';
        html += '    <div class="crysta-filter-dropdown">';
        html += '      <select id="crystaFilterSelect">';
        for (var i = 0; i < TYPE_OPTIONS.length; i++) {
            var opt = TYPE_OPTIONS[i];
            var selected = (currentFilter === opt.value) ? ' selected' : '';
            html += '        <option value="' + opt.value + '"' + selected + '>' + opt.label + '</option>';
        }
        html += '      </select>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div id="crystaGridContainer" class="crysta-grid-list">';
        html += '  </div>';
        html += '</div>';

        mainContent.innerHTML = html;
        
        var searchInput = document.getElementById('crystaSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchKeyword = this.value;
                renderCrysta();
            });
        }
        
        var filterSelect = document.getElementById('crystaFilterSelect');
        if (filterSelect) {
            filterSelect.addEventListener('change', function() {
                currentFilter = this.value;
                renderCrysta();
            });
        }
    }

    var totalStat = document.getElementById('crystaTotalStat');
    if (totalStat) {
        totalStat.textContent = 'Saat ini tersedia ' + totalCrysta + ' Crysta dasar dengan list sebagai berikut';
    }

    var gridContainer = document.getElementById('crystaGridContainer');
    if (!gridContainer) {
        isRendering = false;
        return;
    }

    var maxBodyLength = 0;
    for (var c = 0; c < cards.length; c++) {
        var bodyLen = cards[c].body.length;
        if (bodyLen > maxBodyLength) {
            maxBodyLength = bodyLen;
        }
    }
    
    var targetRows = Math.max(maxBodyLength, 5);
    var rowHeight = 20;
    var headerHeight = 42;
    var paddingHeight = 14;
    var minCardHeight = headerHeight + paddingHeight + (targetRows * rowHeight);

    var gridHtml = '';

    if (crystaRawData.length === 0) {
        gridHtml += '    <div class="crysta-empty">';
        gridHtml += '      <i class="fas fa-database"></i>';
        gridHtml += '      <p>Belum ada data crysta di database.</p>';
        gridHtml += '    </div>';
    } else if (cards.length === 0) {
        gridHtml += '    <div class="crysta-empty">';
        gridHtml += '      <i class="fas fa-box-open"></i>';
        gridHtml += '      <p>' + (searchKeyword ? 'Tidak ada hasil untuk "' + searchKeyword + '"' : 'Tidak ada crysta yang cocok') + '</p>';
        gridHtml += '    </div>';
    } else {
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c];
            var headerName = card.header.crysta_name;
            var bodyItems = card.body;
            
            var isHeaderBase = isBaseNode(headerName);
            var paddingNeeded = Math.max(0, targetRows - bodyItems.length);
            
            gridHtml += '    <div class="crysta-card" style="min-height:' + minCardHeight + 'px;">';
            gridHtml += '      <div class="crysta-card-header" onclick="openCrystaDetail(\'' + escapeJs(headerName) + '\')">';
            gridHtml += '        <span class="crysta-icon">' + ci(card.type, isHeaderBase, 20) + '</span>';
            gridHtml += '        <span class="crysta-name">' + escapeHtml(headerName) + '</span>';
            gridHtml += '      </div>';
            gridHtml += '      <div class="crysta-card-body">';
            
            for (var b = 0; b < bodyItems.length; b++) {
                var item = bodyItems[b];
                var isItemBase = isBaseNode(item.crysta_name);
                
                gridHtml += '        <div class="crysta-level-item" onclick="openCrystaDetail(\'' + escapeJs(item.crysta_name) + '\')">';
                gridHtml += '          <span class="crysta-level-icon">' + ci(item.type, isItemBase, 14) + '</span>';
                gridHtml += '          <span class="crysta-level-name">' + escapeHtml(item.crysta_name) + '</span>';
                gridHtml += '        </div>';
            }
            
            for (var p = 0; p < paddingNeeded; p++) {
                gridHtml += '        <div class="crysta-level-item" style="visibility:hidden;height:20px;pointer-events:none;">';
                gridHtml += '          <span class="crysta-level-icon" style="visibility:hidden;">&nbsp;</span>';
                gridHtml += '          <span class="crysta-level-name" style="visibility:hidden;">&nbsp;</span>';
                gridHtml += '        </div>';
            }
            
            gridHtml += '      </div>';
            gridHtml += '    </div>';
        }
    }

    gridContainer.innerHTML = gridHtml;
    console.log('✅ renderCrysta() selesai');
    
    isRendering = false;
}

// ==================== OPEN DETAIL POPUP ====================
function openCrystaDetail(crystaName) {
    var item = null;
    for (var i = 0; i < crystaRawData.length; i++) {
        if (crystaRawData[i].crysta_name === crystaName) {
            item = crystaRawData[i];
            break;
        }
    }
    
    if (!item) {
        showToastCrysta('⚠️ Data tidak ditemukan', true);
        return;
    }
    
    var isBase = isBaseNode(crystaName);
    var typeInfo = TYPE_COLORS[item.type] || TYPE_COLORS.normal;
    
    var statLines = item.stat.split('\n');
    var formattedStat = '';
    for (var i = 0; i < statLines.length; i++) {
        var line = statLines[i].trim();
        if (!line) continue;
        
        var hasNegative = false;
        var hasPositive = false;
        
        if (line.match(/-\d+/)) {
            hasNegative = true;
        }
        if (line.match(/\b\d+%?\b/) && !line.match(/-\d+/)) {
            hasPositive = true;
        }
        
        var className = '';
        if (hasNegative && !hasPositive) {
            className = 'stat-negative';
        } else if (hasPositive && !hasNegative) {
            className = 'stat-positive';
        } else if (hasNegative && hasPositive) {
            var parts = line.split(/(-\d+%?)/);
            var newLine = '';
            for (var j = 0; j < parts.length; j++) {
                if (parts[j].match(/^-\d+%?/)) {
                    newLine += '<span class="stat-negative">' + parts[j] + '</span>';
                } else {
                    newLine += parts[j];
                }
            }
            line = newLine;
            className = '';
        } else {
            className = 'stat-neutral';
        }
        
        if (className) {
            formattedStat += '<span class="' + className + '">' + escapeHtml(line) + '</span>\n';
        } else {
            formattedStat += escapeHtml(line) + '\n';
        }
    }
    
    var badgeText = isBase ? 'Crysta Dasar' : 'Crysta Penguat';
    var badgeClass = isBase ? 'crysta-detail-badge-base' : 'crysta-detail-badge';
    
    var popupHTML = '';
    popupHTML += '<div class="crysta-detail-overlay" id="crystaDetailOverlay" onclick="if(event.target===this) closeCrystaDetail()">';
    popupHTML += '  <div class="crysta-detail-content">';
    popupHTML += '    <button class="crysta-detail-close" onclick="closeCrystaDetail()">';
    popupHTML += '      <i class="fas fa-times"></i>';
    popupHTML += '    </button>';
    popupHTML += '    <div class="crysta-detail-header">';
    popupHTML += '      <div class="crysta-detail-icon">' + ci(item.type, isBase, 28) + '</div>';
    popupHTML += '      <div class="crysta-detail-name">' + escapeHtml(item.crysta_name) + '</div>';
    popupHTML += '      <span class="' + badgeClass + '">' + badgeText + '</span>';
    popupHTML += '    </div>';
    popupHTML += '    <div class="crysta-detail-body">';
    popupHTML += '      <div class="crysta-detail-stat">';
    popupHTML += '        <div class="stat-content">' + formattedStat + '</div>';
    popupHTML += '      </div>';
    popupHTML += '    </div>';
    popupHTML += '  </div>';
    popupHTML += '</div>';
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

function closeCrystaDetail() {
    var overlay = document.getElementById('crystaDetailOverlay');
    if (overlay) overlay.remove();
}

// ==================== TOAST ====================
function showToastCrysta(msg, isError) {
    var toast = document.getElementById('toastMessage');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.borderColor = isError ? '#ff4444' : '#a855f7';
    toast.classList.add('show');
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== UTILITY ====================
function escapeHtml(text) {
    if (!text || text === '') return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJs(text) {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ==================== EXPOSE ====================
window.renderCrysta = renderCrysta;
window.openCrystaDetail = openCrystaDetail;
window.closeCrystaDetail = closeCrystaDetail;
window.loadCrystaData = loadCrystaData;

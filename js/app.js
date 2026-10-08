// ==================== MENU ====================
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');
const menuPanel = document.getElementById('menuPanel');
const menuClose = document.getElementById('menuClose');

// ==================== STATE ====================
let lastActiveTab = 'laporan';
let isSaranPopupOpen = false;
let isDetailPopupOpen = false;
let isCrystaPopupOpen = false;

// ==================== BUILD MENU ====================
function buildMenu() {
    const ul = document.querySelector('.menu-panel ul');
    if (!ul) return;
    
    const eventAvailable = window.isEventAvailable || false;
    
    let html = '';
    
    if (eventAvailable) {
        html += `
            <li class="active" data-page="event">
                <i class="fas fa-calendar-alt"></i> Event
            </li>
        `;
    }
    
    html += `
        <li ${!eventAvailable ? 'class="active"' : ''} data-page="laporan">
            <i class="fas fa-file-invoice"></i> Laporan Kas
        </li>
    `;
    
    html += `
        <li data-page="crysta">
            <span class="menu-icon-wrapper"></span>
            Daftar Crysta
        </li>
    `;
    
    html += `
        <li data-page="saran">
            <i class="fas fa-envelope"></i> Kotak Saran
        </li>
    `;
    
    ul.innerHTML = html;
    
    const crystalLi = ul.querySelector('li[data-page="crysta"]');
    if (crystalLi && typeof ciMenu !== 'undefined') {
        const iconWrapper = crystalLi.querySelector('.menu-icon-wrapper');
        if (iconWrapper) {
            iconWrapper.innerHTML = ciMenu();
        }
    }
    
    attachMenuEvents();
    
    let defaultPage = 'laporan';
    if (eventAvailable) {
        defaultPage = 'event';
    }
    
    const menuItems = document.querySelectorAll('.menu-panel ul li');
    menuItems.forEach(function(item) {
        item.classList.remove('active');
        if (item.dataset.page === defaultPage) {
            item.classList.add('active');
        }
    });
    
    navigateToPage(defaultPage);
}

// ==================== ATTACH MENU EVENTS ====================
function attachMenuEvents() {
    document.querySelectorAll('.menu-panel ul li').forEach(function(item) {
        item.addEventListener('click', function() {
            document.querySelectorAll('.menu-panel ul li').forEach(function(i) {
                i.classList.remove('active');
            });
            this.classList.add('active');
            const page = this.dataset.page;
            toggleMenu(false);

            if (page !== 'saran') {
                lastActiveTab = page;
                window.lastActiveTab = page;
                if (window.setLastActiveTab) {
                    window.setLastActiveTab(page);
                }
            }

            navigateToPage(page);
        });
    });
}

// ==================== NAVIGASI (DIPERBAIKI) ====================
function navigateToPage(page) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;
    
    // 🔥 [FIX] Reset overflow dulu
    mainContent.style.overflowY = '';
    mainContent.style.height = '';
    mainContent.style.maxHeight = '';
    
    // 🔥 [FIX] Jika halaman event, aktifkan scroll
    if (page === 'event') {
        mainContent.style.overflowY = 'auto';
        mainContent.style.height = '100%';
    }
    
    if (page === 'event') {
        if (typeof loadEventPage === 'function') {
            loadEventPage();
        } else {
            mainContent.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);gap:16px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:48px;color:var(--color-primary);"></i>
                    <p>Memuat Event...</p>
                </div>
            `;
        }
    } else if (page === 'laporan') {
        if (typeof renderLaporan === 'function') {
            renderLaporan();
        }
    } else if (page === 'crysta') {
        if (typeof renderCrysta === 'function') {
            renderCrysta();
        }
    } else if (page === 'saran') {
        if (typeof renderSaran === 'function') {
            renderSaran();
        }
    }
}

// ==================== TOGGLE MENU ====================
function toggleMenu(open) {
    if (menuOverlay) menuOverlay.classList.toggle('open', open);
    if (menuPanel) menuPanel.classList.toggle('open', open);
}

if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu(true));
if (menuClose) menuClose.addEventListener('click', () => toggleMenu(false));
if (menuOverlay) menuOverlay.addEventListener('click', () => toggleMenu(false));

// ==================== BACK BUTTON MANAGER ====================
window.addEventListener('popstate', function(e) {
    if (isCrystaPopupOpen) {
        const popup = document.getElementById('crystaDetailOverlay');
        if (popup) {
            if (typeof closeCrystaDetail === 'function') {
                closeCrystaDetail();
                e.preventDefault();
                return;
            }
        }
    }
    
    if (isSaranPopupOpen) {
        const popup = document.getElementById('saranPopupOverlay');
        if (popup && popup.style.display !== 'none') {
            if (typeof closeSaran === 'function') {
                closeSaran();
                e.preventDefault();
                return;
            }
        }
    }
    
    if (isDetailPopupOpen) {
        const popupOverlay = document.getElementById('popupOverlay');
        if (popupOverlay && popupOverlay.classList.contains('active')) {
            if (typeof window.closePopup === 'function') {
                window.closePopup();
                e.preventDefault();
                return;
            }
        }
    }
});

// ==================== EXPOSE ====================
window.setSaranPopupOpen = function(open) {
    isSaranPopupOpen = open;
};

window.setDetailPopupOpen = function(open) {
    isDetailPopupOpen = open;
};

window.setCrystaPopupOpen = function(open) {
    isCrystaPopupOpen = open;
};

window.lastActiveTab = lastActiveTab;
window.setLastActiveTab = function(tab) {
    lastActiveTab = tab;
    window.lastActiveTab = tab;
};
window.getLastActiveTab = function() {
    return lastActiveTab;
};
window.navigateToPage = navigateToPage;
window.buildMenu = buildMenu;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 APP STARTED');
    buildMenu();
    console.log('✅ APP initialized');
});

// ==================== SPIN ANIMATION ====================
const styleSpin = document.createElement('style');
styleSpin.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleSpin);

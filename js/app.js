// ==================== MENU ====================
const menuToggle = document.getElementById('menuToggle');
const menuOverlay = document.getElementById('menuOverlay');
const menuPanel = document.getElementById('menuPanel');
const menuClose = document.getElementById('menuClose');

function toggleMenu(open) {
    if (menuOverlay) menuOverlay.classList.toggle('open', open);
    if (menuPanel) menuPanel.classList.toggle('open', open);
}

if (menuToggle) menuToggle.addEventListener('click', () => toggleMenu(true));
if (menuClose) menuClose.addEventListener('click', () => toggleMenu(false));
if (menuOverlay) menuOverlay.addEventListener('click', () => toggleMenu(false));

// ==================== NAVIGASI MENU ====================
document.querySelectorAll('.menu-panel ul li').forEach(function(item) {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-panel ul li').forEach(function(i) {
            i.classList.remove('active');
        });
        this.classList.add('active');
        const page = this.dataset.page;
        toggleMenu(false);

        // Panggil fungsi render dari masing-masing menu
        if (page === 'laporan') {
            if (typeof renderLaporan === 'function') {
                renderLaporan();
            }
        } else if (page === 'saran') {
            if (typeof renderSaran === 'function') {
                renderSaran();
            }
        } else if (page === 'segera') {
            if (typeof renderSegera === 'function') {
                renderSegera();
            }
        }
    });
});

// ==================== DEFAULT RENDER ====================
// Render default saat pertama kali load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 APP STARTED');
    // Default tampilkan laporan kas
    if (typeof renderLaporan === 'function') {
        renderLaporan();
    } else {
        // Fallback: tampilkan segera hadir
        if (typeof renderSegera === 'function') {
            renderSegera();
        }
    }
});

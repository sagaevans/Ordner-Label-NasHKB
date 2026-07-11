/* =========================================================
   DASHBOARD LOGIC (index.js)
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referensi Elemen DOM Umum ---
    const ordnerList = document.getElementById('ordnerList');
    const totalOrdnerEl = document.getElementById('totalOrdner');
    const totalDokumenEl = document.getElementById('totalDokumen');
    const searchInput = document.getElementById('searchInput');

    // --- Referensi Elemen DOM Bulk Action ---
    const btnBulkSelect = document.getElementById('btnBulkSelect');
    const bulkActionPanel = document.getElementById('bulkActionPanel');
    const selectedCountEl = document.getElementById('selectedCount');
    const btnExecuteBulkPrint = document.getElementById('btnExecuteBulkPrint');
    const btnCancelBulkSelect = document.getElementById('btnCancelBulkSelect');

    let ordnerData = [];
    
    // State untuk mode Print Banyak
    let isSelectMode = false;
    let selectedIds = new Set(); // Menggunakan Set agar ID tidak duplikat

    /**
     * Inisialisasi awal Dashboard
     */
    async function init() {
        ordnerData = await loadData();
        renderDashboard(ordnerData);
    }

    /**
     * Merender statistik dan daftar kartu ordner ke DOM
     */
    function renderDashboard(data) {
        totalOrdnerEl.textContent = getTotalOrdner(data);
        totalDokumenEl.textContent = getTotalDokumen(data);
        ordnerList.innerHTML = '';

        if (!data || data.length === 0) {
            ordnerList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data ordner atau data tidak ditemukan.</p>';
            return;
        }

        data.forEach(item => {
            const card = document.createElement('a');
            card.href = `detail.html?id=${item.id}`;
            card.className = 'ordner-card';
            card.dataset.id = item.id;
            
            // Pertahankan status 'selected' jika sedang dalam pencarian
            if (selectedIds.has(item.id)) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="card-checkbox-wrapper">
                    <input type="checkbox" class="ordner-checkbox" value="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''}>
                    <label>Pilih untuk Print</label>
                </div>
                
                <div class="ordner-card-header">
                    <span class="ordner-code">${item.kode || '-'}</span>
                    ${getStatusBadge(item.status)}
                </div>
                <div class="ordner-details">
                    <p><span>No. Urut:</span> ${item.noUrut || '-'}</p>
                    <p><span>Jenis:</span> ${item.jenis || '-'}</p>
                    <p><span>Tahun:</span> ${item.tahun || '-'}</p>
                    <p><span>No. Dokumen:</span> ${item.nomorAwal || '-'} s/d ${item.nomorAkhir || '-'}</p>
                    <p><span>Jumlah:</span> ${item.jumlah || '0'} Dokumen</p>
                </div>
            `;

            // Intersep event klik pada kartu
            card.addEventListener('click', (e) => {
                if (isSelectMode) {
                    e.preventDefault(); // Cegah pindah ke halaman detail
                    toggleSelection(item.id, card);
                }
            });

            // Hindari konflik klik ganda jika user mengklik checkbox secara langsung
            const checkboxWrapper = card.querySelector('.card-checkbox-wrapper');
            checkboxWrapper.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                if (isSelectMode) toggleSelection(item.id, card);
            });

            ordnerList.appendChild(card);
        });

        // Evaluasi ulang limit jika sedang render saat mode select aktif
        if (isSelectMode) enforceSelectionLimit();
    }

    /* =========================================================
       LOGIKA PENCARIAN
    ========================================================= */
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        const filteredData = ordnerData.filter(item => {
            return (item.kode && item.kode.toLowerCase().includes(keyword)) ||
                   (item.jenis && item.jenis.toLowerCase().includes(keyword)) ||
                   (String(item.noUrut).includes(keyword)) ||
                   (item.tahun && String(item.tahun).includes(keyword));
        });
        renderDashboard(filteredData);
    });

    /* =========================================================
       LOGIKA BULK ACTION (PRINT BANYAK)
    ========================================================= */
    
    // Aktifkan Mode Pilih
    btnBulkSelect.addEventListener('click', () => {
        isSelectMode = true;
        ordnerList.classList.add('select-mode');
        bulkActionPanel.classList.add('show');
        enforceSelectionLimit(); // Pastikan state awal aman
    });

    // Batal Mode Pilih
    btnCancelBulkSelect.addEventListener('click', () => {
        isSelectMode = false;
        selectedIds.clear();
        selectedCountEl.textContent = '0';
        
        ordnerList.classList.remove('select-mode');
        bulkActionPanel.classList.remove('show');
        
        // Bersihkan UI (hilangkan class selected dan hapus centang)
        document.querySelectorAll('.ordner-card').forEach(card => {
            card.classList.remove('selected');
            const cb = card.querySelector('.ordner-checkbox');
            if(cb) {
                cb.checked = false;
                cb.disabled = false; // Buka semua kuncian
            }
        });
    });

    // Logika Toggle Pilihan 1 Kartu
    function toggleSelection(id, cardElement) {
        const checkbox = cardElement.querySelector('.ordner-checkbox');
        
        if (selectedIds.has(id)) {
            // Hapus pilihan
            selectedIds.delete(id);
            cardElement.classList.remove('selected');
            checkbox.checked = false;
        } else {
            // Tambah pilihan (Maks 4 untuk Layout A4 Landscape)
            if (selectedIds.size >= 4) {
                alert("Maksimal hanya bisa memilih 4 Ordner untuk satu kali cetak A4 Landscape.");
                return;
            }
            selectedIds.add(id);
            cardElement.classList.add('selected');
            checkbox.checked = true;
        }

        selectedCountEl.textContent = selectedIds.size;
        enforceSelectionLimit();
    }

    // Mengunci checkbox lain jika sudah terpilih 4
    function enforceSelectionLimit() {
        const isMaxReached = selectedIds.size >= 4;
        const allCards = document.querySelectorAll('.ordner-card');
        
        allCards.forEach(card => {
            const cb = card.querySelector('.ordner-checkbox');
            const id = card.dataset.id;
            
            if (isMaxReached && !selectedIds.has(id)) {
                // Kunci yang tidak terpilih
                if(cb) cb.disabled = true;
                card.style.opacity = '0.6'; // Efek visual redup
                card.style.cursor = 'not-allowed';
            } else {
                // Buka kembali
                if(cb) cb.disabled = false;
                card.style.opacity = '1';
                card.style.cursor = 'pointer';
            }
        });
    }

    // Eksekusi Print
    btnExecuteBulkPrint.addEventListener('click', () => {
        if (selectedIds.size === 0) {
            alert("Pilih minimal 1 Ordner untuk dicetak!");
            return;
        }
        
        // Ubah Set menjadi Array, lalu join dengan koma
        const idsString = Array.from(selectedIds).join(',');
        
        // Arahkan ke print.html dengan parameter ?ids=... (jamak)
        window.location.href = `print.html?ids=${idsString}`;
    });

    // Jalankan inisialisasi
    init();
});
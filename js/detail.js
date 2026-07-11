/* =========================================================
   DETAIL ORDNER LOGIC (detail.js)
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referensi DOM ---
    const errorContainer = document.getElementById('errorContainer');
    const detailContainer = document.getElementById('detailContainer');
    const btnPrint = document.getElementById('btnPrint');

    // --- Referensi DOM Data ---
    const detailKode = document.getElementById('detailKode');
    const detailStatus = document.getElementById('detailStatus');
    const detailJenis = document.getElementById('detailJenis');
    const detailSingkatan = document.getElementById('detailSingkatan');
    const detailTahun = document.getElementById('detailTahun');
    const detailNoAwal = document.getElementById('detailNoAwal');
    const detailNoAkhir = document.getElementById('detailNoAkhir');
    const detailJumlah = document.getElementById('detailJumlah');
    const detailKeterangan = document.getElementById('detailKeterangan');
    const tableDokumen = document.getElementById('tableDokumen');

    /**
     * Mengambil parameter ID dari URL
     * Contoh: detail.html?id=ORD-12345
     */
    function getOrdnerIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async function init() {
        const targetId = getOrdnerIdFromUrl();

        // Jika tidak ada ID di URL
        if (!targetId) {
            showError();
            return;
        }

        // loadData berasal dari storage.js
        const data = await loadData();
        
        // getOrdnerById berasal dari data.js
        const ordner = getOrdnerById(data, targetId);

        // Jika ID tidak ditemukan dalam data
        if (!ordner) {
            showError();
            return;
        }

        renderDetail(ordner);
    }

    function showError() {
        errorContainer.style.display = 'block';
        detailContainer.style.display = 'none';
    }

    function renderDetail(ordner) {
        // Tampilkan container detail
        detailContainer.style.display = 'block';
        errorContainer.style.display = 'none';

        // Isi data umum ke dalam elemen teks
        detailKode.textContent = ordner.kode || '-';
        detailStatus.innerHTML = getStatusBadge(ordner.status);
        detailJenis.textContent = ordner.jenis || '-';
        detailSingkatan.textContent = ordner.singkatan || '-';
        detailTahun.textContent = ordner.tahun || '-';
        detailNoAwal.textContent = ordner.nomorAwal || '-';
        detailNoAkhir.textContent = ordner.nomorAkhir || '-';
        detailJumlah.textContent = ordner.jumlah ? `${ordner.jumlah} Dokumen` : '0 Dokumen';
        detailKeterangan.textContent = ordner.keterangan || '-';

        // Render tabel daftar rincian dokumen
        tableDokumen.innerHTML = '';
        if (Array.isArray(ordner.dokumen) && ordner.dokumen.length > 0) {
            ordner.dokumen.forEach((doc, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${doc.nomor || '-'}</td>
                    <td>${doc.tanggal ? formatDate(doc.tanggal) : '-'}</td>
                    <td>${doc.uraian || '-'}</td>
                `;
                tableDokumen.appendChild(tr);
            });
        } else {
            tableDokumen.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Belum ada rincian dokumen yang ditambahkan.</td></tr>';
        }

        // Event Listener untuk Tombol Print
        btnPrint.addEventListener('click', () => {
            // Arahkan ke halaman print dengan membawa ID ordner saat ini
            window.location.href = `print.html?id=${ordner.id}`;
        });
    }

    // Jalankan inisialisasi
    init();
});
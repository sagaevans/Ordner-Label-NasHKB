/* =========================================================
   HELPER FUNCTIONS
   Kumpulan fungsi utilitas murni untuk format dan logika data.
========================================================= */

/**
 * Menghasilkan ID unik berdasarkan prefix dan timestamp saat ini.
 * @param {String} prefix - Awalan ID (default: 'ORD')
 * @returns {String} ID Unik
 */
function generateId(prefix = 'ORD') {
    return `${prefix}-${Date.now()}`;
}

/**
 * Mengonversi timestamp atau string tanggal menjadi format lokal Indonesia.
 * @param {Number|String} timestamp - Waktu dalam milidetik atau string standar
 * @returns {String} Tanggal terformat (Contoh: 10 Jul 2026)
 */
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

/**
 * Mencari satu objek Ordner berdasarkan ID.
 * @param {Array} data - Array data ordner
 * @param {String} id - ID yang dicari
 * @returns {Object|null} Objek ordner atau null jika tidak ditemukan
 */
function getOrdnerById(data, id) {
    if (!Array.isArray(data)) return null;
    return data.find(item => item.id === id) || null;
}

/**
 * Menghitung total seluruh ordner.
 * @param {Array} data - Array data ordner
 * @returns {Number} Total ordner
 */
function getTotalOrdner(data) {
    if (!Array.isArray(data)) return 0;
    return data.length;
}

/**
 * Menghitung akumulasi jumlah dokumen dari seluruh ordner.
 * @param {Array} data - Array data ordner
 * @returns {Number} Total dokumen
 */
function getTotalDokumen(data) {
    if (!Array.isArray(data)) return 0;
    return data.reduce((total, ordner) => total + (Number(ordner.jumlah) || 0), 0);
}

/**
 * Menghasilkan komponen HTML murni (String) untuk badge status.
 * @param {String} status - Status ordner (Contoh: "Aktif", "Inaktif")
 * @returns {String} HTML elemen span dengan class terkait
 */
function getStatusBadge(status) {
    const statusText = status ? String(status).trim() : 'Inaktif';
    const statusLower = statusText.toLowerCase();
    
    if (statusLower === 'aktif') {
        return `<span class="badge badge-active">${statusText}</span>`;
    } else {
        return `<span class="badge badge-inactive">${statusText}</span>`;
    }
}
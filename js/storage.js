/* =========================================================
   STORAGE PROVIDER
   Bertindak sebagai abstraction layer untuk data.
========================================================= */

const StorageConfig = {
    MODE: 'OFFLINE', // Default: 'OFFLINE' atau 'GITHUB'
    GITHUB_TOKEN: '', 
    GITHUB_OWNER: '',
    GITHUB_REPO: '',
    GITHUB_BRANCH: 'main',
    FILE_PATH: 'data/arsip.json'
};

// Memuat konfigurasi dari cache browser (hanya untuk setting API, bukan data)
function loadConfig() {
    const savedConfig = localStorage.getItem('ordnerConfig');
    if (savedConfig) {
        Object.assign(StorageConfig, JSON.parse(savedConfig));
    }
}

function saveConfig(newConfig) {
    Object.assign(StorageConfig, newConfig);
    localStorage.setItem('ordnerConfig', JSON.stringify(StorageConfig));
}

// Inisialisasi awal
loadConfig();

/* =========================================================
   PUBLIC API UNTUK SELURUH HALAMAN
========================================================= */

/**
 * Mengambil data dari penyimpanan aktif
 * @returns {Promise<Array>} Array of Ordner objects
 */
async function loadData() {
    if (StorageConfig.MODE === 'GITHUB' && StorageConfig.GITHUB_TOKEN) {
        return await loadFromGitHub();
    } else {
        return await loadFromOffline();
    }
}

/**
 * Menyimpan seluruh array data ke penyimpanan aktif
 * @param {Array} data - Array of Ordner objects
 */
async function saveData(data) {
    if (StorageConfig.MODE === 'GITHUB' && StorageConfig.GITHUB_TOKEN) {
        await saveToGitHub(data);
    } else {
        saveToOffline(data);
    }
}

/**
 * Menghapus satu ordner berdasarkan ID
 * @param {String} id - ID Ordner
 */
async function deleteData(id) {
    const data = await loadData();
    const filteredData = data.filter(item => item.id !== id);
    await saveData(filteredData);
}

/* =========================================================
   PRIVATE FUNCTIONS : OFFLINE MODE
========================================================= */

async function loadFromOffline() {
    try {
        // Cache buster: menambahkan timestamp agar browser selalu mengambil file terbaru
        const response = await fetch(`${StorageConfig.FILE_PATH}?t=${new Date().getTime()}`);
        if (!response.ok) {
            throw new Error('Gagal memuat arsip.json. Pastikan Anda menjalankan aplikasi melalui Live Server / Web Server lokal.');
        }
        return await response.json();
    } catch (error) {
        console.error("Offline Load Error:", error);
        return []; // Kembalikan array kosong jika terjadi kegagalan
    }
}

function saveToOffline(data) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arsip.json';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("MODE OFFLINE:\nFile arsip.json terbaru berhasil diunduh. Silakan timpa file lama di dalam folder 'data/arsip.json' secara manual dengan file ini.");
}

/* =========================================================
   PRIVATE FUNCTIONS : GITHUB MODE
========================================================= */

async function loadFromGitHub() {
    const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.FILE_PATH}?ref=${StorageConfig.GITHUB_BRANCH}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${StorageConfig.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('Gagal memuat dari GitHub');
        
        const data = await response.json();
        
        // Decode Base64 (UTF-8 Safe)
        const content = decodeURIComponent(escape(atob(data.content)));
        return JSON.parse(content);
        
    } catch (error) {
        console.error("GitHub Load Error:", error);
        alert("Gagal memuat data dari GitHub. Beralih ke data lokal sementara.");
        return await loadFromOffline();
    }
}

async function saveToGitHub(data) {
    const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.FILE_PATH}`;
    
    try {
        // 1. Dapatkan SHA file saat ini (Wajib untuk melakukan PUT/Update di GitHub API)
        const getResponse = await fetch(`${url}?ref=${StorageConfig.GITHUB_BRANCH}`, {
            headers: {
                'Authorization': `Bearer ${StorageConfig.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        let sha = '';
        if (getResponse.ok) {
            const currentData = await getResponse.json();
            sha = currentData.sha;
        }

        // 2. Encode konten JSON baru ke Base64 (UTF-8 Safe)
        const jsonString = JSON.stringify(data, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

        // 3. Kirim PUT request untuk memperbarui file
        const putResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${StorageConfig.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update arsip.json via App - ${new Date().toISOString()}`,
                content: base64Content,
                sha: sha,
                branch: StorageConfig.GITHUB_BRANCH
            })
        });

        if (!putResponse.ok) throw new Error('Gagal melakukan operasi PUT ke GitHub');
        
        alert("MODE GITHUB:\nData berhasil diperbarui di GitHub Repository!");
        
    } catch (error) {
        console.error("GitHub Save Error:", error);
        alert("Gagal menyimpan ke GitHub. Periksa Token, Owner, dan Repo Anda di menu pengaturan.");
    }
}
/* =========================================================
   STORAGE LOGIC (storage.js)
   Integrasi Auto-Save GitHub API
========================================================= */

// Konfigurasi Global & Ambil dari LocalStorage browser
const StorageConfig = {
    MODE: localStorage.getItem('APP_MODE') || 'GITHUB', // Default diarahkan ke GITHUB
    GITHUB_TOKEN: localStorage.getItem('GH_TOKEN') || '',
    GITHUB_OWNER: localStorage.getItem('GH_OWNER') || '', // Username Github Anda
    GITHUB_REPO: localStorage.getItem('GH_REPO') || '',   // Nama Repository
    GITHUB_FILE_PATH: 'data.json' // Nama file database yang akan terbuat di Github
};

// Fungsi menyimpan konfigurasi dari Admin Panel ke Browser
function saveConfig(config) {
    localStorage.setItem('APP_MODE', config.MODE);
    localStorage.setItem('GH_TOKEN', config.GITHUB_TOKEN);
    localStorage.setItem('GH_OWNER', config.GITHUB_OWNER);
    localStorage.setItem('GH_REPO', config.GITHUB_REPO);
    
    StorageConfig.MODE = config.MODE;
    StorageConfig.GITHUB_TOKEN = config.GITHUB_TOKEN;
    StorageConfig.GITHUB_OWNER = config.GITHUB_OWNER;
    StorageConfig.GITHUB_REPO = config.GITHUB_REPO;
}

// FUNGSI LOAD DATA
async function loadData() {
    if (StorageConfig.MODE === 'GITHUB' && StorageConfig.GITHUB_TOKEN) {
        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${StorageConfig.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Decode Base64 dari Github (support format karakter utf-8)
                const content = decodeURIComponent(escape(atob(data.content)));
                // Backup otomatis ke lokal agar lebih cepat di-load nanti
                localStorage.setItem('ordnerData_Backup', content);
                return JSON.parse(content);
            } else if (response.status === 404) {
                return []; // File belum ada, kembalikan array kosong
            }
        } catch (e) {
            console.error("Gagal menarik data dari GitHub:", e);
        }
    }
    
    // Jika tidak pakai Github, ambil dari localStorage
    return JSON.parse(localStorage.getItem('ordnerData_Backup')) || [];
}

// FUNGSI SAVE DATA
async function saveData(data) {
    // Selalu backup di browser lokal sebagai jaring pengaman
    localStorage.setItem('ordnerData_Backup', JSON.stringify(data));

    if (StorageConfig.MODE === 'GITHUB' && StorageConfig.GITHUB_TOKEN) {
        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
        
        try {
            // 1. Cek versi file terakhir (SHA) di Github terlebih dahulu
            let sha = '';
            const getRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${StorageConfig.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getRes.ok) {
                const getJson = await getRes.json();
                sha = getJson.sha; // Mendapatkan token SHA file yang mau ditimpa
            }

            // 2. Encode JSON ke format Base64 (Syarat wajib dari Github)
            const contentStr = JSON.stringify(data, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(contentStr)));

            // 3. Kirim / Timpa Data ke Github
            const bodyPayload = {
                message: 'Auto-update data ordner via Admin Panel',
                content: encodedContent
            };
            if (sha) bodyPayload.sha = sha; // Masukkan SHA jika file sudah pernah ada

            const putRes = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${StorageConfig.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyPayload)
            });

            if (putRes.ok) {
                console.log("Berhasil tersimpan ke Cloud Github!");
            } else {
                alert("Peringatan: Gagal menyimpan ke Cloud. Periksa Token atau Nama Repo Anda.");
            }
        } catch (e) {
            console.error(e);
            alert("Gagal terhubung ke Internet/GitHub.");
        }
    }
}

// Fungsi bantu Generator ID
function generateId(prefix = 'ID') {
    return `${prefix}-${Date.now()}`;
}

function getOrdnerById(dataList, id) {
    return dataList.find(item => item.id === id);
}

function getStatusBadge(status) {
    if (status === 'Aktif') {
        return `<span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">Aktif</span>`;
    }
    return `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold;">Inaktif</span>`;
}

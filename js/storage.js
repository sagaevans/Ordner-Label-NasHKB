/* =========================================================
   STORAGE LOGIC (storage.js)
   Integrasi Auto-Save GitHub API (Public Read, Private Write)
========================================================= */

// Konfigurasi Global & Ambil dari LocalStorage browser
const StorageConfig = {
    MODE: localStorage.getItem('APP_MODE') || 'GITHUB',
    GITHUB_TOKEN: localStorage.getItem('GH_TOKEN') || '',
    
    // UBAH DUA BARIS DI BAWAH INI SESUAI AKUN GITHUB ANDA!
    GITHUB_OWNER: localStorage.getItem('GH_OWNER') || 'USERNAME_GITHUB_ANDA', // Contoh: 'harisbonek41'
    GITHUB_REPO: localStorage.getItem('GH_REPO') || 'NAMA_REPO_ANDA',       // Contoh: 'ordner-app'
    
    GITHUB_FILE_PATH: 'data.json' 
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

// FUNGSI LOAD DATA (USER BIASA BISA BACA TANPA TOKEN)
async function loadData() {
    // Coba ambil dari Github jika Owner dan Repo sudah ditentukan
    if (StorageConfig.MODE === 'GITHUB' && StorageConfig.GITHUB_OWNER && StorageConfig.GITHUB_REPO) {
        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
        
        // Siapkan header (Token hanya dikirim jika ada/sedang login Admin)
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (StorageConfig.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${StorageConfig.GITHUB_TOKEN}`;
        }

        try {
            const response = await fetch(url, { headers: headers });
            
            if (response.ok) {
                const data = await response.json();
                const content = decodeURIComponent(escape(atob(data.content)));
                localStorage.setItem('ordnerData_Backup', content);
                return JSON.parse(content);
            } else if (response.status === 404) {
                return []; // File belum ada
            }
        } catch (e) {
            console.error("Gagal menarik data dari GitHub:", e);
        }
    }
    
    // Jika offline/gagal, ambil dari cache lokal browser
    return JSON.parse(localStorage.getItem('ordnerData_Backup')) || [];
}

// FUNGSI SAVE DATA (HANYA BISA JIKA ADA TOKEN DARI ADMIN)
async function saveData(data) {
    localStorage.setItem('ordnerData_Backup', JSON.stringify(data));

    if (StorageConfig.MODE === 'GITHUB') {
        if (!StorageConfig.GITHUB_TOKEN) {
            alert("Gagal menyimpan ke Cloud: Anda tidak memiliki Token Akses (Bukan Admin).");
            return;
        }

        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
        
        try {
            let sha = '';
            const getRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${StorageConfig.GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getRes.ok) {
                const getJson = await getRes.json();
                sha = getJson.sha; 
            }

            const contentStr = JSON.stringify(data, null, 2);
            const encodedContent = btoa(unescape(encodeURIComponent(contentStr)));

            const bodyPayload = {
                message: 'Auto-update data ordner via Admin Panel',
                content: encodedContent
            };
            if (sha) bodyPayload.sha = sha; 

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
                alert("Peringatan: Gagal menyimpan ke Cloud. Periksa Token Anda.");
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

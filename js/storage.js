/* =========================================================
   STORAGE LOGIC (storage.js)
   Integrasi Auto-Save GitHub API (Public Read, Private Write)
========================================================= */

// Konfigurasi Hardcode (Username & Repo Anda terkunci di sini)
const StorageConfig = {
    MODE: 'GITHUB', 
    GITHUB_TOKEN: localStorage.getItem('GH_TOKEN') || '',
    GITHUB_OWNER: 'sagaevans',           // HARDCODE USERNAME GITHUB
    GITHUB_REPO: 'Ordner-Label-NasHKB',  // HARDCODE NAMA REPO
    GITHUB_FILE_PATH: 'data.json'        // Nama file di dalam repo
};

// Fungsi menyimpan token ke Browser
function saveConfig(config) {
    localStorage.setItem('GH_TOKEN', config.GITHUB_TOKEN);
    StorageConfig.GITHUB_TOKEN = config.GITHUB_TOKEN;
}

// FUNGSI CEK TOKEN (VALIDASI KE GITHUB REPOSITORY)
async function verifyGitHubToken(token) {
    try {
        // Cek langsung ke repository-nya agar Fine-Grained Token (github_pat_...) tetap lolos
        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`, // Gunakan standar Bearer Token
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.ok; 
    } catch (e) {
        return false;
    }
}

// FUNGSI LOAD DATA (USER BIASA BISA BACA TANPA TOKEN)
async function loadData() {
    const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
    
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (StorageConfig.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${StorageConfig.GITHUB_TOKEN}`;
    }

    try {
        const response = await fetch(url + '?t=' + new Date().getTime(), { 
            headers: headers,
            cache: 'no-store'
        });
        
        if (response.ok) {
            const data = await response.json();
            const content = decodeURIComponent(escape(atob(data.content)));
            localStorage.setItem('ordnerData_Backup', content);
            return JSON.parse(content);
        } else if (response.status === 404) {
            return []; 
        }
    } catch (e) {
        console.error("Gagal menarik data dari GitHub:", e);
    }
    
    return JSON.parse(localStorage.getItem('ordnerData_Backup')) || [];
}

// FUNGSI SAVE DATA (HANYA BISA JIKA ADA TOKEN DARI ADMIN)
async function saveData(data) {
    localStorage.setItem('ordnerData_Backup', JSON.stringify(data));

    if (!StorageConfig.GITHUB_TOKEN) {
        alert("Gagal menyimpan ke Cloud: Anda tidak memiliki Token Akses.");
        return;
    }

    const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
    
    try {
        let sha = '';
        const getRes = await fetch(url + '?t=' + new Date().getTime(), {
            headers: {
                'Authorization': `Bearer ${StorageConfig.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
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
                'Authorization': `Bearer ${StorageConfig.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        });

        if (putRes.ok) {
            console.log("Berhasil tersimpan otomatis ke GitHub!");
        } else {
            const errData = await putRes.json();
            console.error("Github Error:", errData);
            alert(`Gagal menyimpan ke Cloud: ${errData.message}`);
        }
    } catch (e) {
        console.error(e);
        alert("Gagal terhubung ke Internet/GitHub.");
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

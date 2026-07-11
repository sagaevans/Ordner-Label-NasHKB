/* =========================================================
   STORAGE LOGIC (storage.js)
   Integrasi Auto-Save GitHub API (Public Read, Private Write)
========================================================= */

// Konfigurasi Hardcode (Username & Repo Anda terkunci di sini)
const StorageConfig = {
    MODE: 'GITHUB',
    GITHUB_TOKEN: sanitizeToken(localStorage.getItem('GH_TOKEN') || ''),
    GITHUB_OWNER: 'sagaevans',           // HARDCODE USERNAME GITHUB
    GITHUB_REPO: 'Ordner-Label-NasHKB',  // HARDCODE NAMA REPO
    GITHUB_FILE_PATH: 'data.json'        // Nama file di dalam repo
};

// Bersihkan token dari spasi/enter/karakter tak terlihat yang sering
// ikut ter-copy (spasi biasa, non-breaking space, tab, newline, dll).
// Personal Access Token GitHub tidak pernah mengandung whitespace.
function sanitizeToken(token) {
    return (token || '').replace(/\s+/g, '').trim();
}

// Fungsi menyimpan token ke Browser
function saveConfig(config) {
    const cleanToken = sanitizeToken(config.GITHUB_TOKEN);
    localStorage.setItem('GH_TOKEN', cleanToken);
    StorageConfig.GITHUB_TOKEN = cleanToken;
}

// Helper: buat header Authorization yang konsisten di semua request.
function buildAuthHeaders(token, extra = {}) {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...extra
    };
}

// FUNGSI CEK TOKEN (VALIDASI KE GITHUB REPOSITORY)
// Mengembalikan { valid, message } supaya UI bisa menampilkan alasan
// kegagalan yang sebenarnya dari GitHub, bukan cuma pesan generik.
async function verifyGitHubToken(token) {
    const cleanToken = sanitizeToken(token);

    if (!cleanToken) {
        return { valid: false, message: 'Token kosong.' };
    }

    try {
        const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}`;
        const response = await fetch(url, {
            headers: buildAuthHeaders(cleanToken),
            cache: 'no-store'
        });

        if (response.ok) {
            return { valid: true, message: 'OK' };
        }

        let detail = `HTTP ${response.status}`;
        try {
            const errJson = await response.json();
            if (errJson && errJson.message) detail = errJson.message;
        } catch (_) { /* respons tidak berbentuk JSON, abaikan */ }

        if (response.status === 401) {
            detail = `Bad credentials — token tidak dikenali GitHub. Kemungkinan: token salah ketik/tercampur karakter lain, sudah revoked, atau sudah kedaluwarsa. (${detail})`;
        } else if (response.status === 403) {
            detail = `Akses ditolak — token valid tapi tidak punya izin ke repo ini. Untuk fine-grained token, pastikan repo "${StorageConfig.GITHUB_REPO}" dicentang di Repository access dan permission "Contents: Read and write" aktif. (${detail})`;
        } else if (response.status === 404) {
            detail = `Repo tidak ditemukan dari sudut pandang token ini — untuk fine-grained token yang scope-nya dibatasi, repo privat yang tidak diberi akses akan tampil seolah 404. (${detail})`;
        }

        return { valid: false, message: detail };
    } catch (e) {
        return { valid: false, message: 'Gagal terhubung ke GitHub (cek koneksi internet).' };
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
        const response = await fetch(url + '?t=' + Date.now(), {
            headers: headers,
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            const content = decodeBase64Utf8(data.content);
            localStorage.setItem('ordnerData_Backup', content);
            return JSON.parse(content);
        } else if (response.status === 404) {
            return [];
        } else {
            console.error('Gagal menarik data dari GitHub, status:', response.status);
        }
    } catch (e) {
        console.error('Gagal menarik data dari GitHub:', e);
    }

    try {
        return JSON.parse(localStorage.getItem('ordnerData_Backup')) || [];
    } catch (_) {
        return [];
    }
}

// FUNGSI SAVE DATA (HANYA BISA JIKA ADA TOKEN DARI ADMIN)
// Mengembalikan { success, message } supaya pemanggil (admin.js) tahu
// pasti apakah data betul-betul tersimpan di GitHub sebelum melanjutkan
// (reload tabel, tutup modal, dsb).
async function saveData(data) {
    localStorage.setItem('ordnerData_Backup', JSON.stringify(data));

    if (!StorageConfig.GITHUB_TOKEN) {
        const msg = 'Gagal menyimpan ke Cloud: Anda tidak memiliki Token Akses.';
        alert(msg);
        return { success: false, message: msg };
    }

    const url = `https://api.github.com/repos/${StorageConfig.GITHUB_OWNER}/${StorageConfig.GITHUB_REPO}/contents/${StorageConfig.GITHUB_FILE_PATH}`;
    const contentStr = JSON.stringify(data, null, 2);
    const encodedContent = encodeBase64Utf8(contentStr);

    // percobaan pertama, lalu 1x retry otomatis jika terjadi konflik SHA
    // (409 — biasanya karena file berubah di GitHub sejak terakhir dibaca)
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            let sha = '';
            const getRes = await fetch(url + '?t=' + Date.now(), {
                headers: buildAuthHeaders(StorageConfig.GITHUB_TOKEN),
                cache: 'no-store'
            });

            if (getRes.ok) {
                const getJson = await getRes.json();
                sha = getJson.sha;
            } else if (getRes.status !== 404) {
                const errJson = await safeJson(getRes);
                const msg = `Gagal memeriksa versi file di GitHub: ${errJson?.message || getRes.status}`;
                alert(msg);
                return { success: false, message: msg };
            }

            const bodyPayload = {
                message: 'Auto-update data ordner via Admin Panel',
                content: encodedContent
            };
            if (sha) bodyPayload.sha = sha;

            const putRes = await fetch(url, {
                method: 'PUT',
                headers: buildAuthHeaders(StorageConfig.GITHUB_TOKEN, {
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(bodyPayload)
            });

            if (putRes.ok) {
                return { success: true, message: 'Berhasil tersimpan ke GitHub.' };
            }

            const errData = await safeJson(putRes);
            const errMsg = errData?.message || `HTTP ${putRes.status}`;

            // 409 = konflik SHA, coba lagi sekali dengan sha terbaru
            if (putRes.status === 409 && attempt === 1) {
                continue;
            }

            alert(`Gagal menyimpan ke Cloud: ${errMsg}`);
            return { success: false, message: errMsg };

        } catch (e) {
            console.error(e);
            alert('Gagal terhubung ke Internet/GitHub.');
            return { success: false, message: 'Koneksi gagal.' };
        }
    }

    const timeoutMsg = 'Gagal menyimpan setelah beberapa percobaan (konflik data). Coba lagi.';
    alert(timeoutMsg);
    return { success: false, message: timeoutMsg };
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch (_) {
        return null;
    }
}

// Encode/decode base64 yang aman untuk karakter UTF-8 (emoji, huruf non-latin, dll)
function encodeBase64Utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
}

function decodeBase64Utf8(base64) {
    const binary = atob(base64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
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

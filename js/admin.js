/* =========================================================
   ADMIN PANEL LOGIC (admin.js)
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referensi Elemen DOM: Tabel & Toolbar ---
    const tableBody = document.getElementById('tableBody');
    const searchAdmin = document.getElementById('searchAdmin');
    const btnTambah = document.getElementById('btnTambah');
    const btnSettings = document.getElementById('btnSettings');

    // --- Referensi Elemen DOM: Modal Form ---
    const modalForm = document.getElementById('modalForm');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const saveFormBtn = document.getElementById('saveFormBtn');
    const modalTitle = document.getElementById('modalTitle');
    const ordnerForm = document.getElementById('ordnerForm');
    
    // --- Referensi Elemen DOM: Form Inputs ---
    const formId = document.getElementById('formId');
    const formKode = document.getElementById('formKode');
    const formNoUrut = document.getElementById('formNoUrut'); 
    const formTahun = document.getElementById('formTahun');
    const formJenis = document.getElementById('formJenis');
    const formSingkatan = document.getElementById('formSingkatan');
    const formNoAwal = document.getElementById('formNoAwal');
    const formNoAkhir = document.getElementById('formNoAkhir');
    const formJumlah = document.getElementById('formJumlah');
    const formStatus = document.getElementById('formStatus');
    const formKeterangan = document.getElementById('formKeterangan');
    const formWarnaJenis = document.getElementById('warnaJenis'); // NEW: Warna Label

    // --- Referensi Elemen DOM: Modal Settings ---
    const modalSettings = document.getElementById('modalSettings');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const configMode = document.getElementById('configMode');
    const githubSettings = document.getElementById('githubSettings');
    const configToken = document.getElementById('configToken');
    const configOwner = document.getElementById('configOwner');
    const configRepo = document.getElementById('configRepo');
    
    // --- Referensi Elemen DOM: Tools ---
    const btnExport = document.getElementById('btnExport');
    const importFile = document.getElementById('importFile');
    const btnReset = document.getElementById('btnReset');

    let ordnerData = [];

    /* =========================================================
       INISIALISASI & RENDER TABEL
    ========================================================= */
    
    async function init() {
        loadSettingsToUI();
        
        // PAKSA USER MENGISI TOKEN JIKA MASIH KOSONG
        if (StorageConfig.MODE === 'GITHUB' && !StorageConfig.GITHUB_TOKEN) {
            alert("Halo! Untuk mengaktifkan fitur Auto-Save Cloud, silakan masukkan Pengaturan GitHub Anda (Username, Repo, dan Token) terlebih dahulu.");
            openModal(modalSettings);
        } else {
            // Hanya muat data tabel jika token tidak dipaksa diminta
            ordnerData = await loadData();
            renderTable(ordnerData);
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Tidak ada data ordner.</td></tr>';
            return;
        }

        // Urutkan data berdasarkan tahun terbaru, lalu nomor urut, lalu abjad kode
        const sortedData = [...data].sort((a, b) => b.tahun - a.tahun || a.noUrut - b.noUrut || a.kode.localeCompare(b.kode));

        sortedData.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--navy-primary);">${item.kode || '-'}</td>
                <td style="text-align: center; font-weight: bold; font-size: 1.1em;">${item.noUrut || '-'}</td>
                <td>
                    <span style="display:inline-block; width:12px; height:12px; background-color:${item.warnaJenis || '#FF8C00'}; border-radius:50%; margin-right:5px; border:1px solid #ccc;"></span>
                    ${item.jenis || '-'}
                </td>
                <td>${item.tahun || '-'}</td>
                <td>${item.nomorAwal} - ${item.nomorAkhir}</td>
                <td>${item.jumlah}</td>
                <td>${getStatusBadge(item.status)}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button class="btn btn-outline btn-edit" data-id="${item.id}" style="padding: 4px 8px; font-size: 0.8rem; margin-right: 5px;">Edit</button>
                    <button class="btn btn-danger btn-delete" data-id="${item.id}" style="padding: 4px 8px; font-size: 0.8rem;">Hapus</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        attachActionListeners();
    }

    /* =========================================================
       FUNGSI MODAL (Buka & Tutup)
    ========================================================= */
    
    function openModal(modalEl) {
        modalEl.classList.add('active');
    }

    function closeModal(modalEl) {
        modalEl.classList.remove('active');
    }

    /* =========================================================
       LOGIKA CRUD ORDNER
    ========================================================= */

    // 1. TAMBAH (Buka form kosong)
    btnTambah.addEventListener('click', () => {
        ordnerForm.reset();
        formId.value = '';
        if (formWarnaJenis) formWarnaJenis.value = '#FF8C00'; // Reset warna ke default (Oranye)
        modalTitle.textContent = 'Tambah Ordner Baru';
        openModal(modalForm);
    });

    // 2. SIMPAN (Proses tambah / edit)
    saveFormBtn.addEventListener('click', async () => {
        // Validasi HTML bawaan (required)
        if (!ordnerForm.checkValidity()) {
            ordnerForm.reportValidity();
            return;
        }

        const currentTimestamp = Date.now();
        const idValue = formId.value;
        const isEdit = idValue !== '';

        const newData = {
            id: isEdit ? idValue : generateId('ORD'),
            kode: formKode.value.trim(),
            noUrut: parseInt(formNoUrut.value) || '', 
            jenis: formJenis.value.trim(),
            singkatan: formSingkatan.value.trim(),
            warnaJenis: formWarnaJenis ? formWarnaJenis.value : '#FF8C00', // NEW: Simpan Warna
            tahun: parseInt(formTahun.value) || new Date().getFullYear(),
            nomorAwal: formNoAwal.value.trim(),
            nomorAkhir: formNoAkhir.value.trim(),
            jumlah: parseInt(formJumlah.value) || 0,
            status: formStatus.value,
            keterangan: formKeterangan.value.trim(),
            updatedAt: currentTimestamp,
            ...(isEdit ? {} : { createdAt: currentTimestamp, dokumen: [] })
        };

        if (isEdit) {
            const index = ordnerData.findIndex(item => item.id === idValue);
            if (index !== -1) {
                ordnerData[index] = { ...ordnerData[index], ...newData };
            }
        } else {
            ordnerData.push(newData);
        }

        // Simpan ke storage dan perbarui tabel
        await saveData(ordnerData);
        ordnerData = await loadData(); 
        renderTable(ordnerData);
        closeModal(modalForm);
    });

    // 3. EDIT & HAPUS (Event Delegation dari Tabel)
    function attachActionListeners() {
        const editBtns = document.querySelectorAll('.btn-edit');
        const deleteBtns = document.querySelectorAll('.btn-delete');

        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const item = getOrdnerById(ordnerData, id);
                if (item) {
                    formId.value = item.id;
                    formKode.value = item.kode || '';
                    formNoUrut.value = item.noUrut || ''; 
                    formTahun.value = item.tahun || '';
                    formJenis.value = item.jenis || '';
                    formSingkatan.value = item.singkatan || '';
                    if (formWarnaJenis) formWarnaJenis.value = item.warnaJenis || '#FF8C00'; // NEW: Tampilkan Warna
                    formNoAwal.value = item.nomorAwal || '';
                    formNoAkhir.value = item.nomorAkhir || '';
                    formJumlah.value = item.jumlah || '';
                    formStatus.value = item.status || 'Aktif';
                    formKeterangan.value = item.keterangan || '';
                    
                    modalTitle.textContent = 'Edit Data Ordner';
                    openModal(modalForm);
                }
            });
        });

        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Apakah Anda yakin ingin menghapus ordner ini secara permanen?')) {
                    await deleteData(id);
                    ordnerData = await loadData();
                    renderTable(ordnerData);
                }
            });
        });
    }

    // Tutup Modal Form
    closeFormBtn.addEventListener('click', () => closeModal(modalForm));
    cancelFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(modalForm);
    });

    // Fitur Pencarian di Tabel Admin
    searchAdmin.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();
        const filteredData = ordnerData.filter(item => {
            return (item.kode && item.kode.toLowerCase().includes(keyword)) ||
                   (item.jenis && item.jenis.toLowerCase().includes(keyword)) ||
                   (String(item.noUrut).includes(keyword)) ||
                   (item.tahun && String(item.tahun).includes(keyword));
        });
        renderTable(filteredData);
    });


    /* =========================================================
       LOGIKA PENGATURAN & BACKUP
    ========================================================= */

    function loadSettingsToUI() {
        configMode.value = StorageConfig.MODE;
        configToken.value = StorageConfig.GITHUB_TOKEN;
        configOwner.value = StorageConfig.GITHUB_OWNER;
        configRepo.value = StorageConfig.GITHUB_REPO;
        toggleGithubSettings();
    }

    function toggleGithubSettings() {
        if (configMode.value === 'GITHUB') {
            githubSettings.style.display = 'block';
        } else {
            githubSettings.style.display = 'none';
        }
    }

    configMode.addEventListener('change', toggleGithubSettings);

    btnSettings.addEventListener('click', () => {
        loadSettingsToUI();
        openModal(modalSettings);
    });

    closeSettingsBtn.addEventListener('click', () => closeModal(modalSettings));

    saveSettingsBtn.addEventListener('click', async () => {
        const newConfig = {
            MODE: configMode.value,
            GITHUB_TOKEN: configToken.value.trim(),
            GITHUB_OWNER: configOwner.value.trim(),
            GITHUB_REPO: configRepo.value.trim()
        };
        
        saveConfig(newConfig); 
        closeModal(modalSettings);
        
        ordnerData = await loadData();
        renderTable(ordnerData);
    });

    /* =========================================================
       EKSPOR, IMPOR, DAN RESET (JSON)
    ========================================================= */
    
    btnExport.addEventListener('click', () => {
        const jsonString = JSON.stringify(ordnerData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_ordner_${formatDate(Date.now()).replace(/\s/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) throw new Error("Format JSON tidak valid (harus array).");
                
                if(confirm("Peringatan: Data saat ini akan DITIMPA sepenuhnya oleh data dari file ini. Lanjutkan?")) {
                    await saveData(importedData);
                    ordnerData = await loadData();
                    renderTable(ordnerData);
                    closeModal(modalSettings);
                }
            } catch (error) {
                console.error("Import Error:", error);
                alert("Gagal mengimpor file. Pastikan itu adalah file JSON yang valid.");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
    });

    btnReset.addEventListener('click', async () => {
        if(confirm("PERINGATAN KERAS: Seluruh data Anda akan dihapus dan diganti dengan 1 data contoh. Lanjutkan?")) {
            const dummyData = [{
                "id": generateId('ORD'),
                "kode": "BBK-2013",
                "noUrut": 1, 
                "jenis": "BUKTI BANK KELUAR",
                "singkatan": "BBK",
                "warnaJenis": "#FF8C00", // Default warna oranye
                "tahun": 2013,
                "nomorAwal": "15...0000",
                "nomorAkhir": "15...0036",
                "jumlah": 37,
                "status": "Aktif",
                "keterangan": "Ini adalah data dummy hasil reset.",
                "createdAt": Date.now(),
                "updatedAt": Date.now(),
                "dokumen": []
            }];
            await saveData(dummyData);
            ordnerData = await loadData();
            renderTable(ordnerData);
            closeModal(modalSettings);
        }
    });

    // Jalankan aplikasi Admin
    init();
});

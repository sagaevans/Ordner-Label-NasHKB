/* =========================================================
   ADMIN PANEL LOGIC (admin.js)
   Menggunakan Modal Bawaan & Mengunci Konfigurasi (Hardcode)
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('tableBody');
    const searchAdmin = document.getElementById('searchAdmin');
    const btnTambah = document.getElementById('btnTambah');
    const btnSettings = document.getElementById('btnSettings');

    const modalForm = document.getElementById('modalForm');
    const closeFormBtn = document.getElementById('closeFormBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const saveFormBtn = document.getElementById('saveFormBtn');
    const modalTitle = document.getElementById('modalTitle');
    const ordnerForm = document.getElementById('ordnerForm');
    
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
    const formWarnaJenis = document.getElementById('warnaJenis'); 

    const modalSettings = document.getElementById('modalSettings');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    
    const configMode = document.getElementById('configMode');
    const configToken = document.getElementById('configToken');
    const configOwner = document.getElementById('configOwner');
    const configRepo = document.getElementById('configRepo');
    
    const btnExport = document.getElementById('btnExport');
    const importFile = document.getElementById('importFile');
    const btnReset = document.getElementById('btnReset');

    let ordnerData = [];

    async function init() {
        if (configMode) {
            configMode.value = 'GITHUB';
            configMode.disabled = true; 
            configMode.style.backgroundColor = '#f1f5f9';
            configMode.style.cursor = 'not-allowed';
        }
        if (configOwner) {
            configOwner.value = 'sagaevans';
            configOwner.readOnly = true; 
            configOwner.style.backgroundColor = '#f1f5f9';
            configOwner.style.color = '#64748b';
            configOwner.style.cursor = 'not-allowed';
        }
        if (configRepo) {
            configRepo.value = 'Ordner-Label-NasHKB';
            configRepo.readOnly = true; 
            configRepo.style.backgroundColor = '#f1f5f9';
            configRepo.style.color = '#64748b';
            configRepo.style.cursor = 'not-allowed';
        }
        
        if (configToken && StorageConfig.GITHUB_TOKEN) {
            configToken.value = StorageConfig.GITHUB_TOKEN;
        }

        if (!StorageConfig.GITHUB_TOKEN) {
            openModal(modalSettings);
        } else {
            ordnerData = await loadData();
            renderTable(ordnerData);
        }
    }

    // --- LOGIKA TOMBOL "TERAPKAN PENGATURAN" DENGAN VALIDASI ---
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            const tokenVal = configToken ? configToken.value.trim() : '';
            
            if (!tokenVal) {
                alert("Token API GitHub wajib diisi untuk mengelola data!");
                return; 
            }

            // Animasi loading saat verifikasi
            const originalText = saveSettingsBtn.textContent;
            saveSettingsBtn.textContent = "Memeriksa Token...";
            saveSettingsBtn.disabled = true;

            // Proses cek ke Github
            const isValid = await verifyGitHubToken(tokenVal);

            // Kembalikan tombol ke keadaan semula
            saveSettingsBtn.textContent = originalText;
            saveSettingsBtn.disabled = false;

            if (!isValid) {
                alert("Gagal Masuk: Token API tidak valid atau sudah kedaluwarsa (Bad credentials).");
                return; // Jangan tutup modal jika salah
            }

            const newConfig = {
                GITHUB_TOKEN: tokenVal
            };
            saveConfig(newConfig); 
            
            closeModal(modalSettings);
            
            ordnerData = await loadData();
            renderTable(ordnerData);
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (!StorageConfig.GITHUB_TOKEN) {
                alert("Anda tidak bisa menutup panel ini sebelum memasukkan Token API yang valid.");
            } else {
                closeModal(modalSettings);
            }
        });
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Tidak ada data ordner.</td></tr>';
            return;
        }

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
    
    function openModal(modalEl) {
        if(modalEl) modalEl.classList.add('active');
    }

    function closeModal(modalEl) {
        if(modalEl) modalEl.classList.remove('active');
    }

    btnTambah.addEventListener('click', () => {
        ordnerForm.reset();
        formId.value = '';
        if (formWarnaJenis) formWarnaJenis.value = '#FF8C00'; 
        modalTitle.textContent = 'Tambah Ordner Baru';
        openModal(modalForm);
    });

    saveFormBtn.addEventListener('click', async () => {
        if (!ordnerForm.checkValidity()) {
            ordnerForm.reportValidity();
            return;
        }

        const originalText = saveFormBtn.textContent;
        saveFormBtn.textContent = "Menyimpan ke GitHub...";
        saveFormBtn.disabled = true;

        const currentTimestamp = Date.now();
        const idValue = formId.value;
        const isEdit = idValue !== '';

        const newData = {
            id: isEdit ? idValue : generateId('ORD'),
            kode: formKode.value.trim(),
            noUrut: parseInt(formNoUrut.value) || '', 
            jenis: formJenis.value.trim(),
            singkatan: formSingkatan.value.trim(),
            warnaJenis: formWarnaJenis ? formWarnaJenis.value : '#FF8C00', 
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

        await saveData(ordnerData);
        ordnerData = await loadData(); 
        renderTable(ordnerData);
        
        saveFormBtn.textContent = originalText;
        saveFormBtn.disabled = false;
        closeModal(modalForm);
    });

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
                    if (formWarnaJenis) formWarnaJenis.value = item.warnaJenis || '#FF8C00'; 
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
                    const itemIndex = ordnerData.findIndex(item => item.id === id);
                    if (itemIndex > -1) {
                        ordnerData.splice(itemIndex, 1);
                        await saveData(ordnerData); 
                        ordnerData = await loadData();
                        renderTable(ordnerData);
                    }
                }
            });
        });
    }

    closeFormBtn.addEventListener('click', () => closeModal(modalForm));
    cancelFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(modalForm);
    });

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

    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            openModal(modalSettings);
        });
    }

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const jsonString = JSON.stringify(ordnerData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_ordner_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (!Array.isArray(importedData)) throw new Error("Format JSON tidak valid.");
                    
                    if(confirm("Peringatan: Data di GitHub akan DITIMPA dengan file ini. Lanjutkan?")) {
                        await saveData(importedData);
                        ordnerData = await loadData();
                        renderTable(ordnerData);
                        closeModal(modalSettings);
                    }
                } catch (error) {
                    alert("Gagal mengimpor file.");
                }
            };
            reader.readAsText(file);
            e.target.value = ''; 
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if(confirm("PERINGATAN KERAS: Seluruh data Anda akan dihapus dan diganti dengan 1 data contoh. Lanjutkan?")) {
                const dummyData = [{
                    "id": generateId('ORD'),
                    "kode": "BBK-2013",
                    "noUrut": 1, 
                    "jenis": "BUKTI BANK KELUAR",
                    "singkatan": "BBK",
                    "warnaJenis": "#FF8C00", 
                    "tahun": 2013,
                    "nomorAwal": "15...0000",
                    "nomorAkhir": "15...0036",
                    "jumlah": 37,
                    "status": "Aktif",
                    "keterangan": "Ini adalah data dummy.",
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
    }

    init();
});

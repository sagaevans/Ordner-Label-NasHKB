/* =========================================================
   PRINT LOGIC & MULTI-LABEL AUTO FIT (print.js)
   Versi: Auto Scale 90% (Fit to Printer Margin) + Custom Color
========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // --- Referensi DOM ---
    const templateSelect = document.getElementById('templateSelect');
    const btnExecutePrint = document.getElementById('btnExecutePrint');
    const printGrid = document.getElementById('printGrid');
    const labelTemplate = document.getElementById('labelTemplate');

    // =========================================================
    // DATABASE TEMPLATE LABEL (PARAMETER UKURAN MILIMETER)
    // Dimensi sudah dikali 90% agar pas dengan Hard Margin Printer
    // =========================================================
    const LABEL_TEMPLATES = {
        'a4-landscape-90': {
            nama: 'Otomatis Pas (Skala 90%)',
            widthMM: 63,     // 90% dari 70mm 
            heightMM: 180,   // 90% dari 200mm
            marginTopMM: 0,
            marginLeftMM: 0
        },
        'a4-landscape-max': {
            nama: 'Ukuran Penuh (Tanpa Margin)',
            widthMM: 70,
            heightMM: 200,
            marginTopMM: 0,
            marginLeftMM: 0
        }
    };

    /**
     * Memuat daftar template ke elemen Select
     */
    function initTemplates() {
        templateSelect.innerHTML = '';
        for (const [key, template] of Object.entries(LABEL_TEMPLATES)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = template.nama;
            templateSelect.appendChild(option);
        }
    }

    /**
     * Menyuntikkan nilai parameter template ke CSS Variables pada SEMUA label
     */
    function applyLabelSize(templateKey) {
        const config = LABEL_TEMPLATES[templateKey];
        if (!config) return;

        const wrappers = printGrid.querySelectorAll('.label-wrapper');
        
        wrappers.forEach(wrapper => {
            wrapper.style.setProperty('--label-width', `${config.widthMM}mm`);
            wrapper.style.setProperty('--label-height', `${config.heightMM}mm`);
            wrapper.style.setProperty('--label-mt', `${config.marginTopMM}mm`);
            wrapper.style.setProperty('--label-ml', `${config.marginLeftMM}mm`);
        });
    }

    /**
     * Mengambil ID dari URL, mengkloning template, dan mengisinya dengan data
     */
    async function renderLabels() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const idParam = urlParams.get('id');
        const idsParam = urlParams.get('ids');
        
        let targetIds = [];
        if (idsParam) {
            targetIds = idsParam.split(',');
        } else if (idParam) {
            targetIds = [idParam];
        }

        if (targetIds.length === 0) {
            printGrid.innerHTML = '<p style="color: red; padding: 20px;">Tidak ada Ordner yang dipilih untuk dicetak.</p>';
            return;
        }

        printGrid.innerHTML = '';
        const data = await loadData();

        targetIds.forEach(id => {
            const ordner = getOrdnerById(data, id);
            const clone = labelTemplate.content.cloneNode(true);
            
            const elNoUrut = clone.querySelector('.label-no-urut');
            const elJenis = clone.querySelector('.label-jenis');
            const elSingkatan = clone.querySelector('.label-singkatan');
            const elTahun = clone.querySelector('.label-tahun');
            const elNoAwal = clone.querySelector('.label-no-awal');
            const elNoAkhir = clone.querySelector('.label-no-akhir');

            if (ordner) {
                elNoUrut.textContent = ordner.noUrut || '-';
                elJenis.textContent = (ordner.jenis || '-').toUpperCase();
                elSingkatan.textContent = ordner.singkatan ? `(${ordner.singkatan.toUpperCase()})` : '';
                elTahun.textContent = ordner.tahun || '-';
                elNoAwal.textContent = ordner.nomorAwal || '...';
                elNoAkhir.textContent = ordner.nomorAkhir || '...';

                // --- APLIKASIKAN WARNA KUSTOM ---
                const warnaKustom = ordner.warnaJenis || '#FF8C00'; 
                elJenis.style.color = warnaKustom;
                elSingkatan.style.color = warnaKustom;

            } else {
                elNoUrut.textContent = '?';
                elJenis.textContent = 'DATA HILANG';
                elSingkatan.textContent = '';
                elTahun.textContent = '-';
                elNoAwal.textContent = '...';
                elNoAkhir.textContent = '...';
            }

            printGrid.appendChild(clone);
        });

        // Paksa ke template 90% secara default
        const defaultTemplateKey = 'a4-landscape-90';
        templateSelect.value = defaultTemplateKey;
        applyLabelSize(defaultTemplateKey);
    }

    templateSelect.addEventListener('change', (e) => {
        applyLabelSize(e.target.value);
    });

    btnExecutePrint.addEventListener('click', () => {
        window.print();
    });

    initTemplates();
    renderLabels();
});
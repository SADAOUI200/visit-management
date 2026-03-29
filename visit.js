/**
 * نظام إدارة الزيارات التفتيشية - نسخة مصلحة
 */

const FIELD_NAMES = [
    'المعرف', 'timestamp', 'اسم المفتش', 'التخصص', 'المرحلة',
    'اسم المعني بالزيارة', 'الرتبة', 'الدرجة', 'المؤسسة',
    'تاريخ الزيارة', 'نوع الزيارة', 'النقطة', 'العقوبات',
    'الملاحظة', 'الموسم الدراسي'
];

let allVisits = [];
let filteredVisits = [];
let columnMapping = {};

// ── توليد معرف فريد ─────────────────────────────────────────────
function generateId() {
    return 'VIS-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

function normalizeKey(str) {
    return String(str || '').normalize('NFC').trim().replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
}

// ── بناء خريطة الأعمدة ─────────────────────────────────────────
function buildMapping(firstRow, headerRow) {
    const mapping = {};
    let actualKeys = (headerRow && Array.isArray(headerRow)) 
        ? headerRow.map(h => normalizeKey(String(h))) 
        : Object.keys(firstRow || {});

    actualKeys.forEach((key, i) => {
        if (i < FIELD_NAMES.length) mapping[key] = FIELD_NAMES[i];
    });
    return mapping;
}

function getField(row, ...keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
        const norm = normalizeKey(key);
        if (row[norm] !== undefined && row[norm] !== null) return row[norm];
    }
    return '';
}

// ── جلب البيانات من Google Sheets ──────────────────────────────
async function fetchVisits() {
    showLoader();
    try {
        const visitsURL = getSheetURL('visits');
        const url = visitsURL + '?action=get&sheet=visit&sheetName=visit';
        const res = await fetchWithTimeout(url, { method: 'GET', mode: 'cors' }, 20000);
        const raw = await res.json();
        
        let data = [];
        if (Array.isArray(raw)) data = raw;
        else if (raw.data) data = raw.data;
        else if (raw.values) {
            const headers = raw.values[0];
            data = raw.values.slice(1).map(row => {
                let obj = {};
                headers.forEach((h, i) => obj[normalizeKey(h)] = row[i]);
                return obj;
            });
        }
        
        hideLoader();
        return { ok: true, data };
    } catch (err) {
        hideLoader();
        return { ok: false, data: [], msg: err.message };
    }
}

// ── عرض الجدول (الإصلاح الجوهري هنا) ───────────────────────────
function renderTable(visits, tableBodyId) {
    const tbody = document.getElementById(tableBodyId || 'visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" class="empty-state">📋 لا توجد زيارات للعرض</td></tr>`;
        return;
    }

    tbody.innerHTML = visits.map((v, i) => {
        return `
    <tr>
      <td>${i + 1}</td>
      <td title="${getField(v, 'المعرف', 'id')}">${(getField(v, 'المعرف', 'id') || '').substring(0, 8)}</td>
      <td>${formatDate(getField(v, 'timestamp')) || '-'}</td>
      <td>${getField(v, 'اسم المفتش', 'inspector')}</td>
      <td>${getField(v, 'التخصص', 'specialty')}</td>
      <td>${getField(v, 'المرحلة', 'stage')}</td>
      <td>${getField(v, 'اسم المعني بالزيارة', 'visitee')}</td>
      <td>${getField(v, 'الرتبة', 'rank')}</td>
      <td>${getField(v, 'الدرجة', 'grade')}</td>
      <td>${getField(v, 'المؤسسة', 'institution')}</td>
      <td>${getField(v, 'تاريخ الزيارة', 'visitDate')}</td>
      <td>${getField(v, 'نوع الزيارة', 'visitType')}</td>
      <td>${getField(v, 'النقطة', 'score')}</td>
      <td>${getField(v, 'العقوبات', 'penalties')}</td>
      <td>${getField(v, 'الموسم الدراسي', 'season')}</td>
    </tr>`;
    }).join('');
}

// ── تحميل البيانات مع مراعاة الرتب ──────────────────────────────
async function loadVisits() {
    const result = await fetchVisits();
    allVisits = result.data;
    const session = getSession();

    if (session && session.role === 'inspector') {
        filteredVisits = allVisits.filter(v => 
            normalizeKey(getField(v, 'اسم المفتش', 'inspector')) === normalizeKey(session.name)
        );
    } else {
        filteredVisits = allVisits;
    }

    renderTable(filteredVisits);
    document.getElementById('resultsCount').textContent = `${filteredVisits.length} نتيجة`;
}

// ── باقي الدوال (Search, Submit, etc.) تبقى كما هي في ملفك الأصلي ──
function applySearch() {
    const nameQ = (document.getElementById('searchName')?.value || '').trim().toLowerCase();
    const instQ = (document.getElementById('searchInst')?.value || '').trim().toLowerCase();
    const inspecQ = (document.getElementById('searchInspector')?.value || '').trim().toLowerCase();

    const searched = filteredVisits.filter(v => {
        const name = (getField(v, 'اسم المعني بالزيارة', 'visitee') || '').toLowerCase();
        const inst = (getField(v, 'المؤسسة', 'institution') || '').toLowerCase();
        const inspec = (getField(v, 'اسم المفتش', 'inspector') || '').toLowerCase();
        return (!nameQ || name.includes(nameQ)) && (!instQ || inst.includes(instQ)) && (!inspecQ || inspec.includes(inspecQ));
    });

    renderTable(searched);
}

function formatDate(val) {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString('ar-DZ');
}

async function handleVisitSubmit(e) {
    e.preventDefault();
    const session = getSession();
    const form = e.target;

    const visitData = {
        'المعرف': generateId(),
        'timestamp': new Date().toISOString(),
        'اسم المفتش': document.getElementById('inspectorSelect')?.value || session.name,
        'التخصص': form.specialty?.value,
        'المرحلة': form.stage?.value,
        'اسم المعني بالزيارة': form.visitee?.value,
        'الرتبة': form.rank?.value,
        'الدرجة': form.grade?.value,
        'المؤسسة': document.getElementById('institutionSelect')?.value,
        'تاريخ الزيارة': form.visitDate?.value,
        'نوع الزيارة': form.visitType?.value,
        'النقطة': form.score?.value,
        'العقوبات': form.penalties?.value,
        'الملاحظة': form.notes?.value,
        'الموسم الدراسي': form.season?.value
    };

    const res = await submitVisit(visitData);
    if (res.ok) {
        showToast('✅ تم الحفظ');
        form.reset();
        await loadVisits();
    }
}

async function submitVisit(formData) {
    showLoader();
    try {
        const visitsURL = getSheetURL('visits');
        await fetch(visitsURL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'insert', sheet: 'visit', data: formData })
        });
        hideLoader();
        return { ok: true };
    } catch (err) {
        hideLoader();
        return { ok: false };
    }
}
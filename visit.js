/**
 * نظام إدارة الزيارات التفتيشية - النسخة الاحترافية v5
 * المطور: سعداوي زين العابدين
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

// متغيرات الصفحة (Pagination)
let currentPage = 1;
const rowsPerPage = 10;

function generateId() {
    return 'VIS-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

function normalizeKey(str) {
    return String(str || '').normalize('NFC').trim().replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
}

function buildMapping(firstRow) {
    const mapping = {};
    const actualKeys = Object.keys(firstRow || {});
    FIELD_NAMES.forEach(f => {
        const normF = normalizeKey(f);
        const match = actualKeys.find(k => normalizeKey(k) === normF);
        if (match) mapping[f] = match;
    });
    return mapping;
}

function getField(row, fieldName) {
    const actualKey = columnMapping[fieldName] || fieldName;
    return row[actualKey] !== undefined ? row[actualKey] : '';
}

async function fetchVisits() {
    showLoader();
    try {
        const url = getSheetURL('visits') + '?action=get&sheet=visit';
        const res = await fetch(url);
        const raw = await res.json();
        let data = Array.isArray(raw) ? raw : (raw.data || []);
        if (data.length > 0) columnMapping = buildMapping(data[0]);
        hideLoader();
        return { ok: true, data };
    } catch (err) {
        hideLoader();
        return { ok: false, data: [] };
    }
}

// دالة عرض الجدول مع نظام الترقيم (Pagination)
function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="empty-state">لا توجد بيانات مسجلة</td></tr>';
        updatePaginationControls(0);
        return;
    }

    // حساب بداية ونهاية الصفحة
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedVisits = visits.slice(start, end);

    tbody.innerHTML = paginatedVisits.map((v, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td title="${getField(v, 'المعرف')}">${(getField(v, 'المعرف') || '').substring(0, 8)}</td>
            <td>${formatDate(getField(v, 'timestamp'))}</td>
            <td>${getField(v, 'اسم المفتش')}</td>
            <td>${getField(v, 'التخصص')}</td>
            <td>${getField(v, 'المرحلة')}</td>
            <td><strong>${getField(v, 'اسم المعني بالزيارة')}</strong></td>
            <td>${getField(v, 'الرتبة')}</td>
            <td>${getField(v, 'الدرجة')}</td>
            <td>${getField(v, 'المؤسسة')}</td>
            <td>${getField(v, 'تاريخ الزيارة')}</td>
            <td>${getField(v, 'نوع الزيارة')}</td>
            <td><span class="badge badge-accent">${getField(v, 'النقطة')}</span></td>
            <td>${getField(v, 'العقوبات') || '-'}</td>
            <td>${getField(v, 'الموسم الدراسي')}</td>
            <td class="note-cell">${getField(v, 'الملاحظة') || '-'}</td>
        </tr>`).join('');

    updatePaginationControls(visits.length);
}

function updatePaginationControls(totalRows) {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = `
        <button class="btn btn-sm" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>الأولى</button>
        <button class="btn btn-sm" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
        <span style="margin: 0 10px;">صفحة ${currentPage} من ${totalPages || 1}</span>
        <button class="btn btn-sm" onclick="changePage(1)" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>التالي</button>
        <button class="btn btn-sm" onclick="goToPage(${totalPages})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>الأخيرة</button>
    `;
}

function changePage(step) {
    currentPage += step;
    renderTable(filteredVisits);
}

function goToPage(page) {
    currentPage = page;
    renderTable(filteredVisits);
}

async function loadVisits() {
    const result = await fetchVisits();
    allVisits = result.data;
    const session = getSession();
    filteredVisits = (session && session.role === 'inspector') 
        ? allVisits.filter(v => normalizeKey(getField(v, 'اسم المفتش')) === normalizeKey(session.name))
        : allVisits;
    currentPage = 1;
    renderTable(filteredVisits);
}

function applySearch() {
    const nameQ = (document.getElementById('searchName')?.value || '').toLowerCase();
    const instQ = (document.getElementById('searchInst')?.value || '').toLowerCase();
    const inspQ = (document.getElementById('searchInspector')?.value || '').toLowerCase();
    
    filteredVisits = allVisits.filter(v => {
        const name = (getField(v, 'اسم المعني بالزيارة') || '').toLowerCase();
        const inst = (getField(v, 'المؤسسة') || '').toLowerCase();
        const insp = (getField(v, 'اسم المفتش') || '').toLowerCase();
        return name.includes(nameQ) && inst.includes(instQ) && insp.includes(inspQ);
    });
    currentPage = 1;
    renderTable(filteredVisits);
}

function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString('ar-DZ');
}

async function handleVisitSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const visitData = {
        'المعرف': generateId(),
        'timestamp': new Date().toISOString(),
        'اسم المفتش': document.getElementById('inspectorSelect').value,
        'التخصص': document.getElementById('specialty').value,
        'المرحلة': form.stage.value,
        'اسم المعني بالزيارة': form.visitee.value,
        'الرتبة': form.rank.value,
        'الدرجة': form.grade.value,
        'المؤسسة': document.getElementById('institutionSelect').value,
        'تاريخ الزيارة': form.visitDate.value,
        'نوع الزيارة': form.visitType.value,
        'النقطة': form.score.value,
        'العقوبات': form.penalties.value,
        'الملاحظة': form.notes.value,
        'الموسم الدراسي': form.season.value
    };

    showLoader();
    try {
        await fetch(getSheetURL('visits'), {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'insert', sheet: 'visit', data: visitData })
        });
        showToast('✅ تم الحفظ بنجاح');
        form.reset();
        await loadVisits();
    } catch (err) { console.error(err); }
    hideLoader();
}
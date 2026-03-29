/**
 * نظام إدارة الزيارات التفتيشية - النسخة الاحترافية الكاملة
 * visit.js – الحفاظ على نظام Mapping الأصلي + إصلاح الملاحظة والتخصص
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

// ── توليد معرف فريد (نفس منطقك الأصلي) ─────────────────────────────
function generateId() {
    return 'VIS-' + Math.random().toString(36).substr(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

function normalizeKey(str) {
    return String(str || '').normalize('NFC').trim().replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
}

// ── بناء خريطة الأعمدة (دالة حيوية أعيدت بالكامل) ──────────────────────────
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

// ── جلب البيانات ──────────────────────────────────────────────
async function fetchVisits() {
    if (typeof showLoader === 'function') showLoader();
    try {
        const url = getSheetURL('visits') + '?action=get&sheet=visit';
        const res = await fetch(url);
        const raw = await res.json();
        let data = Array.isArray(raw) ? raw : (raw.data || []);
        
        if (data.length > 0) {
            columnMapping = buildMapping(data[0]);
        }
        
        if (typeof hideLoader === 'function') hideLoader();
        return { ok: true, data };
    } catch (err) {
        if (typeof hideLoader === 'function') hideLoader();
        return { ok: false, data: [] };
    }
}

// ── عرض الجدول (تم إضافة عمود الملاحظة بدقة) ───────────────────────────
function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="empty-state">لا توجد بيانات للعرض</td></tr>';
        return;
    }

    tbody.innerHTML = visits.map((v, i) => `
        <tr>
            <td>${i + 1}</td>
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
}

async function loadVisits() {
    const result = await fetchVisits();
    allVisits = result.data;
    const session = getSession();
    
    filteredVisits = (session && session.role === 'inspector') 
        ? allVisits.filter(v => normalizeKey(getField(v, 'اسم المفتش')) === normalizeKey(session.name))
        : allVisits;
        
    renderTable(filteredVisits);
    if(document.getElementById('resultsCount')) 
        document.getElementById('resultsCount').textContent = `${filteredVisits.length} نتيجة`;
}

// ── معالجة الإرسال ──────────────────────────────────────────────
async function handleVisitSubmit(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('visitForm');
    
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
        'الملاحظة': document.getElementById('notes').value,
        'الموسم الدراسي': form.season.value
    };

    if (typeof showLoader === 'function') showLoader();
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

function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d) ? val : d.toLocaleDateString('ar-DZ');
}

function applySearch() {
    const nameQ = (document.getElementById('searchName')?.value || '').toLowerCase();
    const instQ = (document.getElementById('searchInst')?.value || '').toLowerCase();
    
    const res = filteredVisits.filter(v => {
        const name = (getField(v, 'اسم المعني بالزيارة') || '').toLowerCase();
        const inst = (getField(v, 'المؤسسة') || '').toLowerCase();
        return name.includes(nameQ) && inst.includes(instQ);
    });
    renderTable(res);
}
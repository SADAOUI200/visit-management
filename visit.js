/**
 * نظام إدارة الزيارات التفتيشية - المطور: سعداوي زين العابدين
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz_S2kmEp4M2cDBb5RIkNwhSJroFGQpgKsm7rInYqqIblGzex5zzR5xUN2dhEU7eFLR/exec';

const FIELD_NAMES = [
    'المعرف', 'timestamp', 'اسم المفتش', 'التخصص', 'المرحلة',
    'اسم المعني بالزيارة', 'الرتبة', 'الدرجة', 'المؤسسة',
    'تاريخ الزيارة', 'نوع الزيارة', 'النقطة', 'العقبات',
    'الملاحظة', 'الموسم الدراسي'
];

let allVisits = [];
let filteredVisits = [];
let columnMapping = {};
let currentPage = 1;
const rowsPerPage = 10;

function generateId() {
    return 'VIS-' + Date.now().toString(36).toUpperCase();
}

function formatDate(val) {
    if (!val || val === '-') return '-';
    const d = new Date(val);
    return isNaN(d) ? val : d.toISOString().split('T')[0];
}

function getField(row, fieldName) {
    const actualKey = columnMapping[fieldName] || fieldName;
    return row[actualKey] !== undefined ? row[actualKey] : '';
}

function buildMapping(firstRow) {
    const mapping = {};
    const actualKeys = Object.keys(firstRow || {});
    FIELD_NAMES.forEach(f => {
        const match = actualKeys.find(k => k.trim() === f.trim());
        if (match) mapping[f] = match;
    });
    return mapping;
}

// جلب البيانات وعرضها
async function loadVisits() {
    if (window.showLoader) showLoader();
    try {
        const res = await fetch(`${SCRIPT_URL}?action=get&sheetName=visits&t=${Date.now()}`);
        const data = await res.json();
        allVisits = Array.isArray(data) ? data : [];
        if (allVisits.length > 0) columnMapping = buildMapping(allVisits[0]);
        applySearch();
    } catch (err) {
        console.error("خطأ في الجلب:", err);
    }
    if (window.hideLoader) hideLoader();
}

function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">لا توجد بيانات حالياً</td></tr>';
        updatePaginationControls(0);
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const paginated = visits.slice(start, start + rowsPerPage);

    tbody.innerHTML = paginated.map((v, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td title="${getField(v, 'المعرف')}">${(getField(v, 'المعرف') || '').substring(0, 8)}</td>
            <td>${getField(v, 'timestamp')}</td>
            <td>${getField(v, 'اسم المفتش')}</td>
            <td>${getField(v, 'التخصص')}</td>
            <td>${getField(v, 'المرحلة')}</td>
            <td><strong>${getField(v, 'اسم المعني بالزيارة')}</strong></td>
            <td>${getField(v, 'الرتبة')}</td>
            <td>${getField(v, 'الدرجة')}</td>
            <td>${getField(v, 'المؤسسة')}</td>
            <td>${formatDate(getField(v, 'تاريخ الزيارة'))}</td>
            <td>${getField(v, 'نوع الزيارة')}</td>
            <td><span class="badge badge-accent">${getField(v, 'النقطة')}</span></td>
            <td>${getField(v, 'العقبات')}</td>
            <td>${getField(v, 'الموسم الدراسي')}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editVisit('${getField(v, 'المعرف')}')">📝</button>
                    <button class="btn-delete" onclick="deleteVisit('${getField(v, 'المعرف')}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    updatePaginationControls(visits.length);
}

// أزرار التنقل (السابق والتالي)
function updatePaginationControls(total) {
    const pages = Math.ceil(total / rowsPerPage);
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    container.innerHTML = `
        <button class="btn btn-sm" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
        <span style="margin: 0 15px; font-weight: bold;">صفحة ${currentPage} من ${pages || 1}</span>
        <button class="btn btn-sm" onclick="changePage(1)" ${currentPage >= pages ? 'disabled' : ''}>التالي</button>
    `;
}

function changePage(step) {
    currentPage += step;
    renderTable(filteredVisits);
}

async function handleVisitSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const isEdit = !!editId;

    const visitData = {
        'action': isEdit ? 'update' : 'insert',
        'sheetName': 'visits',
        'المعرف': isEdit ? editId : generateId(),
        'timestamp': new Date().toLocaleString('ar-DZ'),
        'اسم المفتش': document.getElementById('inspectorSelect').value,
        'التخصص': document.getElementById('specialty').value,
        'المرحلة': document.getElementById('stageSelect').value,
        'اسم المعني بالزيارة': document.getElementById('visitee').value,
        'الرتبة': document.getElementById('rank').value,
        'الدرجة': document.getElementById('grade').value,
        'المؤسسة': document.getElementById('institutionSelect').value,
        'تاريخ الزيارة': document.getElementById('vDate').value,
        'نوع الزيارة': document.getElementById('visitType').value,
        'النقطة': document.getElementById('score').value || '0',
        'العقبات': document.getElementById('penalties').value,
        'الملاحظة': document.getElementById('notes').value,
        'الموسم الدراسي': document.getElementById('season').value
    };

    if (window.showLoader) showLoader();
    try {
        const params = new URLSearchParams(visitData).toString();
        await fetch(`${SCRIPT_URL}?${params}`, { method: 'POST', mode: 'no-cors' });
        alert(isEdit ? '✅ تم التعديل بنجاح' : '✅ تم الحفظ بنجاح');
        resetForm();
        setTimeout(loadVisits, 1500); // تأخير بسيط لضمان تحديث جوجل شيت
    } catch (err) {
        alert('❌ خطأ في الاتصال');
    }
    if (window.hideLoader) hideLoader();
}

function applySearch() {
    const q = (document.getElementById('searchName')?.value || '').toLowerCase();
    filteredVisits = allVisits.filter(v => 
        String(getField(v, 'اسم المعني بالزيارة')).toLowerCase().includes(q) ||
        String(getField(v, 'المؤسسة')).toLowerCase().includes(q)
    );
    currentPage = 1;
    renderTable(filteredVisits);
}

function resetForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = '✏️ تسجيل زيارة جديدة';
    document.getElementById('submitBtn').innerText = '📥 حفظ البيانات';
}
/**
 * نظام إدارة الزيارات التفتيشية - المطور: سعداوي زين العابدين
 * نسخة معالجة لتعطل الوظائف - 2026
 */

// الرابط المباشر والنهائي الذي قدمته
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

// دالة توليد المعرف
function generateId() {
    return 'VIS-' + Date.now().toString(36).toUpperCase();
}

// دالة تنسيق التاريخ
function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    return isNaN(d) ? val : d.toISOString().split('T')[0];
}

// دالة جلب قيمة الحقل بأمان
function getField(row, fieldName) {
    const actualKey = columnMapping[fieldName] || fieldName;
    return row[actualKey] !== undefined ? row[actualKey] : '';
}

// بناء خريطة الأعمدة لتجنب أخطاء الترتيب في الشيت
function buildMapping(firstRow) {
    const mapping = {};
    const actualKeys = Object.keys(firstRow || {});
    FIELD_NAMES.forEach(f => {
        const match = actualKeys.find(k => k.trim() === f.trim());
        if (match) mapping[f] = match;
    });
    return mapping;
}

// ── 1. جلب البيانات (عرض الجدول) ──
async function loadVisits() {
    if (typeof showLoader === 'function') showLoader();
    try {
        const response = await fetch(`${SCRIPT_URL}?action=get&sheetName=visits`);
        const data = await response.json();
        
        allVisits = Array.isArray(data) ? data : (data.data || []);
        if (allVisits.length > 0) columnMapping = buildMapping(allVisits[0]);
        
        applySearch(); // لتحديث العرض
    } catch (err) {
        console.error("خطأ في جلب البيانات:", err);
    }
    if (typeof hideLoader === 'function') hideLoader();
}

// ── 2. رسم الجدول ──
function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" style="text-align:center;">لا توجد بيانات حالياً</td></tr>';
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
                    <button class="btn btn-sm btn-edit" onclick="editVisit('${getField(v, 'المعرف')}')">📝</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteVisit('${getField(v, 'المعرف')}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationControls(visits.length);
}

// ── 3. حفظ البيانات (إضافة/تعديل) ──
async function handleVisitSubmit(e) {
    e.preventDefault();
    const form = e.target;
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

    if (typeof showLoader === 'function') showLoader();
    try {
        const params = new URLSearchParams(visitData).toString();
        // إرسال كـ GET لضمان وصول المعاملات بنجاح تام مع Apps Script
        await fetch(`${SCRIPT_URL}?${params}`, { method: 'POST', mode: 'no-cors' });
        
        alert(isEdit ? '✅ تم التعديل بنجاح' : '✅ تم الحفظ بنجاح');
        resetForm();
        await loadVisits();
    } catch (err) {
        alert('❌ فشل في العملية');
    }
    if (typeof hideLoader === 'function') hideLoader();
}

// ── 4. التعديل والحذف ──
function editVisit(id) {
    const v = allVisits.find(visit => getField(visit, 'المعرف') === id);
    if (!v) return;

    document.getElementById('editId').value = getField(v, 'المعرف');
    document.getElementById('visitee').value = getField(v, 'اسم المعني بالزيارة');
    document.getElementById('vDate').value = formatDate(getField(v, 'تاريخ الزيارة'));
    document.getElementById('score').value = getField(v, 'النقطة');
    document.getElementById('rank').value = getField(v, 'الرتبة');
    document.getElementById('grade').value = getField(v, 'الدرجة');
    document.getElementById('inspectorSelect').value = getField(v, 'اسم المفتش');
    document.getElementById('specialty').value = getField(v, 'التخصص');
    document.getElementById('institutionSelect').innerHTML = `<option value="${getField(v, 'المؤسسة')}">${getField(v, 'المؤسسة')}</option>`;
    
    document.getElementById('formTitle').innerText = '📝 تعديل سجل زيارة';
    document.getElementById('submitBtn').innerText = '💾 حفظ التعديلات';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteVisit(id) {
    if (!confirm('حذف نهائي؟')) return;
    if (typeof showLoader === 'function') showLoader();
    try {
        await fetch(`${SCRIPT_URL}?action=delete&id=${id}&sheetName=visits`, { method: 'POST', mode: 'no-cors' });
        alert('✅ تم الحذف');
        await loadVisits();
    } catch (err) { console.error(err); }
    if (typeof hideLoader === 'function') hideLoader();
}

// ── 5. البحث والترقيم ──
function applySearch() {
    const nameQuery = (document.getElementById('searchName')?.value || '').toLowerCase();
    filteredVisits = allVisits.filter(v => 
        String(getField(v, 'اسم المعني بالزيارة')).toLowerCase().includes(nameQuery) ||
        String(getField(v, 'المؤسسة')).toLowerCase().includes(nameQuery)
    );
    renderTable(filteredVisits);
}

function updatePaginationControls(total) {
    const pages = Math.ceil(total / rowsPerPage);
    const container = document.getElementById('paginationControls');
    if (container) container.innerHTML = `صفحة ${currentPage} من ${pages || 1}`;
}

function resetForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = '✏️ تسجيل زيارة جديدة';
    document.getElementById('submitBtn').innerText = '📥 حفظ البيانات';
    document.getElementById('cancelBtn').style.display = 'none';
}
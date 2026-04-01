/**
 * نظام إدارة الزيارات التفتيشية - المطور: سعداوي زين العابدين
 */

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

function formatScore(val) {
    if (val === undefined || val === null || val === '') return '0';
    if (val instanceof Date || (typeof val === 'string' && val.includes('GMT'))) return '0';
    const num = parseFloat(val);
    return isNaN(num) ? '0' : num;
}

function formatDate(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toISOString().split('T')[0];
}

// ─── وظيفة الحذف (المعدلة للعمل مع الشيت) ───
async function deleteVisit(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل من قاعدة البيانات نهائياً؟')) return;
    if (typeof showLoader === 'function') showLoader();
    try {
        // الإرسال عبر Parameters لضمان قبول السكريبت للطلب
        const deleteUrl = `${SCRIPT_URL}?action=delete&sheetName=visits&المعرف=${id}`;
        await fetch(deleteUrl, { method: 'POST', mode: 'no-cors' });
        
        alert('🗑️ تم إرسال طلب الحذف بنجاح');
        // تحديث الجدول محلياً فوراً ثم الجلب من السيرفر
        allVisits = allVisits.filter(v => getField(v, 'المعرف') !== id);
        applySearch();
        setTimeout(loadVisits, 2000); 
    } catch (err) {
        console.error("Delete error:", err);
        alert('❌ فشل في عملية الحذف');
    }
    if (typeof hideLoader === 'function') hideLoader();
}

// ─── وظيفة التعديل (المعدلة لتعبئة كل الحقول) ───
async function editVisit(id) {
    const v = allVisits.find(item => getField(item, 'المعرف') === id);
    if (!v) return;

    // 1. تعبئة الحقول الأساسية
    document.getElementById('editId').value = id;
    document.getElementById('visitee').value = getField(v, 'اسم المعني بالزيارة');
    document.getElementById('rank').value = getField(v, 'الرتبة');
    document.getElementById('grade').value = getField(v, 'الدرجة');
    document.getElementById('vDate').value = formatDate(getField(v, 'تاريخ الزيارة'));
    document.getElementById('score').value = formatScore(getField(v, 'النقطة'));
    document.getElementById('penalties').value = getField(v, 'العقبات') || 'لا شيء';
    document.getElementById('notes').value = getField(v, 'الملاحظة') || 'العمل بالتوجيهات والتوصيات المقدمة';

    // 2. معالجة القوائم المرتبطة (تفعيلها واختيار القيم)
    const stage = getField(v, 'المرحلة');
    const institution = getField(v, 'المؤسسة');
    const inspector = getField(v, 'اسم المفتش');

    document.getElementById('stageSelect').value = stage;
    
    // تفعيل وتعبئة المفتشين والمؤسسات بناءً على المرحلة
    if (typeof filterLists === 'function') {
        filterLists(); // هذه الدالة موجودة في سكريبت الـ HTML لتعبئة القوائم
        document.getElementById('inspectorSelect').value = inspector;
        document.getElementById('institutionSelect').value = institution;
        document.getElementById('specialty').value = getField(v, 'التخصص');
    }

    // 3. تغيير مظهر الزر
    document.getElementById('formTitle').innerText = '📝 تعديل بيانات الزيارة';
    document.getElementById('submitBtn').innerText = '💾 حفظ التعديلات السحابية';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── وظيفة الترقيم (مع إعادة زر الصفحة الأخيرة) ───
function updatePaginationControls(totalRows) {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    container.innerHTML = `
        <button class="btn btn-sm" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>الأولى</button>
        <button class="btn btn-sm" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
        <span style="margin: 0 10px; font-weight: bold;">${currentPage} / ${totalPages || 1}</span>
        <button class="btn btn-sm" onclick="changePage(1)" ${currentPage >= totalPages ? 'disabled' : ''}>التالي</button>
        <button class="btn btn-sm" onclick="goToPage(${totalPages})" ${currentPage >= totalPages || totalPages === 0 ? 'disabled' : ''}>الأخيرة</button>
    `;
}

// ─── بقية الدوال الأساسية ───
async function handleVisitSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const action = editId ? 'update' : 'insert';

    const visitData = {
        'action': action,
        'sheetName': 'visits',
        'المعرف': editId || generateId(),
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
        'النقطة': document.getElementById('score').value,
        'العقبات': document.getElementById('penalties').value,
        'الملاحظة': document.getElementById('notes').value,
        'الموسم الدراسي': document.getElementById('season').value
    };

    if (typeof showLoader === 'function') showLoader();
    try {
        const params = new URLSearchParams(visitData).toString();
        await fetch(`${SCRIPT_URL}?${params}`, { method: 'POST', mode: 'no-cors' });
        
        alert(editId ? '✅ تم تحديث البيانات بنجاح' : '✅ تم الحفظ بنجاح');
        resetForm();
        setTimeout(loadVisits, 1500); 
    } catch (err) { console.error(err); }
    if (typeof hideLoader === 'function') hideLoader();
}

function resetForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = '✏️ تسجيل زيارة جديدة';
    document.getElementById('submitBtn').innerText = '📥 حفظ وإرسال البيانات';
    document.getElementById('cancelBtn').style.display = 'none';
}

function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;
    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="17" style="text-align:center;">لا توجد سجلات</td></tr>';
        updatePaginationControls(0);
        return;
    }
    const start = (currentPage - 1) * rowsPerPage;
    const paginated = visits.slice(start, start + rowsPerPage);
    tbody.innerHTML = paginated.map((v, i) => `
        <tr>
            <td>${start + i + 1}</td>
            <td>${(getField(v, 'المعرف') || '').substring(0, 8)}</td>
            <td>${formatDate(getField(v, 'timestamp'))}</td>
            <td>${getField(v, 'اسم المفتش')}</td>
            <td>${getField(v, 'التخصص')}</td>
            <td>${getField(v, 'المرحلة')}</td>
            <td><strong>${getField(v, 'اسم المعني بالزيارة')}</strong></td>
            <td>${getField(v, 'الرتبة')}</td>
            <td>${getField(v, 'الدرجة')}</td>
            <td>${getField(v, 'المؤسسة')}</td>
            <td>${formatDate(getField(v, 'تاريخ الزيارة'))}</td>
            <td>${getField(v, 'نوع الزيارة')}</td>
            <td><span class="badge badge-accent">${formatScore(getField(v, 'النقطة'))}</span></td>
            <td>${getField(v, 'العقبات') || 'لا شيء'}</td>
            <td>${getField(v, 'الموسم الدراسي')}</td>
            <td>${getField(v, 'الملاحظة')}</td>
            <td class="action-btns">
                <button class="btn-edit" onclick="editVisit('${getField(v, 'المعرف')}')">📝</button>
                <button class="btn-delete" onclick="deleteVisit('${getField(v, 'المعرف')}')">🗑️</button>
            </td>
        </tr>`).join('');
    updatePaginationControls(visits.length);
}

function changePage(step) { currentPage += step; renderTable(filteredVisits); }
function goToPage(p) { currentPage = p; renderTable(filteredVisits); }
async function loadVisits() { 
    if (typeof showLoader === 'function') showLoader();
    try {
        const res = await fetch(`${SCRIPT_URL}?action=get&sheetName=visits&t=${Date.now()}`);
        const data = await res.json();
        allVisits = Array.isArray(data) ? data : [];
        if (allVisits.length > 0) columnMapping = buildMapping(allVisits[0]);
        applySearch();
    } catch(e) {}
    if (typeof hideLoader === 'function') hideLoader();
}
function applySearch() {
    const q = (document.getElementById('searchName')?.value || '').toLowerCase();
    filteredVisits = allVisits.filter(v => getField(v, 'اسم المعني بالزيارة').toLowerCase().includes(q));
    currentPage = 1; renderTable(filteredVisits);
}
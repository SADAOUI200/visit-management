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

// توليد معرف فريد
function generateId() {
    return 'VIS-' + Math.random().toString(36).substr(2, 5).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
}

// تنسيق التاريخ ليكون YYYY-MM-DD
function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toISOString().split('T')[0];
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

// ── جلب البيانات من الشيت ──
async function loadVisits() {
    showLoader();
    try {
        const url = `${SCRIPT_URL}?action=get&sheet=visits`;
        const res = await fetch(url);
        const raw = await res.json();
        allVisits = Array.isArray(raw) ? raw : (raw.data || []);
        if (allVisits.length > 0) columnMapping = buildMapping(allVisits[0]);
        applySearch();
    } catch (err) { 
        console.error("Load error:", err); 
    }
    hideLoader();
}

// ── عرض البيانات في الجدول ──
function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * rowsPerPage;
    const paginated = visits.slice(start, start + rowsPerPage);

    tbody.innerHTML = paginated.map((v, i) => {
        let score = getField(v, 'النقطة');
        if (score && score.toString().includes('GMT')) score = '0';

        return `
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
            <td>${formatDate(getField(v, 'تاريخ الزيارة'))}</td>
            <td>${getField(v, 'نوع الزيارة')}</td>
            <td><span class="badge badge-accent">${score}</span></td>
            <td>${getField(v, 'العقبات') || 'لا شيء'}</td>
            <td>${getField(v, 'الموسم الدراسي')}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-edit" onclick="editVisit('${getField(v, 'المعرف')}')">📝</button>
                    <button class="btn btn-sm btn-delete" onclick="deleteVisit('${getField(v, 'المعرف')}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    updatePaginationControls(visits.length);
}

// ── معالجة الحفظ (إرسال المعاملات عبر الرابط) ──
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
        'اسم المعني بالزيارة': form.visitee.value,
        'الرتبة': form.rank.value,
        'الدرجة': form.grade.value,
        'المؤسسة': document.getElementById('institutionSelect').value,
        'تاريخ الزيارة': form.visitDate.value,
        'نوع الزيارة': form.visitType.value,
        'النقطة': form.score.value || '0',
        'العقبات': form.penalties.value,
        'الملاحظة': form.notes.value,
        'الموسم الدراسي': form.season.value
    };

    // منع التكرار عند الإضافة الجديدة
    if (!isEdit) {
        const duplicate = allVisits.some(v => 
            String(getField(v, 'اسم المعني بالزيارة')).trim() === visitData['اسم المعني بالزيارة'].trim() && 
            formatDate(getField(v, 'تاريخ الزيارة')) === visitData['تاريخ الزيارة']
        );
        if (duplicate) return alert('⚠️ هذا المعني مسجل بالفعل في هذا التاريخ!');
    }

    showLoader();
    try {
        const params = new URLSearchParams(visitData).toString();
        // إرسال البيانات كـ Query Parameters لضمان تخطي مشاكل CORS والحفظ
        await fetch(`${SCRIPT_URL}?${params}`, {
            method: 'POST',
            mode: 'no-cors'
        });
        
        alert(isEdit ? '✅ تم تحديث البيانات بنجاح' : '✅ تم حفظ الزيارة بنجاح');
        resetForm();
        await loadVisits();
    } catch (err) {
        console.error("Submit error:", err);
        alert('❌ فشل الاتصال بالخادم');
    }
    hideLoader();
}

// ── التعديل ──
function editVisit(id) {
    const v = allVisits.find(visit => getField(visit, 'المعرف') === id);
    if (!v) return;
    
    document.getElementById('editId').value = getField(v, 'المعرف');
    document.getElementById('visitee').value = getField(v, 'اسم المعني بالزيارة');
    document.getElementById('vDate').value = formatDate(getField(v, 'تاريخ الزيارة'));
    document.getElementById('score').value = getField(v, 'النقطة');
    document.getElementById('rank').value = getField(v, 'الرتبة');
    document.getElementById('grade').value = getField(v, 'الدرجة');
    document.getElementById('penalties').value = getField(v, 'العقبات');
    document.getElementById('season').value = getField(v, 'الموسم الدراسي');
    document.getElementById('visitType').value = getField(v, 'نوع الزيارة');
    document.getElementById('notes').value = getField(v, 'الملاحظة');

    document.getElementById('formTitle').innerText = '📝 تعديل بيانات الزيارة';
    document.getElementById('submitBtn').innerText = '💾 حفظ التعديلات';
    document.getElementById('cancelBtn').style.display = 'inline-block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── الحذف ──
async function deleteVisit(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
    showLoader();
    try {
        const url = `${SCRIPT_URL}?action=delete&id=${id}&sheetName=visits`;
        await fetch(url, { method: 'POST', mode: 'no-cors' });
        alert('✅ تم الحذف بنجاح');
        await loadVisits();
    } catch (err) { 
        console.error(err); 
    }
    hideLoader();
}

// ── إعادة ضبط النموذج ──
function resetForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = '✏️ تسجيل زيارة جديدة';
    document.getElementById('submitBtn').innerText = '📥 حفظ البيانات';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('vDate').value = new Date().toISOString().split('T')[0];
}

// ── البحث والفلترة ──
function applySearch() {
    const n = (document.getElementById('searchName')?.value || '').toLowerCase();
    const inst = (document.getElementById('searchInst')?.value || '').toLowerCase();
    const insp = (document.getElementById('searchInspector')?.value || '').toLowerCase();
    
    filteredVisits = allVisits.filter(v => 
        String(getField(v, 'اسم المعني بالزيارة')).toLowerCase().includes(n) &&
        String(getField(v, 'المؤسسة')).toLowerCase().includes(inst) &&
        String(getField(v, 'اسم المفتش')).toLowerCase().includes(insp)
    );
    currentPage = 1; 
    renderTable(filteredVisits);
}

// ── التحكم في الترقيم ──
function updatePaginationControls(total) {
    const pages = Math.ceil(total / rowsPerPage);
    const container = document.getElementById('paginationControls');
    if (!container) return;
    
    container.innerHTML = `
        <button class="btn btn-sm" onclick="currentPage=1;renderTable(filteredVisits)" ${currentPage===1?'disabled':''}>الأولى</button>
        <span style="font-weight:bold; margin: 0 10px;">صفحة ${currentPage} من ${pages || 1}</span>
        <button class="btn btn-sm" onclick="currentPage=${pages || 1};renderTable(filteredVisits)" ${currentPage===pages||pages===0?'disabled':''}>الأخيرة</button>
    `;
}
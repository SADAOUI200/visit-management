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

function generateId() { return 'VIS-' + Math.random().toString(36).substr(2, 8).toUpperCase(); }

function normalizeKey(str) { return String(str || '').trim().replace(/\s+/g, ' '); }

function buildMapping(firstRow) {
    const mapping = {};
    const actualKeys = Object.keys(firstRow || {});
    FIELD_NAMES.forEach(f => {
        const match = actualKeys.find(k => normalizeKey(k) === normalizeKey(f));
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
        const data = await res.json();
        const finalData = Array.isArray(data) ? data : (data.data || []);
        if (finalData.length > 0) columnMapping = buildMapping(finalData[0]);
        hideLoader();
        return { ok: true, data: finalData };
    } catch (err) {
        hideLoader();
        return { ok: false, data: [] };
    }
}

function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    const start = (currentPage - 1) * rowsPerPage;
    const paginated = visits.slice(start, start + rowsPerPage);

    tbody.innerHTML = paginated.map((v, i) => {
        // حل مشكلة التاريخ في حقل النقطة
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

function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d)) return val;
    return d.toISOString().split('T')[0];
}

async function handleVisitSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isEdit = !!document.getElementById('editId').value;
    
    // منع التكرار (فقط في حالة التسجيل الجديد)
    if (!isEdit) {
        const isDuplicate = allVisits.some(v => 
            getField(v, 'اسم المعني بالزيارة').trim() === form.visitee.value.trim() && 
            formatDate(getField(v, 'تاريخ الزيارة')) === form.visitDate.value
        );
        if (isDuplicate) return alert('⚠️ هذا المعني مسجل بالفعل في هذا التاريخ!');
    }

    const visitData = {
        'المعرف': isEdit ? document.getElementById('editId').value : generateId(),
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
        'العقبات': form.penalties.value,
        'الملاحظة': form.notes.value,
        'الموسم الدراسي': form.season.value
    };

    showLoader();
    try {
        const SCRIPT_URL = getSheetURL('visits');
        const action = isEdit ? 'update' : 'insert';
        // إرسال كـ GET/POST حسب إعداد الـ Apps Script الخاص بك (هنا نستخدم no-cors للصامت)
        const params = new URLSearchParams(visitData);
        params.append("action", action);
        params.append("sheetName", "visits");
        
        await fetch(`${SCRIPT_URL}?${params.toString()}`, { method: 'POST', mode: 'no-cors' });
        
        alert(isEdit ? '✅ تم التعديل بنجاح' : '✅ تم الحفظ بنجاح');
        resetForm();
        await loadVisits();
    } catch (err) { console.error(err); }
    hideLoader();
}

function editVisit(id) {
    const v = allVisits.find(visit => getField(visit, 'المعرف') === id);
    if (!v) return;

    document.getElementById('formTitle').innerText = '📝 تعديل بيانات الزيارة';
    document.getElementById('editId').value = getField(v, 'المعرف');
    document.getElementById('visitee').value = getField(v, 'اسم المعني بالزيارة');
    document.getElementById('vDate').value = formatDate(getField(v, 'تاريخ الزيارة'));
    document.getElementById('score').value = getField(v, 'النقطة');
    document.getElementById('rank').value = getField(v, 'الرتبة');
    document.getElementById('grade').value = getField(v, 'الدرجة');
    document.getElementById('penalties').value = getField(v, 'العقبات');
    document.getElementById('season').value = getField(v, 'الموسم الدراسي');
    
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('submitBtn').innerText = '💾 حفظ التعديلات';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('visitForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('formTitle').innerText = '✏️ تسجيل زيارة جديدة';
    document.getElementById('submitBtn').innerText = '📥 حفظ البيانات';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('vDate').value = new Date().toISOString().split('T')[0];
}

async function deleteVisit(id) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    showLoader();
    try {
        const url = `${getSheetURL('visits')}?action=delete&id=${id}&sheetName=visits`;
        await fetch(url, { method: 'POST', mode: 'no-cors' });
        alert('✅ تم طلب الحذف');
        await loadVisits();
    } catch (err) { console.error(err); }
    hideLoader();
}

function applySearch() {
    const n = (document.getElementById('searchName').value || '').toLowerCase();
    const inst = (document.getElementById('searchInst').value || '').toLowerCase();
    const insp = (document.getElementById('searchInspector').value || '').toLowerCase();
    filteredVisits = allVisits.filter(v => 
        getField(v, 'اسم المعني بالزيارة').toLowerCase().includes(n) &&
        getField(v, 'المؤسسة').toLowerCase().includes(inst) &&
        getField(v, 'اسم المفتش').toLowerCase().includes(insp)
    );
    currentPage = 1; renderTable(filteredVisits);
}

async function loadVisits() {
    const res = await fetchVisits();
    allVisits = res.data;
    filteredVisits = [...allVisits];
    renderTable(filteredVisits);
}

function updatePaginationControls(total) {
    const pages = Math.ceil(total / rowsPerPage);
    const container = document.getElementById('paginationControls');
    container.innerHTML = `
        <button class="btn btn-sm" onclick="currentPage=1;renderTable(filteredVisits)" ${currentPage===1?'disabled':''}>اول</button>
        <span style="font-weight:bold">${currentPage} / ${pages || 1}</span>
        <button class="btn btn-sm" onclick="currentPage=${pages};renderTable(filteredVisits)" ${currentPage===pages||pages===0?'disabled':''}>اخر</button>
    `;
}
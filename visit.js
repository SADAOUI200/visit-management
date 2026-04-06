/**
 * نظام إدارة الزيارات التفتيشية - نسخة مصلحة التكوين والتفتيش
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

// ── متغيرات الترقيم (Pagination) ──────────────────────────────
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

// ── جلب البيانات ──────────────────────────────────────────────
async function fetchVisits() {
    if (typeof showLoader === 'function') showLoader();
    try {
        const url = getSheetURL('visits') + '?action=get&sheet=visit';
        const res = await fetch(url);
        const raw = await res.json();
        let data = Array.isArray(raw) ? raw : (raw.data || []);
        if (data.length > 0) columnMapping = buildMapping(data[0]);
        if (typeof hideLoader === 'function') hideLoader();
        return { ok: true, data };
    } catch (err) {
        console.error("Fetch error:", err);
        if (typeof hideLoader === 'function') hideLoader();
        return { ok: false, data: [] };
    }
}

// دالة لضمان عرض النقطة كرقيم صريح ومنع تحولها لتاريخ
function formatScore(val) {
    if (val === undefined || val === null || val === '') return '0';
    // إذا كانت القيمة تاريخاً بسبب خطأ في الشيت، نعيد 0 أو نحاول استخراج الرقم
    if (val instanceof Date || (typeof val === 'string' && val.includes('GMT'))) return '0';
    const num = parseFloat(val);
    return isNaN(num) ? '0' : num;
}
// ── عرض الجدول مع نظام الترقيم (Pagination) ───────────────────
function renderTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="16" class="empty-state">لا توجد سجلات مطابقة</td></tr>';
        updatePaginationControls(0);
        return;
    }

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
            <td>${formatDate(getField(v, 'تاريخ الزيارة'))}</td>
            <td>${getField(v, 'نوع الزيارة')}</td>
            <td><span class="badge badge-accent">${formatScore(getField(v, 'النقطة'))}</span></td>
            <td>${getField(v, 'العقوبات') || 'لا شيء'}</td>
            <td>${getField(v, 'الموسم الدراسي')}</td>
            <td class="note-cell">${getField(v, 'الملاحظة') || '-'}</td>
            <td class="action-btns">
            <button class="btn-edit" onclick="editVisit('${getField(v, 'المعرف')}')">📝 تعديل</button>
            <button class="btn-delete" onclick="deleteVisit('${getField(v, 'المعرف')}')">🗑️ حذف</button>
            </td>
        </tr>`).join('');

    updatePaginationControls(visits.length);
}

function updatePaginationControls(totalRows) {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const container = document.getElementById('paginationControls');
    if (!container) return;

    container.innerHTML = `
        <button class="btn btn-sm" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>البداية</button>
        <button class="btn btn-sm" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
        <span style="margin: 0 10px; font-weight: bold;">${currentPage} / ${totalPages || 1}</span>
        <button class="btn btn-sm" onclick="changePage(1)" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>التالي</button>
        <button class="btn btn-sm" onclick="goToPage(${totalPages})" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}>النهاية</button>
    `;
}

function changePage(step) { currentPage += step; renderTable(filteredVisits); }
function goToPage(p) { currentPage = p; renderTable(filteredVisits); }

async function loadVisits() {
    const result = await fetchVisits();
    allVisits = result.data;
    applySearch();
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

/**
 * 1. وظيفة اختصار التاريخ (YYYY-MM-DD)
 */
function formatDate(val) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d)) return val;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 2. معالجة الإرسال مع شرط منع التكرار
 */
async function handleVisitSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    // البيانات الحالية المطلوب فحصها
    const currentVisitee = (form.visitee?.value || '').trim();
    const currentDate = form.visitDate?.value;

    // شرط منع التكرار: البحث في البيانات المحملة (allVisits)
    const isDuplicate = allVisits.some(v => {
        const existingName = (getField(v, 'اسم المعني بالزيارة') || '').trim();
        const existingDate = formatDate(getField(v, 'تاريخ الزيارة')); // توحيد الصيغة للمقارنة
        return existingName === currentVisitee && existingDate === currentDate;
    });

    if (isDuplicate) {
        alert(`⚠️ خطأ: تم تسجيل زيارة لهذا الشخص (${currentVisitee}) في هذا التاريخ (${currentDate}) مسبقاً.`);
        return; 
    }

    const visitData = {
        'المعرف': generateId(),
        'timestamp': new Date().toISOString(),
        'اسم المفتش': document.getElementById('inspectorSelect').value,
        'التخصص': document.getElementById('specialty').value,
        'المرحلة': form.stage.value,
        'اسم المعني بالزيارة': currentVisitee,
        'الرتبة': form.rank?.value || '-',
        'الدرجة': form.grade?.value || '-',
        'المؤسسة': document.getElementById('institutionSelect').value,
        'تاريخ الزيارة': currentDate,
        'نوع الزيارة': form.visitType?.value || 'توجيهية',
        'النقطة': form.score?.value || '0',
        'العقوبات': document.getElementById('penalties') ? document.getElementById('penalties').value : 'لا شيء',
        'الملاحظة': form.notes?.value || '-',
        'الموسم الدراسي': form.season?.value || '2025 / 2026'
    };

    if (typeof showLoader === 'function') showLoader();
    try {
        await fetch(getSheetURL('visits'), {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'insert', sheet: 'visit', data: visitData })
        });
        
        if (typeof showToast === 'function') showToast('✅ تم الحفظ بنجاح');
        else alert('✅ تم الحفظ بنجاح');
        
        form.reset();
        // إعادة تعيين تاريخ اليوم
        if(document.getElementById('vDate')) document.getElementById('vDate').value = new Date().toISOString().split('T')[0];
        
        await loadVisits(); 
    } catch (err) { 
        console.error("Submit error:", err); 
    }
    if (typeof hideLoader === 'function') hideLoader();
}
function editVisit(id) {
    // الانتقال لصفحة التعديل مع إرسال المعرف في الرابط
    window.location.href = `edit-visit.html?id=${id}`;
}

// ثانياً: دالة الحذف (الحذف من الشيت)
async function deleteVisit(id) {
    // 1. طلب تأكيد الحذف من المستخدم
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة البيانات؟')) return;
    
    // إظهار علامة التحميل (اللودر)
    if (typeof showLoader === 'function') showLoader();

    try {
        // 2. بناء الرابط ليتوافق مع السكريبت المطور
        // نرسل الحقول المطلوبة: action, sheetName, والمعرف
        const params = new URLSearchParams({
            action: "delete",
            sheetName: "visits",
            "المعرف": id
        });

        const deleteUrl = `${SCRIPT_URL}?${params.toString()}`;

        // 3. إرسال الطلب (نستخدم POST مع no-cors لتجاوز قيود الحماية)
        await fetch(deleteUrl, { 
            method: 'POST', 
            mode: 'no-cors' 
        });

        // 4. إشعار المستخدم وتحديث الجدول فوراً
        alert('✅ تم حذف السجل بنجاح من الشيت.');
        
        // إعادة تحميل البيانات ليعكس الجدول الحالة الجديدة بعد الحذف
        if (typeof loadVisits === 'function') {
            loadVisits(); 
        }

    } catch (err) {
        console.error("خطأ في عملية الحذف:", err);
        alert('❌ تعذر الاتصال بالقاعدة، يرجى المحاولة لاحقاً.');
    }

    // إخفاء علامة التحميل
    if (typeof hideLoader === 'function') hideLoader();
}

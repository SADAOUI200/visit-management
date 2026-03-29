// ── Render Visits Table ───────────────────────────────────────
function renderTable(visits, tableBodyId) {
    const tbody = document.getElementById(tableBodyId || 'visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="16" class="empty-state">
        <span class="icon">📋</span>لا توجد زيارات للعرض
      </td></tr>`;
        return;
    }

    tbody.innerHTML = visits.map((v, i) => {
        const f = (key, ...alt) => getField(v, key, ...alt) || '-';
        return `
    <tr>
      <td>${i + 1}</td>
      <td title="${f('المعرف')}">${f('المعرف').substring(0, 16)}</td>
      <td>${formatDate(getField(v, 'timestamp')) || '-'}</td>
      <td>${f('اسم المفتش')}</td>
      <td>${f('التخصص')}</td>
      <td>${f('المرحلة')}</td>
      <td>${f('اسم المعني بالزيارة')}</td>
      <td>${f('الرتبة')}</td>
      <td>${f('الدرجة')}</td>
      <td>${f('المؤسسة')}</td>
      <td>${f('تاريخ الزيارة')}</td>
      <td>${f('نوع الزيارة')}</td>
      <td>${f('النقطة')}</td>
      <td>${f('العقوبات')}</td>
      <td>${f('الملاحظة')}</td>
      <td>${f('الموسم الدراسي')}</td>
    </tr>`;
    }).join('');
}

// ── Helper: Get field value with fallback ────────────────────
function getField(obj, key, ...fallbackKeys) {
    if (!obj) return undefined;
    let value = obj[key];
    if (value !== undefined && value !== null && value !== '') return value;
    for (const fk of fallbackKeys) {
        value = obj[fk];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}

// ── Format Date ──────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat('ar-DZ', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
}

// ── Filter Inspectors by Level ───────────────────────────────
function filterInspectorsByLevel(inspectors, level) {
    if (!inspectors || !level) return [];
    return inspectors.filter(ins => {
        const insLevel = normalizeStr(ins['المرحلة']);
        const selectedLevel = normalizeStr(level);
        return insLevel === selectedLevel;
    });
}

// ── Filter Institutions by Level and Municipality ───────────
function filterInstitutionsByLevelAndMunicipality(institutions, level, municipality) {
    if (!institutions || !level || !municipality) return [];
    return institutions.filter(inst => {
        const instLevel = normalizeStr(inst['المرحلة']);
        const instMun = normalizeStr(inst['البلدية']);
        const selectedLevel = normalizeStr(level);
        const selectedMun = normalizeStr(municipality);
        return instLevel === selectedLevel && instMun === selectedMun;
    });
}

// ── Load Visits from API ─────────────────────────────────────
let _allVisits = [];

async function loadVisits() {
    showLoader();
    try {
        const visits = await fetchSheet('visits', [
            'المعرف', 'اسم المفتش', 'التخصص', 'المرحلة',
            'اسم المعني بالزيارة', 'الرتبة', 'الدرجة', 'المؤسسة',
            'تاريخ الزيارة', 'نوع الزيارة', 'النقطة', 'العقوبات',
            'الملاحظة', 'الموسم الدراسي', 'timestamp'
        ]);
        _allVisits = visits;
        applySearch();
        const count = visits.length;
        document.getElementById('resultsCount').textContent = `${count} زيارة`;
    } catch (err) {
        console.error('[visit.js] loadVisits error:', err);
        showToast('خطأ في تحميل الزيارات', 'error', 6000);
    } finally {
        hideLoader();
    }
}

// ── Search/Filter Visits ─────────────────────────────────────
function applySearch() {
    // ✅ جديد - مع دعم أفضل
const searchName = document.getElementById('searchName')?.value?.toLowerCase() || '';
const searchInst = document.getElementById('searchInst')?.value?.toLowerCase() || '';
const searchInspector = document.getElementById('searchInspector')?.value?.toLowerCase() || '';

// إضافة معالجة خطأ
if (!document.getElementById('visitsTableBody')) {
    console.error('❌ خطأ: عنصر الجدول غير موجود');
}';

    const filtered = _allVisits.filter(v => {
        const name = (v['اسم المعني بالزيارة'] || '').toLowerCase();
        const inst = (v['المؤسسة'] || '').toLowerCase();
        const inspector = (v['اسم المفتش'] || '').toLowerCase();

        return (
            (!searchName || name.includes(searchName)) &&
            (!searchInst || inst.includes(searchInst)) &&
            (!searchInspector || inspector.includes(searchInspector))
        );
    });

    renderTable(filtered);
    document.getElementById('resultsCount').textContent = `${filtered.length} من ${_allVisits.length} زيارة`;
}

// ── Handle Visit Form Submission ─────────────────────────────
async function handleVisitSubmit(e) {
    e.preventDefault();
    
    const form = document.getElementById('visitForm');
    if (!form.checkValidity()) {
        showToast('الرجاء ملء جميع الحقول المطلوبة', 'error', 4000);
        return;
    }

    const visitData = {
        'المعرف': generateDataId('VISIT'),
        'اسم المفتش': document.getElementById('inspectorSelect').value,
        'التخصص': document.getElementById('specialty').value,
        'المرحلة': document.getElementById('stageSelect').value,
        'اسم المعني بالزيارة': document.getElementById('visitee').value,
        'الرتبة': document.getElementById('rank').value || '',
        'الدرجة': document.getElementById('grade').value || '',
        'المؤسسة': document.getElementById('institutionSelect').value,
        'تاريخ الزيارة': document.getElementById('visitDate').value,
        'نوع الزيارة': document.getElementById('visitType').value,
        'النقطة': document.getElementById('score').value || '',
        'العقوبات': document.getElementById('penalties').value,
        'الملاحظة': document.getElementById('notes').value,
        'الموسم الدراسي': document.getElementById('season').value,
        'timestamp': new Date().toISOString()
    };

    try {
        await submitToSheet('visits', visitData, [
            'المعرف', 'اسم المفتش', 'التخصص', 'المرحلة',
            'اسم المعني بالزيارة', 'الرتبة', 'الدرجة', 'المؤسسة',
            'تاريخ الزيارة', 'نوع الزيارة', 'النقطة', 'العقوبات',
            'الملاحظة', 'الموسم الدراسي', 'timestamp'
        ]);
        showSuccess('✅ تم حفظ الزيارة بنجاح');
        form.reset();
        await loadVisits();
    } catch (err) {
        console.error('[visit.js] Submission error:', err);
        showError('فشل حفظ الزيارة: ' + err.message);
    }
}

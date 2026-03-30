/**
 * نظام إدارة الزيارات التفتيشية
 * institutions.js – Institutions Management Page Logic
 */

// ── الثوابت ─────────────────────────────────────────────────
const MUNICIPALITIES = [
    'توقرت', 'النزلة', 'تبسبست', 'الزاوية العابدية',
    'تماسين', 'بلدة عمر', 'المنقر', 'الطيبات',
    'بن ناصر', 'المقارين', 'سيدي سليمان', 'الحجيرة', 'العالية'
];

// ── عناصر واجهة المستخدم (DOM Elements) ──────────────────────────────
const institutionForm = document.getElementById('institutionForm');
const institutionsTableBody = document.getElementById('institutionsTableBody'); // تم التصحيح ليطابق HTML
const instCount = document.getElementById('instCount');
const searchNameInput = document.getElementById('searchInstName');
const searchMunicipalityInput = document.getElementById('searchInstMunicipality');
const searchLevelSelect = document.getElementById('searchInstLevel');

// ── الحالة (State) ─────────────────────────────────────────────────────
let allInstitutions = [];

// ── تهيئة الصفحة ───────────────────────────────────────────
async function initInstitutionsPage() {
    showLoader();
    try {
        // ملء القوائم المنسدلة أولاً
        populateStageDropdown();
        populateMunicipalityDropdown();

        // تحميل البيانات
        await loadInstitutions();

        // إعداد المستمعات (Listeners)
        if (institutionForm) {
            institutionForm.addEventListener('submit', handleInstitutionSubmit);
        }

        if (searchNameInput) searchNameInput.addEventListener('input', handleSearch);
        if (searchMunicipalityInput) searchMunicipalityInput.addEventListener('input', handleSearch);
        if (searchLevelSelect) searchLevelSelect.addEventListener('change', handleSearch);

        // تحديث معلومات المستخدم (من app.js)
        if (typeof updateUserInfo === 'function') updateUserInfo();
        
    } catch (error) {
        console.error('Error initializing institutions page:', error);
    }
    hideLoader();
}

// ── جلب بيانات المؤسسات ──────────────────────────────────────
async function loadInstitutions() {
    try {
        // استدعاء الدالة من data.js مع تمرير true لتجاوز الكاش وضمان جلب البيانات
        allInstitutions = await fetchInstitutions(true);
        renderInstitutions(allInstitutions);
        updateCount(allInstitutions.length);
    } catch (error) {
        console.error('خطأ في تحميل المؤسسات:', error);
        if (institutionsTableBody) {
            institutionsTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">حدث خطأ أثناء جلب البيانات</td></tr>';
        }
    }
}

// ── عرض الجدول ───────────────────────────────────
function renderInstitutions(institutions) {
    if (!institutionsTableBody) return;

    institutionsTableBody.innerHTML = '';

    if (!institutions || institutions.length === 0) {
        institutionsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">🔍</span>لا توجد مؤسسات مسجّلة حالياً
                </td>
            </tr>
        `;
        return;
    }

    // دالة داخلية لجلب القيم بمرونة (عربي/إنجليزي) لتفادي أي تغيير في مسميات أعمدة الشيت
    const getVal = (obj, keys) => {
        for (let key of keys) {
            if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        }
        return '-';
    };

    institutionsTableBody.innerHTML = institutions.map((inst, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${getVal(inst, ['البلدية', 'municipality'])}</td>
            <td><strong>${getVal(inst, ['اسم المؤسسة', 'name', 'institutionName'])}</strong></td>
            <td><span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;">${getVal(inst, ['المرحلة', 'level', 'stage'])}</span></td>
            <td>${getVal(inst, ['مدير المؤسسة', 'manager', 'director'])}</td>
            <td style="color:var(--text-muted);">${getVal(inst, ['المسيّر المالي', 'financialManager'])}</td>
        </tr>
    `).join('');
}

// ── معالجة إرسال النموذج ────────────────────────────────────
async function handleInstitutionSubmit(e) {
    e.preventDefault();
    const formData = new FormData(institutionForm);
    
    const institutionData = {
        'البلدية': formData.get('municipality'),
        'اسم المؤسسة': formData.get('name').trim(),
        'المرحلة': formData.get('level'),
        'مدير المؤسسة': formData.get('manager').trim(),
        'المسيّر المالي': formData.get('financialManager').trim()
    };

    if (!institutionData['اسم المؤسسة']) {
        if (typeof showToast === 'function') showToast('يرجى إدخال اسم المؤسسة', 'error');
        return;
    }

    showLoader();
    try {
        // استدعاء دالة الإرسال من data.js
        const res = await submitInstitution(institutionData);
        if (res && res.ok) {
            institutionForm.reset();
            if (typeof showToast === 'function') showToast('✅ تم إضافة المؤسسة بنجاح');
            await loadInstitutions(); // تحديث الجدول
        }
    } catch (error) {
        console.error('Submit error:', error);
    }
    hideLoader();
}

// ── معالجة البحث ─────────────────────────────────────────────
function handleSearch() {
    const nameQ = (searchNameInput?.value || '').toLowerCase().trim();
    const munQ = (searchMunicipalityInput?.value || '').toLowerCase().trim();
    const lvlQ = (searchLevelSelect?.value || '').trim();

    const filtered = allInstitutions.filter(inst => {
        const name = String(inst['اسم المؤسسة'] || inst['name'] || '').toLowerCase();
        const mun = String(inst['البلدية'] || inst['municipality'] || '').toLowerCase();
        const lvl = String(inst['المرحلة'] || inst['level'] || '');
        
        return (!nameQ || name.includes(nameQ))
            && (!munQ || mun.includes(munQ))
            && (!lvlQ || lvl === lvlQ);
    });

    renderInstitutions(filtered);
    updateCount(filtered.length);
}

function clearInstSearch() {
    if (searchNameInput) searchNameInput.value = '';
    if (searchMunicipalityInput) searchMunicipalityInput.value = '';
    if (searchLevelSelect) searchLevelSelect.value = '';
    handleSearch();
}

// ── تحديث العداد ──────────────────────────────────────────────
function updateCount(count) {
    if (instCount) instCount.textContent = `${count} مؤسسة`;
}

// ── ملء القوائم ───────────────────────────────────
function populateStageDropdown() {
    const stageSelect = document.getElementById('instLevel');
    if (!stageSelect || typeof LEVELS === 'undefined') return;
    stageSelect.innerHTML = '<option value="">-- الكل --</option>';
    LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level; option.textContent = level;
        stageSelect.appendChild(option);
    });
}

function populateMunicipalityDropdown() {
    const municipalitySelect = document.getElementById('instMunicipality');
    if (!municipalitySelect) return;
    municipalitySelect.innerHTML = '<option value="">-- اختر البلدية --</option>';
    MUNICIPALITIES.forEach(mun => {
        const option = document.createElement('option');
        option.value = mun; option.textContent = mun;
        municipalitySelect.appendChild(option);
    });
}

// ── التشغيل عند تحميل المستند ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // التأكد من صلاحية الدخول (من app.js)
    if (typeof requireAuth === 'function') requireAuth(['admin']);
    initInstitutionsPage();
});
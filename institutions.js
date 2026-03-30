/**
 * نظام إدارة الزيارات التفتيشية
 * institutions.js – Institutions Management Page Logic
 */

// ── الإعدادات الثابتة ─────────────────────────────────────────────────
const MUNICIPALITIES = [
    'توقرت', 'النزلة', 'تبسبست', 'الزاوية العابدية', 'تماسين', 
    'بلدة عمر', 'المنقر', 'الطيبات', 'بن ناصر', 'المقارين', 
    'سيدي سليمان', 'الحجيرة', 'العالية'
];

// ── عناصر واجهة المستخدم (DOM Elements) ──────────────────────────────
const institutionForm = document.getElementById('institutionForm');
const institutionTableBody = document.getElementById('institutionsTableBody'); // تصحيح المعرف ليطابق HTML
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
        populateStageDropdown();
        populateMunicipalityDropdown();
        await loadInstitutions();

        if (institutionForm) {
            institutionForm.addEventListener('submit', handleInstitutionSubmit);
        }

        if (searchNameInput) searchNameInput.addEventListener('input', handleSearch);
        if (searchMunicipalityInput) searchMunicipalityInput.addEventListener('input', handleSearch);
        if (searchLevelSelect) searchLevelSelect.addEventListener('change', handleSearch);

        updateUserInfo();
    } catch (error) {
        console.error('Error initializing institutions page:', error);
    }
    hideLoader();
}

// ── جلب بيانات المؤسسات ──────────────────────────────────────
async function loadInstitutions() {
    try {
        // تفريغ الكاش لضمان جلب بيانات جديدة
        if (typeof _cache !== 'undefined') {
            _cache.institutions = null;
            _cache.institutionsTs = 0;
        }
        
        allInstitutions = await fetchInstitutions(true);
        renderInstitutions(allInstitutions);
        updateCount(allInstitutions.length);
    } catch (error) {
        console.error('خطأ في تحميل المؤسسات:', error);
    }
}

// ── عرض جدول المؤسسات ───────────────────────────────────
function renderInstitutions(institutions) {
    if (!institutionTableBody) return;

    institutionTableBody.innerHTML = '';

    if (!institutions || institutions.length === 0) {
        institutionTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">🔍</span>لا توجد مؤسسات مسجّلة بعد
                </td>
            </tr>
        `;
        return;
    }

    // دالة مساعدة لجلب القيم بمرونة (عربي/إنجليزي)
    const g = (row, keys) => {
        for (let key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                return String(row[key]);
            }
        }
        return '-';
    };

    institutionTableBody.innerHTML = institutions.map((inst, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${g(inst, ['البلدية', 'municipality'])}</td>
            <td><strong>${g(inst, ['اسم المؤسسة', 'name', 'institutionName'])}</strong></td>
            <td><span class="badge" style="background:rgba(16,185,129,0.15);color:#34d399;">${g(inst, ['المرحلة', 'level', 'stage'])}</span></td>
            <td>${g(inst, ['مدير المؤسسة', 'manager', 'director'])}</td>
            <td style="color:var(--text-muted);">${g(inst, ['المسيّر المالي', 'financialManager'])}</td>
        </tr>
    `).join('');
}

// ── معالجة البحث ─────────────────────────────────────────────
function handleSearch() {
    const nameQ = (searchNameInput?.value || '').toLowerCase().trim();
    const munQ = (searchMunicipalityInput?.value || '').toLowerCase().trim();
    const lvlQ = (searchLevelSelect?.value || '').trim();

    const filtered = allInstitutions.filter(inst => {
        const name = String(inst['اسم المؤسسة'] || inst['name'] || '').toLowerCase();
        const mun = String(inst['البلدية'] || inst['municipality'] || '').toLowerCase();
        const lvl = String(inst['المرحلة'] || inst['level'] || inst['stage'] || '');
        
        return (!nameQ || name.includes(nameQ))
            && (!munQ || mun.includes(munQ))
            && (!lvlQ || lvl === lvlQ);
    });

    renderInstitutions(filtered);
    updateCount(filtered.length);
}

// ── وظائف أخرى ──────────────────────────────────────────────
function updateCount(count) {
    if (instCount) instCount.textContent = `${count} مؤسسة`;
}

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

function clearInstSearch() {
    if (searchNameInput) searchNameInput.value = '';
    if (searchMunicipalityInput) searchMunicipalityInput.value = '';
    if (searchLevelSelect) searchLevelSelect.value = '';
    handleSearch();
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof requireAuth === 'function') requireAuth(['admin']);
    initInstitutionsPage();
});
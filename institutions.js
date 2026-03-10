/**
 * نظام إدارة الزيارات التفتيشية
 * institutions.js – Institutions Management Page Logic
 */

// ── Constants ─────────────────────────────────────────────────
const MUNICIPALITIES = [
    'توقرت',
    'النزلة',
    'تبسبست',
    'الزاوية العابدية',
    'تماسين',
    'بلدة عمر',
    'المنقر',
    'الطيبات',
    'بن ناصر',
    'المقارين',
    'سيدي سليمان',
    'الحجيرة',
    'العالية'
];

// ── DOM Elements ──────────────────────────────────────────────
const institutionForm = document.getElementById('institutionForm');
const institutionTableBody = document.getElementById('institutionTableBody');
const instCount = document.getElementById('instCount');
const searchNameInput = document.getElementById('searchInstName');
const searchMunicipalityInput = document.getElementById('searchInstMunicipality');
const searchLevelSelect = document.getElementById('searchInstLevel');

// ── State ─────────────────────────────────────────────────────
let allInstitutions = [];

// ── Initialize Page ───────────────────────────────────────────
async function initInstitutionsPage() {
    showLoader();

    try {
        // Populate dropdowns
        populateStageDropdown();
        populateMunicipalityDropdown();

        // Load institutions data
        await loadInstitutions();

        // Setup form submission
        institutionForm.addEventListener('submit', handleInstitutionSubmit);

        // Setup search listeners
        if (searchNameInput) searchNameInput.addEventListener('input', handleSearch);
        if (searchMunicipalityInput) searchMunicipalityInput.addEventListener('input', handleSearch);
        if (searchLevelSelect) searchLevelSelect.addEventListener('change', handleSearch);

        // Setup clear search button
        const clearBtn = document.querySelector('button[onclick="clearInstSearch()"]');
        if (clearBtn) clearBtn.onclick = clearSearch;

        // Setup user info
        updateUserInfo();

    } catch (error) {
        console.error('Error initializing institutions page:', error);
        showError('حدث خطأ في تحميل البيانات');
    }

    hideLoader();
}

// ── Load Institutions Data ────────────────────────────────────
async function loadInstitutions() {
    console.log('[institutions.js] جارٍ تحميل قائمة المؤسسات...');
    
    try {        // إبطال الـ cache قبل الجلب
        _cache.institutions = null;
        _cache.institutionsTs = 0;
                allInstitutions = await fetchInstitutions(true); // Force refresh
        console.log('[institutions.js] تم جلب البيانات:', allInstitutions);
        
        if (!allInstitutions || allInstitutions.length === 0) {
            console.warn('[institutions.js] لا توجد بيانات - الجدول قد يكون فارغاً');
        }
        
        renderInstitutions(allInstitutions);
        updateCount(allInstitutions.length);
    } catch (error) {
        console.error('[institutions.js] خطأ في تحميل المؤسسات:', error);
        showError('خطأ في تحميل قائمة المؤسسات: ' + error.message);
    }
}

// ── Render Institutions Table ────────────────────────────────
function renderInstitutions(institutions) {
    if (!institutionTableBody) return;

    institutionTableBody.innerHTML = '';

    if (institutions.length === 0) {
        institutionTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">🏫</span>لا توجد مؤسسات مسجّلة بعد
                </td>
            </tr>
        `;
        return;
    }

    const f = (row, key) => String(row[key] || '-');
    institutionTableBody.innerHTML = institutions.map((inst, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><span class="badge" style="background:rgba(16,185,129,0.15);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3);">${f(inst, 'البلدية')}</span></td>
            <td><strong>${f(inst, 'اسم المؤسسة')}</strong></td>
            <td>${f(inst, 'المرحلة')}</td>
            <td style="color:var(--text-muted);">${f(inst, 'مدير المؤسسة')}</td>
            <td style="color:var(--text-muted);">${f(inst, 'المسيّر المالي')}</td>
        </tr>
    `).join('');
}

// ── Handle Form Submission ────────────────────────────────────
async function handleInstitutionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(institutionForm);
    const instData = {
        'البلدية': formData.get('municipality').trim(),
        'اسم المؤسسة': formData.get('instName').trim(),
        'المرحلة': formData.get('level').trim(),
        'مدير المؤسسة': formData.get('director').trim(),
        'المسيّر المالي': formData.get('finManager').trim()
    };

    // Validation
    if (!instData['البلدية'] || !instData['اسم المؤسسة']) {
        showError('يرجى إدخال البلدية واسم المؤسسة');
        return;
    }

    showLoader();

    try {
        await submitInstitution(instData);
        institutionForm.reset();
        showSuccess('تم إضافة المؤسسة بنجاح');

        // Wait briefly for Google Sheets to update, then reload
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadInstitutions();

    } catch (error) {
        console.error('Error submitting institution:', error);
        showError('حدث خطأ في حفظ البيانات');
    }

    hideLoader();
}

// ── Handle Search ─────────────────────────────────────────────
function handleSearch() {
    const nameQ = (searchNameInput?.value || '').toLowerCase().trim();
    const munQ = (searchMunicipalityInput?.value || '').toLowerCase().trim();
    const lvlQ = (searchLevelSelect?.value || '').trim();

    const filtered = allInstitutions.filter(inst => {
        const name = (inst['اسم المؤسسة'] || '').toLowerCase();
        const mun = (inst['البلدية'] || '').toLowerCase();
        const lvl = (inst['المرحلة'] || '');
        return (!nameQ || name.includes(nameQ))
            && (!munQ || mun.includes(munQ))
            && (!lvlQ || lvl === lvlQ);
    });

    renderInstitutions(filtered);
    updateCount(filtered.length);
}

// ── Clear Search ──────────────────────────────────────────────
function clearSearch() {
    if (searchNameInput) searchNameInput.value = '';
    if (searchMunicipalityInput) searchMunicipalityInput.value = '';
    if (searchLevelSelect) searchLevelSelect.value = '';
    handleSearch();
}

// ── Update Count ──────────────────────────────────────────────
function updateCount(count) {
    if (instCount) {
        instCount.textContent = `${count} مؤسسة`;
    }
}

// ── Populate Stage Dropdown ───────────────────────────────────
function populateStageDropdown() {
    const stageSelect = document.getElementById('instLevel');
    if (!stageSelect) return;

    LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        stageSelect.appendChild(option);
    });
}

// ── Populate Municipality Dropdown ─────────────────────────────
function populateMunicipalityDropdown() {
    const municipalitySelect = document.getElementById('instMunicipality');
    if (!municipalitySelect) return;

    MUNICIPALITIES.forEach(mun => {
        const option = document.createElement('option');
        option.value = mun;
        option.textContent = mun;
        municipalitySelect.appendChild(option);
    });
}

// ── Initialize when DOM loaded ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(['admin']); // Only admins can access

    initInstitutionsPage();
});
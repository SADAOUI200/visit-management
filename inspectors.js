/**
 * نظام إدارة الزيارات التفتيشية
 * inspectors.js – Inspectors Management Page Logic
 */

// ── DOM Elements ──────────────────────────────────────────────
const inspectorForm = document.getElementById('inspectorForm');
const inspectorTableBody = document.getElementById('inspectorTableBody');
const inspectorCount = document.getElementById('inspectorCount');
const searchNameInput = document.getElementById('searchInspName');
const searchSpecialtyInput = document.getElementById('searchInspSpecialty');
const searchLevelSelect = document.getElementById('searchInspLevel');

// ── State ─────────────────────────────────────────────────────
let allInspectors = [];

// ── Initialize Page ───────────────────────────────────────────
async function initInspectorsPage() {
    showLoader();

    try {
        // Load inspectors data
        await loadInspectors();

        // Setup form submission
        inspectorForm.addEventListener('submit', handleInspectorSubmit);

        // Setup search listeners
        if (searchNameInput) searchNameInput.addEventListener('input', handleSearch);
        if (searchSpecialtyInput) searchSpecialtyInput.addEventListener('input', handleSearch);
        if (searchLevelSelect) searchLevelSelect.addEventListener('change', handleSearch);

        // Setup clear search button
        const clearBtn = document.querySelector('button[onclick="clearInspSearch()"]');
        if (clearBtn) clearBtn.onclick = clearSearch;

        // Setup user info
        updateUserInfo();

    } catch (error) {
        console.error('Error initializing inspectors page:', error);
        showError('حدث خطأ في تحميل البيانات');
    }

    hideLoader();
}

// ── Load Inspectors Data ──────────────────────────────────────
async function loadInspectors() {
    console.log('[inspectors.js] جارٍ تحميل قائمة المفتشين...');
    
    try {
        // إبطال الـ cache قبل الجلب
        _cache.inspectors = null;
        _cache.inspectorsTs = 0;
        
        allInspectors = await fetchInspectors(true); // Force refresh
        console.log('[inspectors.js] تم جلب البيانات:', allInspectors);
        
        if (!allInspectors || allInspectors.length === 0) {
            console.warn('[inspectors.js] لا توجد بيانات - الجدول قد يكون فارغاً');
        }
        
        renderInspectors(allInspectors);
        updateCount(allInspectors.length);
    } catch (error) {
        console.error('[inspectors.js] خطأ في تحميل المفتشين:', error);
        showError('خطأ في تحميل قائمة المفتشين: ' + error.message);
    }
}

// ── Render Inspectors Table ───────────────────────────────────
function renderInspectors(inspectors) {
    if (!inspectorTableBody) return;

    inspectorTableBody.innerHTML = '';

    if (inspectors.length === 0) {
        inspectorTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">🔍</span>لا يوجد مفتشون مسجّلون بعد
                </td>
            </tr>
        `;
        return;
    }

    const f = (row, key) => String(row[key] || '-');
    inspectorTableBody.innerHTML = inspectors.map((ins, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${f(ins, 'الاسم')}</strong></td>
            <td><span class="badge" style="background:rgba(99,102,241,0.18);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);">${f(ins, 'التخصص')}</span></td>
            <td>${f(ins, 'المرحلة')}</td>
            <td>${f(ins, 'الرتبة')}</td>
            <td style="color:var(--text-muted);">${f(ins, 'الهاتف')}</td>
        </tr>
    `).join('');
}

// ── Handle Form Submission ────────────────────────────────────
async function handleInspectorSubmit(e) {
    e.preventDefault();

    const formData = new FormData(inspectorForm);
    const inspectorData = {
        'الاسم الكامل': formData.get('fullName').trim(),
        'التخصص': formData.get('specialty').trim(),
        'المرحلة': formData.get('level').trim(),
        'الرتبة': formData.get('rank').trim(),
        'الهاتف': formData.get('phone').trim()
    };

    // Validation
    if (!inspectorData['الاسم']) {
        showError('يرجى إدخال اسم المفتش');
        return;
    }

    showLoader();

    try {
        await submitInspector(inspectorData);
        inspectorForm.reset();
        showSuccess('تم إضافة المفتش بنجاح');

        // Wait briefly for Google Sheets to update, then reload
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadInspectors();

    } catch (error) {
        console.error('Error submitting inspector:', error);
        showError('حدث خطأ في حفظ البيانات');
    }

    hideLoader();
}

// ── Handle Search ─────────────────────────────────────────────
function handleSearch() {
    const nameQ = (searchNameInput?.value || '').toLowerCase().trim();
    const specQ = (searchSpecialtyInput?.value || '').toLowerCase().trim();
    const lvlQ = (searchLevelSelect?.value || '').trim();

    const filtered = allInspectors.filter(ins => {
        const name = (ins['الاسم الكامل'] || '').toLowerCase();
        const spec = (ins['التخصص'] || '').toLowerCase();
        const lvl = (ins['المرحلة'] || '');
        return (!nameQ || name.includes(nameQ))
            && (!specQ || spec.includes(specQ))
            && (!lvlQ || lvl === lvlQ);
    });

    renderInspectors(filtered);
    updateCount(filtered.length);
}

// ── Clear Search ──────────────────────────────────────────────
function clearSearch() {
    if (searchNameInput) searchNameInput.value = '';
    if (searchSpecialtyInput) searchSpecialtyInput.value = '';
    if (searchLevelSelect) searchLevelSelect.value = '';
    handleSearch();
}

// ── Update Count ──────────────────────────────────────────────
function updateCount(count) {
    if (inspectorCount) {
        inspectorCount.textContent = `${count} مفتش`;
    }
}

// ── Populate Specialty Dropdown ───────────────────────────────
function populateSpecialtyDropdown() {
    const specialtySelect = document.getElementById('inspSpecialty');
    if (!specialtySelect) return;

    SPECIALTIES.forEach(specialty => {
        const option = document.createElement('option');
        option.value = specialty;
        option.textContent = specialty;
        specialtySelect.appendChild(option);
    });
}

// ── Populate Stage Dropdown ───────────────────────────────────
function populateStageDropdown() {
    const stageSelect = document.getElementById('inspLevel');
    if (!stageSelect) return;

    LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level;
        option.textContent = level;
        stageSelect.appendChild(option);
    });
}

// ── Populate Rank Dropdown ────────────────────────────────────
function populateRankDropdown() {
    const rankSelect = document.getElementById('inspRank');
    if (!rankSelect) return;

    INSPECTOR_RANKS.forEach(rank => {
        const option = document.createElement('option');
        option.value = rank;
        option.textContent = rank;
        rankSelect.appendChild(option);
    });
}

// ── Initialize when DOM loaded ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(['admin']); // Only admins can access

    populateSpecialtyDropdown();
    populateStageDropdown();
    populateRankDropdown();

    initInspectorsPage();

});

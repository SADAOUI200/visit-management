/**
 * نظام إدارة الزيارات التفتيشية
 * inspectors.js – Inspectors Management Page Logic
 */

// ── عناصر واجهة المستخدم (DOM Elements) ──────────────────────────────
const inspectorForm = document.getElementById('inspectorForm');
const inspectorTableBody = document.getElementById('inspectorsTableBody'); // تصحيح المعرف ليطابق HTML
const inspectorCount = document.getElementById('inspectorCount');
const searchNameInput = document.getElementById('searchInspName');
const searchSpecialtyInput = document.getElementById('searchInspSpecialty');
const searchLevelSelect = document.getElementById('searchInspLevel');

// ── الحالة (State) ─────────────────────────────────────────────────────
let allInspectors = [];

// ── تهيئة الصفحة ───────────────────────────────────────────
async function initInspectorsPage() {
    showLoader();
    try {
        await loadInspectors();

        if (inspectorForm) {
            inspectorForm.addEventListener('submit', handleInspectorSubmit);
        }

        if (searchNameInput) searchNameInput.addEventListener('input', handleSearch);
        if (searchSpecialtyInput) searchSpecialtyInput.addEventListener('input', handleSearch);
        if (searchLevelSelect) searchLevelSelect.addEventListener('change', handleSearch);

        updateUserInfo();
    } catch (error) {
        console.error('Error initializing inspectors page:', error);
    }
    hideLoader();
}

// ── جلب بيانات المفتشين ──────────────────────────────────────
async function loadInspectors() {
    try {
        _cache.inspectors = null;
        _cache.inspectorsTs = 0;
        
        allInspectors = await fetchInspectors(true); 
        
        renderInspectors(allInspectors);
        updateCount(allInspectors.length);
    } catch (error) {
        console.error('[inspectors.js] خطأ في تحميل المفتشين:', error);
    }
}

// ── عرض جدول المفتشين ───────────────────────────────────
function renderInspectors(inspectors) {
    if (!inspectorTableBody) return;

    inspectorTableBody.innerHTML = '';

    if (!inspectors || inspectors.length === 0) {
        inspectorTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <span class="icon">🔍</span>لا يوجد مفتشون مسجّلون بعد
                </td>
            </tr>
        `;
        return;
    }

    // دالة مساعدة لجلب القيمة بمرونة حسب مسمى العمود في الشيت
    const f = (row, keys) => {
        for (let key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                return String(row[key]);
            }
        }
        return '-';
    };

    inspectorTableBody.innerHTML = inspectors.map((ins, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${f(ins, ['الاسم', 'الاسم الكامل', 'fullName'])}</strong></td>
            <td><span class="badge" style="background:rgba(99,102,241,0.18);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);">${f(ins, ['التخصص', 'specialty'])}</span></td>
            <td>${f(ins, ['المرحلة', 'المرحلة التعليمية', 'level'])}</td>
            <td>${f(ins, ['الرتبة', 'الرتبة الوظيفية', 'rank'])}</td>
            <td style="color:var(--text-muted);">${f(ins, ['الهاتف', 'رقم الهاتف', 'phone'])}</td>
        </tr>
    `).join('');
}

// ── معالجة إرسال النموذج ────────────────────────────────────
async function handleInspectorSubmit(e) {
    e.preventDefault();
    const formData = new FormData(inspectorForm);
    const inspectorData = {
        'الاسم الكامل': formData.get('fullName').trim(),
        'التخصص': formData.get('specialty').trim(),
        'المرحلة': formData.get('level').trim(),
        'الرتبة الوظيفية': formData.get('rank').trim(),
        'الهاتف': formData.get('phone').trim()
    };

    if (!inspectorData['الاسم الكامل']) {
        showError('يرجى إدخال اسم المفتش');
        return;
    }

    showLoader();
    try {
        await submitInspector(inspectorData);
        inspectorForm.reset();
        showSuccess('تم إضافة المفتش بنجاح');
        await new Promise(resolve => setTimeout(resolve, 800));
        await loadInspectors();
    } catch (error) {
        showError('حدث خطأ في حفظ البيانات');
    }
    hideLoader();
}

// ── معالجة البحث ─────────────────────────────────────────────
function handleSearch() {
    const nameQ = (searchNameInput?.value || '').toLowerCase().trim();
    const specQ = (searchSpecialtyInput?.value || '').toLowerCase().trim();
    const lvlQ = (searchLevelSelect?.value || '').trim();

    const filtered = allInspectors.filter(ins => {
        const name = String(ins['الاسم'] || ins['الاسم الكامل'] || '').toLowerCase();
        const spec = String(ins['التخصص'] || '').toLowerCase();
        const lvl = String(ins['المرحلة'] || ins['المرحلة التعليمية'] || '');
        return (!nameQ || name.includes(nameQ))
            && (!specQ || spec.includes(specQ))
            && (!lvlQ || lvl === lvlQ);
    });

    renderInspectors(filtered);
    updateCount(filtered.length);
}

function clearSearch() {
    if (searchNameInput) searchNameInput.value = '';
    if (searchSpecialtyInput) searchSpecialtyInput.value = '';
    if (searchLevelSelect) searchLevelSelect.value = '';
    handleSearch();
}

function updateCount(count) {
    if (inspectorCount) inspectorCount.textContent = `${count} مفتش`;
}

function populateSpecialtyDropdown() {
    const specialtySelect = document.getElementById('inspSpecialty');
    if (!specialtySelect || typeof SPECIALTIES === 'undefined') return;
    SPECIALTIES.forEach(specialty => {
        const option = document.createElement('option');
        option.value = specialty; option.textContent = specialty;
        specialtySelect.appendChild(option);
    });
}

function populateStageDropdown() {
    const stageSelect = document.getElementById('inspLevel');
    if (!stageSelect || typeof LEVELS === 'undefined') return;
    LEVELS.forEach(level => {
        const option = document.createElement('option');
        option.value = level; option.textContent = level;
        stageSelect.appendChild(option);
    });
}

function populateRankDropdown() {
    const rankSelect = document.getElementById('inspRank');
    if (!rankSelect || typeof INSPECTOR_RANKS === 'undefined') return;
    INSPECTOR_RANKS.forEach(rank => {
        const option = document.createElement('option');
        option.value = rank; option.textContent = rank;
        rankSelect.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    requireAuth(['admin']);
    populateSpecialtyDropdown();
    populateStageDropdown();
    populateRankDropdown();
    initInspectorsPage();
});
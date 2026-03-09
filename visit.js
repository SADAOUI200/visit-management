/**
 * نظام إدارة الزيارات التفتيشية
 * visit.js – Google Sheets Integration, Visit CRUD, Dynamic Search
 * v3 – Position-based mapping + diagnostic panel
 */

const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzbxEK0o4EAQp-xSaNFwxyYhj1eKpdoZwcCkVrFgygphgVIe2HqqO8ivMw8eYgyhkT3/exec';

// الترتيب الرسمي للأعمدة كما هو في الشيت (0-indexed)
const FIELD_NAMES = [
    'المعرف',
    'timestamp',
    'اسم المفتش',
    'التخصص',
    'المرحلة',
    'اسم المعني بالزيارة',
    'الرتبة',
    'الدرجة',
    'المؤسسة',
    'تاريخ الزيارة',
    'نوع الزيارة',
    'النقطة',
    'العقوبات',
    'الملاحظة',
    'الموسم الدراسي'
];

let allVisits = [];
// خريطة ديناميكية: اسم الحقل الفعلي في الـ API → اسم الحقل الرسمي
let columnMapping = {};

// ── Generate UUID ─────────────────────────────────────────────
function generateId() {
    return 'VIS-' + Math.random().toString(36).substr(2, 8).toUpperCase()
        + '-' + Date.now().toString(36).toUpperCase();
}

// ── Normalize key (trim spaces + invisible chars) ─────────────
function normalizeKey(str) {
    return String(str || '')
        .normalize('NFC')
        .trim()
        .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '') // invisible chars
        .replace(/\s+/g, ' ');
}

// ── Build dynamic column mapping from actual API keys ─────────
/**
 * يبني خريطة من (المفتاح الفعلي في الـ API) → (اسم الحقل الرسمي)
 * يجرب 3 طرق: مطابقة تامة، مطابقة بعد التنظيف، ثم مطابقة بالموضع
 */
function buildMapping(firstRow, headerRow) {
    const mapping = {};

    let actualKeys = [];
    let byIndex = false;

    if (headerRow && Array.isArray(headerRow)) {
        // بيانات من مصفوفة مصفوفات: headerRow هو الصف الأول
        actualKeys = headerRow.map(h => normalizeKey(String(h)));
        byIndex = true;
    } else if (firstRow && typeof firstRow === 'object') {
        actualKeys = Object.keys(firstRow);
    }

    console.log('[visit.js] Actual API keys:', actualKeys);

    if (byIndex) {
        // رسم الخريطة بالموضع
        FIELD_NAMES.forEach((field, i) => {
            if (i < actualKeys.length) {
                mapping[actualKeys[i]] = field;
            }
        });
    } else {
        // 1) مطابقة تامة أو بعد التنظيف
        for (const actualKey of actualKeys) {
            const normActual = normalizeKey(actualKey);
            for (const field of FIELD_NAMES) {
                if (normalizeKey(field) === normActual) {
                    mapping[actualKey] = field;
                    break;
                }
            }
        }

        // 2) للحقول غير المُطابَقة: رسم الخريطة بالموضع (fallback)
        const unmappedActual = actualKeys.filter(k => !mapping[k]);
        const mappedFields = new Set(Object.values(mapping));
        const unmappedFields = FIELD_NAMES.filter(f => !mappedFields.has(f));

        unmappedActual.forEach((key, i) => {
            if (i < unmappedFields.length) {
                mapping[key] = unmappedFields[i];
            }
        });
    }

    console.log('[visit.js] Column mapping:', mapping);
    return mapping;
}

// ── Re-map a single row using dynamic column mapping ──────────
function remapRow(rawRow) {
    if (!rawRow || typeof rawRow !== 'object') return rawRow;
    const remapped = {};
    for (const [actualKey, fieldName] of Object.entries(columnMapping)) {
        remapped[fieldName] = rawRow[actualKey] ?? rawRow[normalizeKey(actualKey)] ?? '';
    }
    // حافظ على القيم الأصلية أيضاً كـ fallback
    Object.assign(remapped, rawRow);
    return remapped;
}

// ── Safe field getter ─────────────────────────────────────────
function getField(row, ...keys) {
    for (const key of keys) {
        const v = row?.[key];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        const v2 = row?.[normalizeKey(key)];
        if (v2 !== undefined && v2 !== null && String(v2).trim() !== '') return v2;
    }
    return '';
}

// ── Parse raw API response → array of objects ─────────────────
function parseSheetResponse(raw) {
    // حالة 1: مصفوفة من كائنات
    if (Array.isArray(raw) && raw.length > 0 && !Array.isArray(raw[0])) {
        console.log('[visit.js] Format: array of objects');
        if (raw.length > 0) {
            columnMapping = buildMapping(raw[0], null);
            return raw.map(remapRow);
        }
        return raw;
    }

    // حالة 2: مصفوفة من مصفوفات – الصف الأول عناوين
    if (Array.isArray(raw) && raw.length > 1 && Array.isArray(raw[0])) {
        console.log('[visit.js] Format: array of arrays (matrix)');
        const headerRow = raw[0];
        columnMapping = buildMapping(null, headerRow);
        return raw.slice(1).map(row => {
            const obj = {};
            headerRow.forEach((h, i) => {
                const fieldName = columnMapping[normalizeKey(String(h))] || normalizeKey(String(h));
                obj[fieldName] = row[i] ?? '';
            });
            return obj;
        });
    }

    // حالة 3: كائن مُغلَّف
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const inner = raw.data || raw.result || raw.values || raw.rows || raw.items || [];
        if (Array.isArray(inner) && inner.length > 0) {
            return parseSheetResponse(inner);
        }
    }

    return [];
}

// ── Show API Diagnostic panel ─────────────────────────────────
function showDiagnostic(raw, parsed) {
    const panel = document.getElementById('apiDiagnostic');
    if (!panel) return;

    const actualKeys = parsed.length > 0 ? Object.keys(parsed[0]) : [];
    const mappingRows = Object.entries(columnMapping)
        .map(([k, v]) => `<tr><td>${k}</td><td>→</td><td style="color:#6ee7b7">${v}</td></tr>`)
        .join('');

    panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <strong style="color:var(--accent-light)">🔍 تشخيص بيانات الـ API</strong>
      <button onclick="document.getElementById('apiDiagnostic').style.display='none'"
        style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.2rem;">✕</button>
    </div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">
      عدد الصفوف المُستلمة: <strong style="color:var(--text)">${parsed.length}</strong> &nbsp;|&nbsp;
      عدد الحقول: <strong style="color:var(--text)">${actualKeys.length}</strong>
    </p>
    <details>
      <summary style="cursor:pointer;color:var(--text-muted);font-size:0.82rem;margin-bottom:0.5rem;">عرض خريطة الأعمدة</summary>
      <table style="font-size:0.78rem;width:100%;border-collapse:collapse;">
        <thead><tr>
          <th style="text-align:right;color:var(--text-muted);padding:2px 6px;">الحقل في الـ API</th>
          <th></th>
          <th style="text-align:right;color:var(--text-muted);padding:2px 6px;">اسمه في التطبيق</th>
        </tr></thead>
        <tbody>${mappingRows || '<tr><td colspan="3" style="color:#f87171">لم يتم رسم أي خريطة</td></tr>'}</tbody>
      </table>
    </details>
  `;
    panel.style.display = 'block';
}

// ── Submit Visit to Google Sheets (POST) ──────────────────────
async function submitVisit(formData) {
    showLoader();
    try {
        const payload = {
            action: 'insert',
            sheet: 'visit',
            sheetName: 'visit',
            data: formData,
            // أرسل أيضاً كصف مُرتَّب
            row: FIELD_NAMES.map(f => formData[f] ?? '')
        };
        await fetch(SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        hideLoader();
        return { ok: true };
    } catch (err) {
        hideLoader();
        return { ok: false, msg: 'حدث خطأ في الإرسال: ' + err.message };
    }
}

// ── Fetch All Visits from Google Sheets (GET) ─────────────────
async function fetchVisits() {
    showLoader();
    try {
        const url = SHEETS_URL + '?action=get&sheet=visit&sheetName=visit';
        const res = await fetch(url, { method: 'GET', mode: 'cors' });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const raw = await res.json();
        console.log('[visit.js] Raw response (first 600 chars):',
            JSON.stringify(raw).substring(0, 600));

        const data = parseSheetResponse(raw);
        console.log('[visit.js] Parsed rows:', data.length, '| Sample:', data[0]);

        // عرض لوحة التشخيص
        showDiagnostic(raw, data);

        hideLoader();
        return { ok: true, data };
    } catch (err) {
        console.error('[visit.js] fetchVisits error:', err);
        hideLoader();
        return { ok: false, data: [], msg: err.message };
    }
}

// ── Render Visits Table ───────────────────────────────────────
function renderTable(visits, tableBodyId) {
    const tbody = document.getElementById(tableBodyId || 'visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="15" class="empty-state">
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
      <td>${f('الموسم الدراسي')}</td>
    </tr>`;
    }).join('');
}

// ── Dynamic Search ────────────────────────────────────────────
function applySearch() {
    const nameQ = (document.getElementById('searchName')?.value || '').trim().toLowerCase();
    const instQ = (document.getElementById('searchInst')?.value || '').trim().toLowerCase();
    const inspecQ = (document.getElementById('searchInspector')?.value || '').trim().toLowerCase();

    const filtered = allVisits.filter(v => {
        const name = (getField(v, 'اسم المعني بالزيارة') || '').toLowerCase();
        const inst = (getField(v, 'المؤسسة') || '').toLowerCase();
        const inspec = (getField(v, 'اسم المفتش') || '').toLowerCase();
        return (!nameQ || name.includes(nameQ))
            && (!instQ || inst.includes(instQ))
            && (!inspecQ || inspec.includes(inspecQ));
    });

    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.textContent = `${filtered.length} نتيجة`;
    renderTable(filtered, 'visitsTableBody');
}

// ── Format Date ───────────────────────────────────────────────
function formatDate(val) {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d)) return val;
        return d.toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return val; }
}

// ── Load & Render All Visits ──────────────────────────────────
async function loadVisits() {
    const result = await fetchVisits();
    allVisits = result.data;
    renderTable(allVisits, 'visitsTableBody');

    const countEl = document.getElementById('resultsCount');
    if (countEl) countEl.textContent = `${allVisits.length} نتيجة`;

    if (!result.ok) {
        showToast('تعذّر الاتصال بقاعدة البيانات: ' + (result.msg || ''), 'warning');
    }
}

// ── Handle Visit Form Submit ──────────────────────────────────
async function handleVisitSubmit(e) {
    e.preventDefault();
    const session = getSession();
    const form = e.target;

    const visitData = {
        'المعرف': generateId(),
        'timestamp': new Date().toISOString(),
        'اسم المفتش': session?.name || form.inspector?.value || '',
        'التخصص': form.specialty?.value || '',
        'المرحلة': form.stage?.value || '',
        'اسم المعني بالزيارة': form.visitee?.value || '',
        'الرتبة': form.rank?.value || '',
        'الدرجة': form.grade?.value || '',
        'المؤسسة': form.institution?.value || '',
        'تاريخ الزيارة': form.visitDate?.value || '',
        'نوع الزيارة': form.visitType?.value || '',
        'النقطة': form.score?.value || '',
        'العقوبات': form.penalties?.value || '',
        'الملاحظة': form.notes?.value || '',
        'الموسم الدراسي': form.season?.value || ''
    };

    const result = await submitVisit(visitData);
    if (result.ok) {
        showToast('✅ تمّت إضافة الزيارة بنجاح');
        form.reset();
        if (form.inspector && session) form.inspector.value = session.name;
        await loadVisits();
    } else {
        showToast('❌ ' + (result.msg || 'حدث خطأ أثناء الإرسال'), 'error');
    }
}

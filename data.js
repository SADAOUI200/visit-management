/**
 * نظام إدارة الزيارات التفتيشية
 * data.js – Shared Data Layer (Inspectors · Institutions · Visits)
 * يُعرّف هذا الملف دوال مشتركة للتواصل مع Google Sheets
 */

// رابط شيت المفتشين
const INSPECTORS_URL = 'https://script.google.com/macros/s/AKfycbx5YxMBspO8_NjG5hKYhmRKioRhIqxIlVUxMXwhPcXzj07Ygn0yQk6d3NRVvvAqz74/exec';

// رابط شيت المؤسسات التعليمية
const INSTITUTIONS_URL = 'https://script.google.com/macros/s/AKfycby9bjCU0zgEPLuNxQz4hpd9l_ITyXasgkAmTZ8hD5sqX1G9a93nPqIjSzLrRf4qVsl6LQ/exec';

// رابط شيت الزيارات
const VISITS_URL = 'https://script.google.com/macros/s/AKfycbwezG7WfStSd5XB-cDnziYS-EET9axavvUf9jSRcUTc8Slq3lKW63B98emKs_LFTpOt/exec';

// دالة للحصول على الرابط المناسب بناءً على اسم الشيت
function getSheetURL(sheetName) {
    if (sheetName === 'inspectors') return INSPECTORS_URL;
    if (sheetName === 'institutions') return INSTITUTIONS_URL;
    if (sheetName === 'visits') return VISITS_URL;
    return INSPECTORS_URL; // الافتراضي
}

// ── Local cache to avoid redundant API calls ──────────────────
const _cache = {
    inspectors: null,
    institutions: null,
    inspectorsTs: 0,
    institutionsTs: 0,
    TTL: 60_000  // 60 ثانية
};

// ── Generate unique ID ────────────────────────────────────────
function generateDataId(prefix) {
    return (prefix || 'ID') + '-' + Math.random().toString(36).substr(2, 8).toUpperCase()
        + '-' + Date.now().toString(36).toUpperCase();
}

// ── Normalize string (trim invisible chars) ───────────────────
function normalizeStr(str) {
    return String(str || '')
        .normalize('NFC')
        .trim()
        .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ');
}

// ── Parse raw sheet response → array of plain objects ─────────
function parseSheetData(raw, fieldNames) {
    if (!raw) {
        console.warn('[data.js] parseSheetData: raw data is empty');
        return [];
    }

    // حالة 1: مصفوفة من مصفوفات (header row أولاً)
    if (Array.isArray(raw) && raw.length > 1 && Array.isArray(raw[0])) {
        console.log('[data.js] Parsing as 2D array (headers + rows)');
        const headers = raw[0].map(h => normalizeStr(String(h)));
        console.log('[data.js] Headers found:', headers);
        return raw.slice(1).filter(row => row.some(cell => cell)).map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                const canonical = fieldNames
                    ? (fieldNames.find(f => normalizeStr(f) === h) || h)
                    : h;
                obj[canonical] = row[i] ?? '';
            });
            return obj;
        });
    }

    // حالة 2: مصفوفة من كائنات
    if (Array.isArray(raw) && raw.length > 0 && !Array.isArray(raw[0])) {
        console.log('[data.js] Parsing as array of objects');
        return raw.filter(item => item && typeof item === 'object');
    }

    // حالة 3: كائن مُغلَّف
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        console.log('[data.js] Parsing as wrapped object');
        const inner = raw.data || raw.result || raw.values || raw.rows || raw.items || [];
        if (Array.isArray(inner)) return parseSheetData(inner, fieldNames);
    }

    console.warn('[data.js] Could not parse data - type:', typeof raw, 'isArray:', Array.isArray(raw));
    return [];
}

// ── Helper: fetch with timeout (rejects if too slow) ─────────
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;
    try {
        const res = await fetch(url, options);
        return res;
    } finally {
        clearTimeout(id);
    }
}

// ── Generic GET from a sheet ──────────────────────────────────
async function fetchSheet(sheetName, fieldNames) {
    const sheetURL = getSheetURL(sheetName);
    const url = `${sheetURL}?action=get&sheet=${sheetName}&sheetName=${sheetName}`;
    
    console.log(`[data.js] جارٍ جلب بيانات ${sheetName} من:`, url);
    
    try {
        const res = await fetchWithTimeout(url, { method: 'GET', mode: 'cors' }, 20000);
        
        if (!res.ok) {
            console.error(`[data.js] HTTP Error: ${res.status} ${res.statusText}`);
            throw new Error('HTTP ' + res.status);
        }
        
        const raw = await res.json();
        console.log(`[data.js] ${sheetName} data received:`, raw);
        
        // معالجة الحالة التي يأتي فيها JSON مع رسالة error
        if (raw && raw.error) {
            console.error(`[data.js] Error from Apps Script: ${raw.error}`);
            return [];
        }
        
        const parsed = parseSheetData(raw, fieldNames);
        console.log(`[data.js] ${sheetName} parsed successfully:`, parsed.length, 'items');
        return parsed;
        
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`[data.js] fetchSheet(${sheetName}) timed out after 20s`);
        } else {
            console.error(`[data.js] fetchSheet(${sheetName}) failed:`, err);
            console.error('Full error:', err.message, err.stack);
        }
        return [];
    }
}

// ── Generic POST to a sheet ───────────────────────────────────
async function submitToSheet(sheetName, dataObj, fieldNames) {
    const sheetURL = getSheetURL(sheetName);
    const payload = {
        action: 'insert',
        sheet: sheetName,
        sheetName: sheetName,
        data: dataObj,
        row: fieldNames ? fieldNames.map(f => dataObj[f] ?? '') : Object.values(dataObj)
    };
    
    console.log(`[data.js] جارٍ إرسال بيانات ${sheetName} إلى:`, sheetURL);
    console.log('[data.js] Payload:', JSON.stringify(payload));
    
    try {
        const res = await fetch(sheetURL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        console.log(`[data.js] POST request completed for ${sheetName}`);
        return { ok: true };
        
    } catch (err) {
        console.error(`[data.js] submitToSheet(${sheetName}) failed:`, err);
        throw err;
    }
}

// ════════════════════════════════════════════════════════
//  INSPECTORS
// ════════════════════════════════════════════════════════

const INSPECTOR_FIELDS = [
    'المعرّف',
    'الاسم',
    'التخصص',
    'المرحلة',
    'الرتبة',
    'الهاتف'
];

/**
 * جلب قائمة المفتشين (مع كاش لمدة دقيقة)
 * @param {boolean} forceRefresh – تجاهل الكاش
 */
async function fetchInspectors(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _cache.inspectors && (now - _cache.inspectorsTs) < _cache.TTL) {
        console.log('[data.js] Returning cached inspectors');
        return _cache.inspectors;
    }
    const data = await fetchSheet('inspectors', INSPECTOR_FIELDS);
    console.log('[data.js] fetchInspectors returned:', data);
    console.log('[data.js] Inspectors count:', data.length);
    if (data.length > 0) {
        console.log('[data.js] First inspector keys:', Object.keys(data[0]));
        console.log('[data.js] First inspector:', data[0]);
    }
    _cache.inspectors = data;
    _cache.inspectorsTs = now;
    return data;
}

/**
 * حفظ مفتش جديد في شيت inspectors
 */
async function submitInspector(inspectorData) {
    const dataObj = {
        'المعرّف': inspectorData['المعرّف'] || generateDataId('INS'),
        'الاسم الكامل': inspectorData['الاسم الكامل'] || '',
        'التخصص': inspectorData['التخصص'] || '',
        'المرحلة': inspectorData['المرحلة'] || '',
        'الرتبة الوظيفية': inspectorData['الرتبة الوظيفية'] || '',
        'رقم الهاتف': inspectorData['رقم الهاتف'] || ''
    };
    await submitToSheet('inspectors', dataObj, INSPECTOR_FIELDS);
    _cache.inspectors = null; // invalidate cache
    return { ok: true };
}

// ════════════════════════════════════════════════════════
//  INSTITUTIONS
// ════════════════════════════════════════════════════════

const INSTITUTION_FIELDS = [
    'المعرّف',
    'البلدية',
    'اسم المؤسسة',
    'المرحلة',
    'مدير المؤسسة',
    'المسيّر المالي'
];

/**
 * جلب قائمة المؤسسات (مع كاش لمدة دقيقة)
 */
async function fetchInstitutions(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _cache.institutions && (now - _cache.institutionsTs) < _cache.TTL) {
        return _cache.institutions;
    }
    const data = await fetchSheet('institutions', INSTITUTION_FIELDS);
    _cache.institutions = data;
    _cache.institutionsTs = now;
    return data;
}

/**
 * حفظ مؤسسة جديدة في شيت institutions
 */
async function submitInstitution(instData) {
    const dataObj = {
        'المعرّف': instData['المعرّف'] || generateDataId('INST'),
        'البلدية': instData['البلدية'] || '',
        'اسم المؤسسة': instData['اسم المؤسسة'] || '',
        'المرحلة': instData['المرحلة'] || '',
        'مدير المؤسسة': instData['مدير المؤسسة'] || '',
        'المسيّر المالي': instData['المسيّر المالي'] || ''
    };
    await submitToSheet('institutions', dataObj, INSTITUTION_FIELDS);
    _cache.institutions = null; // invalidate cache
    return { ok: true };
}

// ── Specialties List ──────────────────────────────────────────
const SPECIALTIES = [
    'رياضيات', 'علوم فيزيائية', 'علوم طبيعية', 'لغة عربية',
    'لغة فرنسية', 'لغة إنجليزية', 'تاريخ وجغرافيا', 'فلسفة',
    'تربية بدنية', 'تربية إسلامية', 'إعلام آلي', 'تسيير واقتصاد',
    'أمازيغية', 'فنون', 'موسيقى', 'تخصص آخر'
];

// ── Educational Levels ────────────────────────────────────────
const LEVELS = ['ابتدائي', 'متوسط', 'ثانوي'];

// ── Inspector Ranks ───────────────────────────────────────────
const INSPECTOR_RANKS = [
    'مفتش مساعد', 'مفتش', 'مفتش أول', 'مفتش عام'
];

// ── Teacher Ranks ─────────────────────────────────────────────
const TEACHER_RANKS = [
    'أستاذ مبتدئ', 'أستاذ', 'أستاذ رئيسي', 'أستاذ مكوّن',
    'مدير', 'ناظر', 'مستشار التربية'
];

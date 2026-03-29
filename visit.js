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